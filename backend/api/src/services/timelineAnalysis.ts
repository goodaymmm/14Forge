import axios from 'axios';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import NodeCache from 'node-cache';

// Cache timeline data for 5 minutes
const timelineCache = new NodeCache({ stdTTL: 300 });

export interface Position {
  x: number;
  y: number;
}

export interface ParticipantFrame {
  participantId: number;
  position: Position;
  currentGold: number;
  totalGold: number;
  level: number;
  xp: number;
  minionsKilled: number;
  jungleMinionsKilled: number;
  timeEnemySpentControlled: number;
}

export interface TimelineFrame {
  timestamp: number;
  participantFrames: { [key: string]: ParticipantFrame };
  events: TimelineEvent[];
}

export interface TimelineEvent {
  timestamp: number;
  type: string;
  participantId?: number;
  position?: Position;
  killerId?: number;
  victimId?: number;
  assistingParticipantIds?: number[];
  wardType?: string;
  creatorId?: number;
  killType?: string;
  multiKillLength?: number;
  itemId?: number;
  skillSlot?: number;
}

export interface MatchTimeline {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    frameInterval: number;
    frames: TimelineFrame[];
    gameId: number;
    participants: Array<{
      participantId: number;
      puuid: string;
    }>;
  };
}

export interface PositionData {
  matchId: string;
  participantId: number;
  timestamp: number; // Game time in seconds
  position: Position;
  level: number;
  currentGold: number;
  totalGold: number;
  cs: number;
}

export interface WardData {
  matchId: string;
  participantId: number;
  timestamp: number;
  position: Position;
  wardType: string;
}

export interface CombatData {
  matchId: string;
  timestamp: number;
  position: Position;
  killerId: number;
  victimId: number;
  assistingParticipantIds: number[];
  killType?: string;
}

class TimelineAnalysisService {
  private apiKey: string | undefined;

