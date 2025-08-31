import { getRiotApi } from './riotApi';
import { query } from './database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

interface FourteenMinAnalysis {
  matchId: string;
  region: string;
  timestamp: Date;
  queueId: number;
  participants: ParticipantAnalysis[];
  teamStats: TeamStats[];
  goldDiff: number;
  winPrediction: number;
  actualWinner?: number;
  insights: any[];
}

interface ParticipantAnalysis {
  participantId: number;
  puuid: string;
  championId: number;
  championName?: string;
  summonerName: string;
  teamId: number;
  individualPosition?: string;
  totalGold: number;
  level: number;
  cs: number;
  csEfficiency: number;
  estimatedAPM: number;
  goldPerMinute: number;
  xpPerMinute: number;
  soloKills?: number;
  soloDeaths?: number;
  roamCount?: number;
  gankCount?: number;
  wardsPlaced?: number;
  towerPlates?: number;
  objectiveParticipation?: number;
  killParticipation?: number;
}

interface TeamStats {
  teamId: number;
  totalGold: number;
  averageLevel: number;
  totalCS: number;
  dragonKills: number;
  voidGrubKills: number;
  towerKills: number;
  towerPlates: number;
  kills: number;
  deaths: number;
}

export class FourteenMinAnalysisService {
  private readonly RANKED_SOLO_QUEUE_ID = 420;
  private readonly ANALYSIS_MINUTE = 14;

  async analyzeMatch(region: string, matchId: string, forceRegenerate: boolean = false): Promise<FourteenMinAnalysis> {
    // First check if analysis already exists in database
    if (!forceRegenerate) {
      const existingAnalysis = await this.getExistingAnalysis(matchId);
      if (existingAnalysis) {
        logger.info(`Returning cached 14-minute analysis for match ${matchId}`);
        return existingAnalysis;
      }
    } else {
      logger.info(`Force regenerating 14-minute analysis for match ${matchId}`);
      // Delete existing analysis if force regenerate
      await this.deleteExistingAnalysis(matchId);
    }

    // Get match data
    const matchData = await getRiotApi().getMatch(region, matchId);
    
    // Check if it's a ranked game
    if (matchData.info.queueId !== this.RANKED_SOLO_QUEUE_ID) {
      throw new ApiError(400, 'Fourteen-minute analysis is only available for Ranked Solo/Duo matches');
    }

    // Check if game lasted at least 14 minutes
    const gameDuration = matchData.info.gameDuration;
    // Riot API returns duration in seconds
    const gameDurationMinutes = gameDuration / 60;
    
    // Debug logging
    logger.info(`[14-min analysis] Match ${matchId}: gameDuration=${gameDuration}s (${gameDurationMinutes.toFixed(2)} minutes), queueId=${matchData.info.queueId}`)
    
    if (gameDurationMinutes < this.ANALYSIS_MINUTE) {
      logger.warn(`[14-min analysis] Match ${matchId} ended before 14 minutes: ${gameDurationMinutes.toFixed(2)} minutes`)
      throw new ApiError(400, `Game ended before ${this.ANALYSIS_MINUTE} minutes`);
    }

    // Get timeline data
    const timeline = await getRiotApi().getMatchTimeline(region, matchId);
    
    // Extract 14-minute frame
    // Timeline frames are 1-minute intervals starting from 0 (0-1min, 1-2min, etc.)
    // For 14-minute analysis, we want frame at index 13 (13-14 minutes)
    const frameIndex = this.ANALYSIS_MINUTE - 1; // Index 13 for 14th minute
    const targetFrame = timeline.info.frames[frameIndex];
    
    if (!targetFrame) {
      throw new ApiError(404, `No data available for minute ${this.ANALYSIS_MINUTE}`);
    }

    // Analyze the frame
    const analysis = this.performAnalysis(matchData, timeline, targetFrame, region);
    
    // Log the final stats for debugging
    logger.info(`[14-min] Final team stats for ${matchId}:`, {
      team100: analysis.teamStats.find((t: any) => t.teamId === 100),
      team200: analysis.teamStats.find((t: any) => t.teamId === 200)
    });
    
    // Save to database
    await this.saveAnalysis(analysis);
    
    return analysis;
  }

