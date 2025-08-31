import axios from 'axios';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

interface ChampionStats {
  tier: string;
  win_rate: number;
  pick_rate: number;
  ban_rate: number;
  trending_build?: string;
  counters?: string[];
  synergies?: string[];
  pro_presence?: number;
}

interface MetaData {
  current_date: string;
  current_patch: string;
  scrape_timestamp: string;
  champion_stats: ChampionStats;
  meta_trends: string;
  high_rank_benchmarks: {
    cs_14: number;
    gold_14: number;
    items_14: string[];
  };
}

export class MetaDataCollector {
  private readonly DDRAGON_VERSION_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
  private readonly metaCache: NodeCache;
  
  constructor() {
    // JST-based cache with 6-hour TTL
    this.metaCache = new NodeCache({ 
      stdTTL: 21600, // 6 hours in seconds
      checkperiod: 300 // Check for expired keys every 5 minutes
    });
  }
  
  /**
   * Get cache slot based on JST time
   * Updates at 9:00, 15:00, 21:00, 3:00 JST (6-hour intervals from 9:00 JST base)
   */
  private getCacheSlot(): number {
    const jstTime = new Date();
    // Convert to JST (UTC+9)
    jstTime.setHours(jstTime.getUTCHours() + 9);
    const hour = jstTime.getHours() % 24;
    
    if (hour >= 9 && hour < 15) return 1;   // 9:00-14:59
    if (hour >= 15 && hour < 21) return 2;  // 15:00-20:59
    if (hour >= 21 || hour < 3) return 3;   // 21:00-02:59
    return 4; // 3:00-8:59
  }
  
  /**
   * Calculate next cache update time in JST
   */
  private getNextUpdateTime(): Date {
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const localOffset = now.getTimezoneOffset();
    const jstTime = new Date(now.getTime() + (jstOffset + localOffset) * 60000);
    
    const hour = jstTime.getHours();
    const updateHours = [9, 15, 21, 3]; // JST 9:00 base, 6-hour intervals
    
    // Find next update hour
    let nextHour = updateHours.find(h => h > hour);
    if (!nextHour) {
      // If no update hour today, use tomorrow's first update
      nextHour = updateHours[0];
      jstTime.setDate(jstTime.getDate() + 1);
    }
    
    jstTime.setHours(nextHour, 0, 0, 0);
    
    // Convert back to local time
    return new Date(jstTime.getTime() - (jstOffset + localOffset) * 60000);
  }
  
  /**
   * Get current meta data for a champion in a specific role
   * This collects real-time data from multiple sources to provide context for Gemini
   */
  async getCurrentMetaData(champion: string, role: string): Promise<MetaData> {
    try {
      // Check cache first
      const cacheSlot = this.getCacheSlot();
      const cacheKey = `meta_${champion}_${role}_${cacheSlot}`;
      const cached = this.metaCache.get<MetaData>(cacheKey);
      
      if (cached) {
        logger.info('Returning cached meta data', { 
          champion, 
          role, 
          cacheSlot,
          nextUpdate: this.getNextUpdateTime().toISOString() 
        });
        return cached;
      }
      // 1. Get current patch version
      const currentPatch = await this.getCurrentPatch();
      logger.info('Current patch retrieved', { patch: currentPatch });
      
      // 2. Collect data from multiple sources (simulated for now)
      // In production, this would use BrightData to scrape real data
      const sources = await this.collectFromMultipleSources(champion, role);
      
      // 3. Aggregate and validate data
      const aggregatedStats = this.aggregateStats(sources);
      const metaTrends = this.extractTrends(sources, champion, role);
      const benchmarks = this.calculateBenchmarks(sources, role);
      
      const metaData: MetaData = {
        current_date: new Date().toISOString().split('T')[0],
        current_patch: currentPatch,
        scrape_timestamp: new Date().toISOString(),
        champion_stats: aggregatedStats,
        meta_trends: metaTrends,
        high_rank_benchmarks: benchmarks
      };
      
      // Store in cache with JST-based slot
      this.metaCache.set(cacheKey, metaData);
      logger.info('Meta data cached', { 
        champion, 
        role, 
        cacheSlot,
        nextUpdate: this.getNextUpdateTime().toISOString() 
      });
      
      return metaData;
    } catch (error) {
      logger.error('Failed to collect meta data', { error, champion, role });
      // Return fallback data if collection fails
      return this.getFallbackMetaData(champion, role);
    }
  }
  
  /**
   * Get the current League of Legends patch version
   */
  private async getCurrentPatch(): Promise<string> {
    try {
      const response = await axios.get(this.DDRAGON_VERSION_URL);
      const versions = response.data;
      
      if (Array.isArray(versions) && versions.length > 0) {
        // Format: "15.16.1" -> "25.16" (convert 15.x to 25.x for 2025)
        const fullVersion = versions[0];
        const [major, minor] = fullVersion.split('.');
        
        // Convert version 15.x to 25.x (add 10 to major version)
        const actualMajor = parseInt(major) + 10;
        const patchVersion = `${actualMajor}.${minor}`;
        
        logger.info('Patch version converted', { 
          original: `${major}.${minor}`, 
          converted: patchVersion 
        });
        
        return patchVersion;
      }
      
      // Fallback to a known recent patch
      return '25.16';
    } catch (error) {
      logger.warn('Failed to fetch current patch, using fallback', { error });
      return '25.16'; // 2025 August estimated patch
    }
  }
  