  constructor() {
    // API key will be loaded when first needed
  }

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.RIOT_API_KEY || '';
      if (!this.apiKey) {
        logger.error('RIOT_API_KEY is not set');
      }
    }
    return this.apiKey;
  }

  /**
   * Get match timeline from Riot API
   */
  async getMatchTimeline(matchId: string): Promise<MatchTimeline> {
    const cacheKey = `timeline_${matchId}`;
    const cached = timelineCache.get<MatchTimeline>(cacheKey);
    if (cached) {
      logger.info(`Timeline cache hit for match ${matchId}`);
      return cached;
    }

    try {
      const region = this.getRegionFromMatchId(matchId);
      const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
      const apiKey = this.getApiKey();
      
      logger.info(`[Timeline] Fetching from URL: ${url}`);
      logger.info(`[Timeline] API Key present: ${apiKey ? 'Yes' : 'No'} (length: ${apiKey?.length})`);
      
      const response = await axios.get<MatchTimeline>(url, {
        headers: {
          'X-Riot-Token': apiKey
        }
      });

      logger.info(`[Timeline] Response status: ${response.status}`);
      logger.info(`[Timeline] Response has frames: ${response.data?.info?.frames?.length || 0}`);
      
      timelineCache.set(cacheKey, response.data);
      logger.info(`Timeline fetched successfully for match ${matchId}`);
      return response.data;
    } catch (error: any) {
      logger.error(`[Timeline] Failed to fetch for match ${matchId}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      if (error.response?.status === 404) {
        throw new ApiError(404, 'Match timeline not found');
      } else if (error.response?.status === 429) {
        throw new ApiError(429, 'Rate limit exceeded');
      } else if (error.response?.status === 403) {
        throw new ApiError(403, 'API key invalid or expired');
      }
      throw new ApiError(500, `Failed to fetch match timeline: ${error.message}`);
    }
  }

  /**
   * Extract position data from timeline for first 14 minutes
   */
  extractPositionData(timeline: MatchTimeline, endTime: number = 840000): PositionData[] {
    const positions: PositionData[] = [];
    const matchId = timeline.metadata.matchId;

    for (const frame of timeline.info.frames) {
      // Stop at 14 minutes (840000 ms)
      if (frame.timestamp > endTime) break;

      // Extract position for each participant
      for (const [participantIdStr, participantFrame] of Object.entries(frame.participantFrames)) {
        const participantId = parseInt(participantIdStr);
        
        // Only add if position exists
        if (participantFrame.position) {
          positions.push({
            matchId,
            participantId,
            timestamp: Math.floor(frame.timestamp / 1000), // Convert to seconds
            position: participantFrame.position,
            level: participantFrame.level,
            currentGold: participantFrame.currentGold,
            totalGold: participantFrame.totalGold,
            cs: participantFrame.minionsKilled + participantFrame.jungleMinionsKilled
          });
        }
      }
    }

    logger.info(`Extracted ${positions.length} position data points for match ${matchId}`);
    return positions;
  }

  /**
   * Extract ward placement events from timeline
   */
  extractWardEvents(timeline: MatchTimeline, endTime: number = 840000): WardData[] {
    const wards: WardData[] = [];
    const matchId = timeline.metadata.matchId;
    const eventTypes = new Set<string>();
    let wardPlacedWithPosition = 0;
    let wardKillWithPosition = 0;

    for (const frame of timeline.info.frames) {
      if (frame.timestamp > endTime) break;

      for (const event of frame.events) {
        // Collect all event types for debugging
        eventTypes.add(event.type);
        
        // Check WARD_PLACED events - some may have position data
        if (event.type === 'WARD_PLACED') {
          const wardEvent = event as any;
          
          // Check if this event has position data
          if (wardEvent.position) {
            wardPlacedWithPosition++;
            
            // Log the first few ward placed events for debugging
            if (wardPlacedWithPosition <= 3) {
              logger.info(`[Ward Debug] WARD_PLACED with position:`, {
                position: wardEvent.position,
                creatorId: wardEvent.creatorId,
                wardType: wardEvent.wardType,
                timestamp: event.timestamp
              });
            }
            
            const participantId = wardEvent.creatorId || 0;
            
            if (participantId) {
              wards.push({
                matchId,
                participantId,
                timestamp: Math.floor(event.timestamp / 1000),
                position: wardEvent.position,
                wardType: wardEvent.wardType || 'PLACED'
              });
            }
          }
        }
        
        // Check WARD_KILL events - these typically have position
        if (event.type === 'WARD_KILL') {
          const killEvent = event as any;
          
          if (killEvent.position) {
            wardKillWithPosition++;
            
            // Log the first few ward kill events for debugging
            if (wardKillWithPosition <= 3) {
              logger.info(`[Ward Debug] WARD_KILL with position:`, {
                position: killEvent.position,
                killerId: killEvent.killerId,
                wardType: killEvent.wardType,
                timestamp: event.timestamp
              });
            }
            
            const participantId = killEvent.killerId || 0;
            
            if (participantId) {
              wards.push({
                matchId,
                participantId,
                timestamp: Math.floor(event.timestamp / 1000),
                position: killEvent.position,
                wardType: killEvent.wardType || 'KILLED'
              });
            }
          }
        }
      }
    }

    // Log all event types found in the timeline
    logger.info(`[Ward Debug] All event types in timeline:`, Array.from(eventTypes));
    logger.info(`[Ward Debug] WARD_PLACED with position: ${wardPlacedWithPosition}, WARD_KILL with position: ${wardKillWithPosition}`);
    logger.info(`Extracted ${wards.length} ward events for match ${matchId}`);
    return wards;
  }

  /**
   * Extract combat events (kills) from timeline
   */
  extractCombatEvents(timeline: MatchTimeline, endTime: number = 840000): CombatData[] {
    const combat: CombatData[] = [];
    const matchId = timeline.metadata.matchId;

    for (const frame of timeline.info.frames) {
      if (frame.timestamp > endTime) break;

      for (const event of frame.events) {
        if (event.type === 'CHAMPION_KILL' && event.position && event.killerId && event.victimId) {
          combat.push({
            matchId,
            timestamp: Math.floor(event.timestamp / 1000),
            position: event.position,
            killerId: event.killerId,
            victimId: event.victimId,
            assistingParticipantIds: event.assistingParticipantIds || [],
            killType: event.killType
          });
        }
      }
    }

    logger.info(`Extracted ${combat.length} combat events for match ${matchId}`);
    return combat;
  }

  /**
   * Generate heatmap data for a specific match
   */
  async generateHeatmapData(matchId: string) {
    try {
      const timeline = await this.getMatchTimeline(matchId);
      
      // Extract all data types
      const positions = this.extractPositionData(timeline);
      const wards = this.extractWardEvents(timeline);
      const combat = this.extractCombatEvents(timeline);

      // Group positions by participant for individual heatmaps
      const positionsByParticipant = this.groupPositionsByParticipant(positions);
      
      // Calculate density maps
      const positionHeatmap = this.calculatePositionDensity(positions);
      const wardHeatmap = this.calculateWardDensity(wards);
      const combatHeatmap = this.calculateCombatDensity(combat);

      return {
        matchId,
        frameCount: timeline.info.frames.length,
        endTimestamp: Math.min(840000, timeline.info.frames[timeline.info.frames.length - 1]?.timestamp || 0),
        positions: positionsByParticipant,
        heatmaps: {
          position: positionHeatmap,
          ward: wardHeatmap,
          combat: combatHeatmap
        },
        rawData: {
          positions: positions.length,
          wards: wards.length,
          combat: combat.length
        }
      };
    } catch (error) {
      logger.error(`Failed to generate heatmap data for match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Group positions by participant
   */
  private groupPositionsByParticipant(positions: PositionData[]) {
    const grouped: { [key: number]: PositionData[] } = {};
    
    for (const pos of positions) {
      if (!grouped[pos.participantId]) {
        grouped[pos.participantId] = [];
      }
      grouped[pos.participantId].push(pos);
    }
    
    return grouped;
  }

  /**
   * Calculate position density for heatmap
   */
  private calculatePositionDensity(positions: PositionData[], gridSize: number = 50) {
    const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    // Actual playable area boundaries based on Riot API (2024/2025 terrain)
    // Adjusted for new terrain with mirrored lanes and moved brushes
    const MAP_MIN = 700;   // Adjusted for 2024/2025 terrain changes
    const MAP_MAX = 15300; // Adjusted for 2024/2025 terrain changes
    const MAP_RANGE = MAP_MAX - MAP_MIN;
    
    for (const pos of positions) {
      // Normalize position to 0-1 range based on actual playable area
      const normalizedX = (pos.position.x - MAP_MIN) / MAP_RANGE;
      const normalizedY = (pos.position.y - MAP_MIN) / MAP_RANGE;
      
      // Convert to grid coordinates
      const x = Math.floor(normalizedX * gridSize);
      const y = Math.floor(normalizedY * gridSize);
      
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        // Invert Y axis for display (Riot uses bottom-left origin)
        grid[gridSize - 1 - y][x]++;
      }
    }
    
    return grid;
  }

  /**
   * Calculate ward density for heatmap
   */
  private calculateWardDensity(wards: WardData[], gridSize: number = 50) {
    const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    // Actual playable area boundaries based on Riot API (2024/2025 terrain)
    // Adjusted for new terrain with mirrored lanes and moved brushes
    const MAP_MIN = 700;   // Adjusted for 2024/2025 terrain changes
    const MAP_MAX = 15300; // Adjusted for 2024/2025 terrain changes
    const MAP_RANGE = MAP_MAX - MAP_MIN;
    
    for (const ward of wards) {
      // Normalize position to 0-1 range based on actual playable area
      const normalizedX = (ward.position.x - MAP_MIN) / MAP_RANGE;
      const normalizedY = (ward.position.y - MAP_MIN) / MAP_RANGE;
      
      // Convert to grid coordinates
      const x = Math.floor(normalizedX * gridSize);
      const y = Math.floor(normalizedY * gridSize);
      
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        // Invert Y axis for display (Riot uses bottom-left origin)
        grid[gridSize - 1 - y][x]++;
      }
    }
    
    return grid;
  }

  /**
   * Calculate combat density for heatmap
   */
  private calculateCombatDensity(combat: CombatData[], gridSize: number = 50) {
    const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    // Actual playable area boundaries based on Riot API (2024/2025 terrain)
    // Adjusted for new terrain with mirrored lanes and moved brushes
    const MAP_MIN = 700;   // Adjusted for 2024/2025 terrain changes
    const MAP_MAX = 15300; // Adjusted for 2024/2025 terrain changes
    const MAP_RANGE = MAP_MAX - MAP_MIN;
    
    for (const event of combat) {
      // Normalize position to 0-1 range based on actual playable area
      const normalizedX = (event.position.x - MAP_MIN) / MAP_RANGE;
      const normalizedY = (event.position.y - MAP_MIN) / MAP_RANGE;
      
      // Convert to grid coordinates
      const x = Math.floor(normalizedX * gridSize);
      const y = Math.floor(normalizedY * gridSize);
      
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        // Invert Y axis for display (Riot uses bottom-left origin)
        grid[gridSize - 1 - y][x]++;
      }
    }
    
    return grid;
  }

  /**
   * Get region from match ID
   */
  private getRegionFromMatchId(matchId: string): string {
    const regionPrefix = matchId.split('_')[0];
    
    const regionMap: { [key: string]: string } = {
      'KR': 'asia',
      'JP': 'asia',
      'JP1': 'asia',  // Added JP1 mapping
      'NA1': 'americas',
      'BR1': 'americas',
      'LA1': 'americas',
      'LA2': 'americas',
      'EUW1': 'europe',
      'EUN1': 'europe',
      'TR1': 'europe',
      'RU': 'europe',
      'OC1': 'sea'
    };
    
    const region = regionMap[regionPrefix] || 'americas';
    logger.info(`[Timeline] Region mapping: ${regionPrefix} -> ${region} for match ${matchId}`);
    return region;
  }
}

export const timelineAnalysisService = new TimelineAnalysisService();