  private performAnalysis(matchData: any, timeline: any, frame: any, region: string): FourteenMinAnalysis {
    const participants: ParticipantAnalysis[] = [];
    const teamStats: Map<number, TeamStats> = new Map();
    const playerStats: Map<number, any> = new Map();

    // Initialize team stats
    teamStats.set(100, {
      teamId: 100,
      totalGold: 0,
      averageLevel: 0,
      totalCS: 0,
      dragonKills: 0,
      voidGrubKills: 0,
      towerKills: 0,
      towerPlates: 0,
      kills: 0,
      deaths: 0
    });

    teamStats.set(200, {
      teamId: 200,
      totalGold: 0,
      averageLevel: 0,
      totalCS: 0,
      dragonKills: 0,
      voidGrubKills: 0,
      towerKills: 0,
      towerPlates: 0,
      kills: 0,
      deaths: 0
    });

    // Process each participant
    Object.entries(frame.participantFrames).forEach(([participantIdStr, participantFrame]: [string, any]) => {
      const participantId = parseInt(participantIdStr);
      // Note: participantId in timeline is 1-indexed, while array index is 0-indexed
      const participant = matchData.info.participants[participantId - 1];
      
      if (!participant) {
        logger.warn(`Participant not found for ID: ${participantId}`);
        return;
      }

      const cs = participantFrame.minionsKilled + participantFrame.jungleMinionsKilled;
      const csEfficiency = this.calculateCSEfficiency(cs, participant.individualPosition, this.ANALYSIS_MINUTE);
      const estimatedAPM = this.estimateAPM(timeline, participantId, this.ANALYSIS_MINUTE);
      
      // Initialize player stats
      if (!playerStats.has(participantId)) {
        playerStats.set(participantId, {
          soloKills: 0,
          soloDeaths: 0,
          roamCount: 0,
          gankCount: 0,
          wardsPlaced: 0,
          towerPlates: 0,
          objectiveParticipation: 0
        });
      }
      
      // Use challenges data if available for tower plates and other stats
      const towerPlatesFromChallenges = participant.challenges?.turretPlatesTaken || 0;
      const objectiveParticipationFromChallenges = 
        (participant.challenges?.dragonTakedowns || 0) + 
        (participant.challenges?.riftHeraldTakedowns || 0);
      const killParticipationFromChallenges = participant.challenges?.killParticipation 
        ? Math.round(participant.challenges.killParticipation * 100) 
        : 0;
      
      // Estimate roam count from timeline
      const estimatedRoamCount = this.estimateRoamCount(timeline, participantId, participant.individualPosition, this.ANALYSIS_MINUTE);
      
      const participantAnalysis: ParticipantAnalysis = {
        participantId,
        puuid: participant.puuid,
        championId: participant.championId,
        championName: participant.championName,
        summonerName: participant.summonerName,
        teamId: participant.teamId,
        individualPosition: participant.individualPosition,
        totalGold: participantFrame.totalGold,
        level: participantFrame.level,
        cs,
        csEfficiency,
        estimatedAPM,
        goldPerMinute: participantFrame.totalGold / this.ANALYSIS_MINUTE,
        xpPerMinute: participantFrame.xp / this.ANALYSIS_MINUTE,
        ...playerStats.get(participantId),
        // Override with challenges data if available
        towerPlates: towerPlatesFromChallenges || playerStats.get(participantId)?.towerPlates || 0,
        objectiveParticipation: objectiveParticipationFromChallenges || playerStats.get(participantId)?.objectiveParticipation || 0,
        killParticipation: killParticipationFromChallenges || playerStats.get(participantId)?.killParticipation || 0,
        roamCount: estimatedRoamCount
      };

      participants.push(participantAnalysis);

      // Update team stats
      const team = teamStats.get(participant.teamId)!;
      team.totalGold += participantFrame.totalGold;
      team.averageLevel += participantFrame.level;
      team.totalCS += cs;
    });

    // Calculate team averages
    teamStats.forEach(team => {
      team.averageLevel = team.averageLevel / 5;
    });

    // Count objectives from events
    this.countObjectives(timeline, frame.timestamp, teamStats, playerStats, matchData);
    
    // Calculate kill participation for each player
    participants.forEach(p => {
      const team = teamStats.get(p.teamId)!;
      const stats = playerStats.get(p.participantId);
      if (stats) {
        // Copy player stats to participant
        p.soloKills = stats.soloKills;
        p.wardsPlaced = stats.wardsPlaced;
        p.towerPlates = stats.towerPlates;
        p.objectiveParticipation = stats.objectiveParticipation;
      }
      if (team.kills > 0) {
        // This is simplified - would need to count actual kills/assists from timeline
        p.killParticipation = Math.min(100, Math.round((p.soloKills || 0) / team.kills * 100));
      }
    });

    // Calculate gold difference
    const goldDiff = teamStats.get(100)!.totalGold - teamStats.get(200)!.totalGold;

    // Predict win probability based on gold lead
    const winPrediction = this.predictWinProbability(goldDiff, teamStats);

    // Determine actual winner
    const actualWinner = matchData.info.teams.find((t: any) => t.win)?.teamId;

    // Generate insights
    const insights = this.generateInsights(participants, teamStats, goldDiff, matchData);

    return {
      matchId: matchData.metadata.matchId,
      region,
      timestamp: new Date(),
      queueId: matchData.info.queueId,
      participants,
      teamStats: Array.from(teamStats.values()),
      goldDiff,
      winPrediction,
      actualWinner,
      insights
    };
  }