  /**
   * Collect data from multiple sources (OP.GG, U.GG, Mobalytics)
   * This would integrate with BrightData in production
   */
  private async collectFromMultipleSources(champion: string, role: string): Promise<any[]> {
    // Simulated data collection - replace with actual BrightData scraping
    const sources = [];
    
    // Source 1: OP.GG simulation
    sources.push({
      source: 'opgg',
      tier: 'S',
      win_rate: 52.3,
      pick_rate: 8.5,
      ban_rate: 15.2,
      cs_14: role === 'MIDDLE' ? 115 : role === 'BOTTOM' ? 120 : 105,
      gold_14: 9200,
      items_14: ['Doran\'s Ring', 'Lost Chapter', 'Boots'],
      trending_build: 'Luden\'s Echo -> Shadowflame',
      counters: ['Yasuo', 'Zed', 'Fizz'],
      synergies: ['Jarvan IV', 'Leona'],
      pro_presence: 35
    });
    
    // Source 2: U.GG simulation
    sources.push({
      source: 'ugg',
      tier: 'S+',
      win_rate: 51.8,
      pick_rate: 9.0,
      ban_rate: 14.8,
      cs_14: role === 'MIDDLE' ? 112 : role === 'BOTTOM' ? 118 : 103,
      gold_14: 9000,
      items_14: ['Doran\'s Ring', 'Lost Chapter', 'Boots of Speed']
    });
    
    // Source 3: Mobalytics simulation
    sources.push({
      source: 'mobalytics',
      tier: 'A+',
      win_rate: 52.0,
      pick_rate: 8.7,
      ban_rate: 15.0,
      cs_14: role === 'MIDDLE' ? 114 : role === 'BOTTOM' ? 119 : 104,
      gold_14: 9100,
      items_14: ['Doran\'s Ring', 'Lost Chapter', 'Boots']
    });
    
    return sources;
  }
  
  /**
   * Aggregate statistics from multiple sources
   */
  private aggregateStats(sources: any[]): ChampionStats {
    const avgWinRate = sources.reduce((sum, s) => sum + s.win_rate, 0) / sources.length;
    const avgPickRate = sources.reduce((sum, s) => sum + s.pick_rate, 0) / sources.length;
    const avgBanRate = sources.reduce((sum, s) => sum + s.ban_rate, 0) / sources.length;
    
    // Use the most common tier or the first source's tier
    const tier = sources[0].tier || 'A';
    
    return {
      tier,
      win_rate: Math.round(avgWinRate * 10) / 10,
      pick_rate: Math.round(avgPickRate * 10) / 10,
      ban_rate: Math.round(avgBanRate * 10) / 10,
      trending_build: sources[0].trending_build,
      counters: sources[0].counters || [],
      synergies: sources[0].synergies || [],
      pro_presence: sources[0].pro_presence || 0
    };
  }
  
  /**
   * Extract current meta trends
   */
  private extractTrends(sources: any[], _champion: string, role: string): string {
    const primarySource = sources[0];
    
    const trends = [];
    
    // Add tier information
    trends.push(`Current Tier: ${primarySource.tier} (${primarySource.win_rate}% win rate)`);
    
    // Add build trend if available
    if (primarySource.trending_build) {
      trends.push(`Trending Build: ${primarySource.trending_build}`);
    }
    
    // Add counter information
    if (primarySource.counters && primarySource.counters.length > 0) {
      trends.push(`Main Counters: ${primarySource.counters.slice(0, 3).join(', ')}`);
    }
    
    // Add pro play presence
    if (primarySource.pro_presence) {
      trends.push(`Pro Play Presence: ${primarySource.pro_presence}%`);
    }
    
    // Add role-specific trends
    if (role === 'MIDDLE') {
      trends.push('Mid lane focus: Roaming and wave clear prioritized in current meta');
    } else if (role === 'BOTTOM') {
      trends.push('ADC focus: Late game scaling with early farming efficiency');
    }
    
    return trends.join('\n');
  }
  
  /**
   * Calculate high-rank benchmarks
   */
  private calculateBenchmarks(sources: any[], role: string): any {
    // Average CS and gold from all sources
    const avgCs = Math.round(sources.reduce((sum, s) => sum + s.cs_14, 0) / sources.length);
    const avgGold = Math.round(sources.reduce((sum, s) => sum + s.gold_14, 0) / sources.length);
    
    // Get most common items
    const items = sources[0].items_14 || this.getDefaultItems(role);
    
    return {
      cs_14: avgCs,
      gold_14: avgGold,
      items_14: items
    };
  }
  
  /**
   * Get default items based on role
   */
  private getDefaultItems(role: string): string[] {
    const defaultItems: { [key: string]: string[] } = {
      'TOP': ['Doran\'s Shield', 'Ruby Crystal', 'Boots'],
      'JUNGLE': ['Jungle Item', 'Boots', 'Component'],
      'MIDDLE': ['Doran\'s Ring', 'Lost Chapter', 'Boots'],
      'BOTTOM': ['Doran\'s Blade', 'Noonquiver', 'Boots'],
      'SUPPORT': ['Support Item', 'Boots', 'Control Ward']
    };
    
    return defaultItems[role] || ['Starting Item', 'Component', 'Boots'];
  }
  
  /**
   * Provide fallback meta data if collection fails
   */
  private getFallbackMetaData(_champion: string, role: string): MetaData {
    logger.warn('Using fallback meta data', { champion: _champion, role });
    
    return {
      current_date: new Date().toISOString().split('T')[0],
      current_patch: '25.16',
      scrape_timestamp: new Date().toISOString(),
      champion_stats: {
        tier: 'A',
        win_rate: 50.0,
        pick_rate: 5.0,
        ban_rate: 5.0
      },
      meta_trends: 'Standard meta build and playstyle',
      high_rank_benchmarks: {
        cs_14: role === 'MIDDLE' ? 110 : role === 'BOTTOM' ? 115 : 100,
        gold_14: 9000,
        items_14: this.getDefaultItems(role)
      }
    };
  }
}

// Export singleton instance
export const metaDataCollector = new MetaDataCollector();