  private calculateCSEfficiency(cs: number, role: string, _minutes: number): number {
    // TODO: Future - use minutes parameter to scale benchmarks for different game times (10min, 20min, etc.)
    // Currently hardcoded for 14 minutes as per the unique feature requirement
    // Benchmark CS values at 14 minutes for each role (Diamond-Challenger tier)
    // Updated based on 2025 Season 15 data
    const benchmarks: Record<string, number> = {
      'TOP': 119,      // 8.5 CS/min average
      'JUNGLE': 88,    // 6.3 CS/min average (farm-heavy junglers)
      'MIDDLE': 133,   // 9.5 CS/min average
      'BOTTOM': 133,   // 9.5 CS/min average (ADC)
      'UTILITY': 24    // 1.7 CS/min average (Support)
    };

    const benchmark = benchmarks[role] || 90;
    const efficiency = (cs / benchmark) * 100;
    
    return Math.min(Math.round(efficiency), 150); // Cap at 150%
  }

  private estimateRoamCount(timeline: any, participantId: number, role: string, upToMinute: number): number {
    // Only track roams for certain roles
    if (!['TOP', 'MIDDLE', 'UTILITY'].includes(role)) {
      return 0;
    }
    
    let roamCount = 0;
    let awayFromLaneTime = 0;
    let wasRecalling = false;
    
    // Define lane boundaries based on role
    const getLaneBounds = (role: string) => {
      switch(role) {
        case 'TOP':
          return { minX: 0, maxX: 7000, minY: 7000, maxY: 15000 };
        case 'MIDDLE':
          return { minX: 4000, maxX: 11000, minY: 4000, maxY: 11000 };
        case 'UTILITY':
        case 'BOTTOM':
          return { minX: 7000, maxX: 15000, minY: 0, maxY: 7000 };
        default:
          return null;
      }
    };
    
    const laneBounds = getLaneBounds(role);
    if (!laneBounds) return 0;
    
    // Check if position is in base (for recall detection)
    const isInBase = (position: any) => {
      if (!position) return false;
      return (position.x < 2000 && position.y < 2000) || 
             (position.x > 12500 && position.y > 12500);
    };
    
    // Check if position is away from lane
    const isAwayFromLane = (position: any) => {
      if (!position || !laneBounds) return false;
      return position.x < laneBounds.minX || position.x > laneBounds.maxX ||
             position.y < laneBounds.minY || position.y > laneBounds.maxY;
    };
    
    for (let i = 1; i <= upToMinute && i < timeline.info.frames.length; i++) {
      const frame = timeline.info.frames[i];
      const participantFrame = frame.participantFrames[participantId];
      
      if (!participantFrame || !participantFrame.position) continue;
      
      const position = participantFrame.position;
      
      // Check for recall completion
      if (frame.events) {
        for (const event of frame.events) {
          if (event.type === 'RECALL_FINISHED' && event.participantId === participantId) {
            wasRecalling = true;
          }
        }
      }
      
      // Skip if in base (likely recalled)
      if (isInBase(position)) {
        wasRecalling = true;
        awayFromLaneTime = 0;
        continue;
      }
      
      // If just left base after recall, reset
      if (wasRecalling && !isInBase(position)) {
        wasRecalling = false;
        awayFromLaneTime = 0;
        continue;
      }
      
      // Track time away from lane
      if (isAwayFromLane(position) && !wasRecalling) {
        awayFromLaneTime++;
        
        // If away from lane for 2+ minutes, count as roam
        if (awayFromLaneTime >= 2) {
          roamCount++;
          awayFromLaneTime = 0;
        }
      } else {
        awayFromLaneTime = 0;
      }
    }
    
    return roamCount;
  }
  
  private estimateAPM(timeline: any, participantId: number, upToMinute: number): number {
    let actions = 0;
    
    // Count events up to the specified minute
    for (let i = 0; i <= upToMinute && i < timeline.info.frames.length; i++) {
      const frame = timeline.info.frames[i];
      
      if (frame.events) {
        frame.events.forEach((event: any) => {
          if (event.participantId === participantId) {
            // Count various event types as actions
            if (['SKILL_LEVEL_UP', 'ITEM_PURCHASED', 'ITEM_SOLD', 'WARD_PLACED', 
                 'CHAMPION_SPECIAL_KILL', 'BUILDING_KILL'].includes(event.type)) {
              actions++;
            }
          }
          
          // Count kills and assists
          if (event.type === 'CHAMPION_KILL') {
            if (event.killerId === participantId || 
                (event.assistingParticipantIds && event.assistingParticipantIds.includes(participantId))) {
              actions += 2; // Kills/assists count as more actions
            }
          }
        });
      }
    }

    // Estimate APM based on counted actions (this is a rough estimate)
    const estimatedAPM = Math.round((actions * 5) / upToMinute); // Multiply by factor for uncounted actions
    return Math.min(estimatedAPM, 300); // Cap at reasonable APM
  }

  private countObjectives(timeline: any, upToTimestamp: number, teamStats: Map<number, TeamStats>, playerStats?: Map<number, any>, matchData?: any) {
    let soloKillsByParticipant: Map<number, number> = new Map();
    let wardsByParticipant: Map<number, number> = new Map();
    let platesByParticipant: Map<number, number> = new Map();
    let objectivesByParticipant: Map<number, number> = new Map();
    
    for (const frame of timeline.info.frames) {
      if (frame.timestamp > upToTimestamp) break;
      
      if (frame.events) {
        frame.events.forEach((event: any) => {
          if (event.type === 'ELITE_MONSTER_KILL') {
            const team = event.killerTeamId === 100 ? 100 : 200;
            logger.debug(`[14-min] ELITE_MONSTER_KILL event: monsterType=${event.monsterType}, monsterSubType=${event.monsterSubType}, team=${team}`);
            if (event.monsterType === 'DRAGON') {
              teamStats.get(team)!.dragonKills++;
            } else if (event.monsterType === 'HORDE' || event.monsterType === 'RIFTHERALD') {
              // Void Grubs or Rift Herald
              logger.debug(`[14-min] Counting void grub/herald for team ${team}: ${event.monsterType}`);
              teamStats.get(team)!.voidGrubKills++;
            }
            // Track objective participation
            if (event.killerId && playerStats) {
              objectivesByParticipant.set(event.killerId, (objectivesByParticipant.get(event.killerId) || 0) + 1);
            }
            if (event.assistingParticipantIds && playerStats) {
              event.assistingParticipantIds.forEach((id: number) => {
                objectivesByParticipant.set(id, (objectivesByParticipant.get(id) || 0) + 1);
              });
            }
          } else if (event.type === 'TURRET_PLATE_DESTROYED') {
            // Note: killerId is always 0 due to API bug, using teamId
            const team = event.teamId === 100 ? 200 : 100; // Opposite team destroyed plate
            logger.debug(`[14-min] TURRET_PLATE_DESTROYED event: teamId=${event.teamId}, calculated team=${team}`);
            teamStats.get(team)!.towerPlates++;
            // Try to track plate participation if available
            if (event.killerId && playerStats) {
              platesByParticipant.set(event.killerId, (platesByParticipant.get(event.killerId) || 0) + 1);
            }
          } else if (event.type === 'BUILDING_KILL') {
            const team = event.teamId === 100 ? 200 : 100; // Opposite team destroyed building
            if (event.buildingType === 'TOWER_BUILDING') {
              teamStats.get(team)!.towerKills++;
            }
          } else if (event.type === 'CHAMPION_KILL') {
            // participantId is 1-indexed (1-5 for team 100, 6-10 for team 200)
            const killerTeam = event.killerId <= 5 ? 100 : 200;
            const victimTeam = event.victimId <= 5 ? 100 : 200;
            teamStats.get(killerTeam)!.kills++;
            teamStats.get(victimTeam)!.deaths++;
            
            // Track solo kills
            if (playerStats && (!event.assistingParticipantIds || event.assistingParticipantIds.length === 0)) {
              soloKillsByParticipant.set(event.killerId, (soloKillsByParticipant.get(event.killerId) || 0) + 1);
            }
          } else if (event.type === 'WARD_PLACED' && playerStats) {
            wardsByParticipant.set(event.creatorId, (wardsByParticipant.get(event.creatorId) || 0) + 1);
          }
        });
      }
    }
    
    // If void grubs count is 0, try to get from challenges data
    if (matchData && (teamStats.get(100)!.voidGrubKills === 0 && teamStats.get(200)!.voidGrubKills === 0)) {
      matchData.info.participants.forEach((p: any) => {
        if (p.challenges?.voidMonsterKill) {
          const team = p.teamId;
          logger.debug(`[14-min] Adding void grub kills from challenges for team ${team}: ${p.challenges.voidMonsterKill}`);
          teamStats.get(team)!.voidGrubKills += p.challenges.voidMonsterKill;
        }
      });
    }
    
    // Update player stats if provided
    if (playerStats) {
      playerStats.forEach((stats, participantId) => {
        stats.soloKills = soloKillsByParticipant.get(participantId) || 0;
        stats.wardsPlaced = wardsByParticipant.get(participantId) || 0;
        stats.towerPlates = platesByParticipant.get(participantId) || 0;
        stats.objectiveParticipation = objectivesByParticipant.get(participantId) || 0;
      });
    }
  }

  private predictWinProbability(goldDiff: number, teamStats: Map<number, TeamStats>): number {
    // Simple prediction model based on gold difference at 14 minutes
    // Based on historical data, each 1000 gold lead at 14 min ≈ 5-7% win rate increase
    const goldFactor = goldDiff / 1000 * 6;
    
    // Additional factors
    const team100 = teamStats.get(100)!;
    const team200 = teamStats.get(200)!;
    
    const dragonFactor = (team100.dragonKills - team200.dragonKills) * 3;
    const towerFactor = (team100.towerKills - team200.towerKills) * 4;
    const levelFactor = (team100.averageLevel - team200.averageLevel) * 5;
    
    // Base 50% + adjustments
    let probability = 50 + goldFactor + dragonFactor + towerFactor + levelFactor;
    
    // Clamp between 5% and 95%
    probability = Math.max(5, Math.min(95, probability));
    
    return Math.round(probability);
  }

  private generateInsights(
    participants: ParticipantAnalysis[], 
    teamStats: Map<number, TeamStats>,
    goldDiff: number,
    matchData?: any
  ): any[] {
    const insights: any[] = [];

    // Gold lead insight
    if (Math.abs(goldDiff) > 2000) {
      insights.push({
        type: 'goldLead',
        team: goldDiff > 0 ? 'blue' : 'red',
        value: Math.abs(goldDiff)
      });
    }

    // CS efficiency insights (exclude SUPPORT/UTILITY role)
    const highCSPlayers = participants.filter(p => {
      // Debug logging for role detection
      logger.debug(`[14-min] Player ${p.summonerName} (${p.championName}): individualPosition=${p.individualPosition}, csEfficiency=${p.csEfficiency}`);
      
      // Check for support role - both UTILITY and BOTTOM support
      const isSupport = p.individualPosition === 'UTILITY' || 
                       p.individualPosition === 'BOTTOM SUPPORT' ||
                       p.individualPosition === 'Invalid' && p.championName && ['Lulu', 'Thresh', 'Leona', 'Nautilus', 'Morgana', 'Lux', 'Yuumi', 'Sona', 'Soraka', 'Janna', 'Nami', 'Karma', 'Zyra', 'Brand', 'Vel\'Koz', 'Xerath', 'Pyke', 'Rakan', 'Braum', 'Alistar', 'Taric', 'Bard', 'Zilean', 'Senna', 'Rell', 'Seraphine', 'Renata Glasc', 'Milio'].includes(p.championName);
      
      return p.csEfficiency >= 100 && !isSupport;
    });
    if (highCSPlayers.length > 0) {
      highCSPlayers.forEach(p => {
        insights.push({
          type: 'csEfficiency',
          player: p.summonerName || 'Unknown',
          championName: p.championName || p.championId,
          team: p.teamId === 100 ? 'blue' : 'red',
          value: p.csEfficiency
        });
      });
    }
    
    // Ward placement insights for SUPPORT role at 14 minutes
    const supportPlayers = participants.filter(p => {
      const participant = matchData?.info?.participants?.find((mp: any) => mp.puuid === p.puuid);
      const isSupport = participant?.individualPosition === 'UTILITY' || 
                       participant?.individualPosition === 'BOTTOM SUPPORT' ||
                       (participant?.individualPosition === 'Invalid' && p.championName && 
                        ['Lulu', 'Thresh', 'Leona', 'Nautilus', 'Morgana', 'Lux', 'Yuumi', 'Sona', 'Soraka', 
                         'Janna', 'Nami', 'Karma', 'Zyra', 'Brand', 'Vel\'Koz', 'Xerath', 'Pyke', 'Rakan', 
                         'Braum', 'Alistar', 'Taric', 'Bard', 'Zilean', 'Senna', 'Rell', 'Seraphine', 
                         'Renata Glasc', 'Milio', 'Hikarukk', 'Blitzcrank', 'Maokai', 'Neeko', 'Pantheon'].includes(p.championName));
      return isSupport && p.wardsPlaced !== undefined;
    });
    if (supportPlayers.length > 0) {
      const highWardSupports = supportPlayers.filter(p => {
        // At 14 minutes, 8+ wards placed is good for support (about 1 ward per 2 minutes)
        return p.wardsPlaced && p.wardsPlaced >= 8;
      });
      highWardSupports.forEach(p => {
        insights.push({
          type: 'wardPlacement',
          player: p.summonerName || 'Unknown',
          championName: p.championName || p.championId,
          team: p.teamId === 100 ? 'blue' : 'red',
          value: p.wardsPlaced || 0
        });
      });
    }

    // Dragon control
    const team100Dragons = teamStats.get(100)!.dragonKills;
    const team200Dragons = teamStats.get(200)!.dragonKills;
    if (team100Dragons > 0 || team200Dragons > 0) {
      if (team100Dragons > team200Dragons) {
        insights.push({
          type: 'dragonControl',
          team: 'blue',
          value: team100Dragons
        });
      } else if (team200Dragons > team100Dragons) {
        insights.push({
          type: 'dragonControl',
          team: 'red',
          value: team200Dragons
        });
      }
    }

    // Void Grub control
    const team100Grubs = teamStats.get(100)!.voidGrubKills;
    const team200Grubs = teamStats.get(200)!.voidGrubKills;
    if (team100Grubs > 0 || team200Grubs > 0) {
      if (team100Grubs > team200Grubs) {
        insights.push({
          type: 'voidGrubControl',
          team: 'blue',
          value: team100Grubs
        });
      } else if (team200Grubs > team100Grubs) {
        insights.push({
          type: 'voidGrubControl',
          team: 'red',
          value: team200Grubs
        });
      }
    }

    // Tower advantage
    const towerDiff = teamStats.get(100)!.towerKills - teamStats.get(200)!.towerKills;
    if (Math.abs(towerDiff) >= 2) {
      insights.push({
        type: 'towerAdvantage',
        team: towerDiff > 0 ? 'blue' : 'red',
        value: Math.abs(towerDiff)
      });
    }

    // Tower plates advantage
    const plateDiff = teamStats.get(100)!.towerPlates - teamStats.get(200)!.towerPlates;
    if (Math.abs(plateDiff) >= 3) {
      insights.push({
        type: 'plateAdvantage',
        team: plateDiff > 0 ? 'blue' : 'red',
        value: Math.abs(plateDiff)
      });
    }

    return insights;
  }

  private async getExistingAnalysis(matchId: string): Promise<FourteenMinAnalysis | null> {
    try {
      const result = await query(
        'SELECT * FROM fourteen_min_analysis WHERE match_id = $1',
        [matchId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Parse JSON fields that might be strings
      let insights = row.insights || [];
      if (typeof insights === 'string') {
        try {
          insights = JSON.parse(insights);
        } catch (e) {
          logger.error('Failed to parse insights JSON:', e);
          insights = [];
        }
      }
      
      return {
        matchId: row.match_id,
        region: row.region,
        timestamp: row.timestamp,
        queueId: row.queue_id,
        participants: row.participants,
        teamStats: row.team_stats,
        goldDiff: row.gold_diff,
        winPrediction: row.win_prediction,
        actualWinner: row.actual_winner,
        insights
      };
    } catch (error) {
      logger.error('Error fetching existing analysis:', error);
      return null;
    }
  }

  private async saveAnalysis(analysis: FourteenMinAnalysis): Promise<void> {
    try {
      await query(
        `INSERT INTO fourteen_min_analysis 
         (match_id, region, timestamp, queue_id, participants, team_stats, gold_diff, win_prediction, actual_winner, insights)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (match_id) DO NOTHING`,
        [
          analysis.matchId,
          analysis.region,
          analysis.timestamp,
          analysis.queueId,
          JSON.stringify(analysis.participants),
          JSON.stringify(analysis.teamStats),
          analysis.goldDiff,
          analysis.winPrediction,
          analysis.actualWinner,
          JSON.stringify(analysis.insights)
        ]
      );

      logger.info(`Saved 14-minute analysis for match ${analysis.matchId}`);
    } catch (error) {
      logger.error('Error saving analysis:', error);
    }
  }

  private async deleteExistingAnalysis(matchId: string): Promise<void> {
    try {
      await query(
        'DELETE FROM fourteen_min_analysis WHERE match_id = $1',
        [matchId]
      );
      logger.info(`Deleted existing 14-minute analysis for match ${matchId}`);
    } catch (error) {
      logger.error('Error deleting existing analysis:', error);
    }
  }
}

export const fourteenMinAnalysis = new FourteenMinAnalysisService();