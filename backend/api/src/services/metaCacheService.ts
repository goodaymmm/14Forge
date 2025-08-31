import NodeCache from 'node-cache';
import { logger } from '../utils/logger';
import { metaDataCollector } from './metaDataCollector';
import { brightDataScraper } from './brightDataScraper';

interface CachedMetaData {
  data: any;
  timestamp: string;
  expiry: number;
}

export class MetaCacheService {
  private cache: NodeCache;
  private metaCacheTTL: number = 60 * 60; // 1 hour for meta data
  private analysisCacheTTL: number = 6 * 60 * 60; // 6 hours for AI analysis
  private benchmarkCacheTTL: number = 30 * 60; // 30 minutes for benchmarks
  
  constructor() {
    this.cache = new NodeCache({ 
      stdTTL: this.metaCacheTTL,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false // Don't clone objects for better performance
    });
    
    // Log cache statistics periodically
    setInterval(() => {
      const stats = this.cache.getStats();
      logger.info('Cache statistics', stats);
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  /**
   * Get meta data with intelligent caching
   * Uses hourly cache keys to ensure data freshness
   */
  async getMetaData(champion: string, role: string): Promise<any> {
    const cacheKey = this.generateMetaCacheKey(champion, role);
    
    try {
      // Check cache first
      const cached = this.cache.get<CachedMetaData>(cacheKey);
      
      if (cached) {
        logger.info('Meta data cache hit', { cacheKey, age: this.getCacheAge(cached.timestamp) });
        return cached.data;
      }
      
      // Cache miss - fetch new data
      logger.info('Meta data cache miss, fetching fresh data', { cacheKey });
      const freshData = await metaDataCollector.getCurrentMetaData(champion, role);
      
      // Store in cache
      const cacheData: CachedMetaData = {
        data: freshData,
        timestamp: new Date().toISOString(),
        expiry: Date.now() + (this.metaCacheTTL * 1000)
      };
      
      this.cache.set(cacheKey, cacheData, this.metaCacheTTL);
      
      return freshData;
    } catch (error) {
      logger.error('Failed to get meta data', { error, champion, role });
      
      // Try to return stale cache if available
      const staleCache = this.cache.get<CachedMetaData>(cacheKey);
      if (staleCache) {
        logger.warn('Returning stale cache due to error', { cacheKey });
        return staleCache.data;
      }
      
      throw error;
    }
  }
  
  /**
   * Get high-rank benchmarks with caching
   */
  async getBenchmarks(champion: string, role: string): Promise<any> {
    const cacheKey = `benchmark_${champion}_${role}`;
    
    try {
      // Check cache
      const cached = this.cache.get<any>(cacheKey);
      
      if (cached) {
        logger.info('Benchmark cache hit', { cacheKey });
        return cached;
      }
      
      // Fetch from BrightData
      logger.info('Benchmark cache miss, scraping data', { cacheKey });
      const benchmarks = await brightDataScraper.scrapeHighRankData(champion, role);
      
      // Cache for 30 minutes
      this.cache.set(cacheKey, benchmarks, this.benchmarkCacheTTL);
      
      return benchmarks;
    } catch (error) {
      logger.error('Failed to get benchmarks', { error, champion, role });
      
      // Return default benchmarks
      return {
        cs_14: 110,
        gold_14: 9000,
        items_14: ['Lost Chapter', 'Boots'],
        win_rate: 50,
        sample_size: 0
      };
    }
  }
  
  /**
   * Cache AI analysis results
   */
  async cacheAnalysis(cacheKey: string, analysis: any): Promise<void> {
    try {
      const cacheData: CachedMetaData = {
        data: analysis,
        timestamp: new Date().toISOString(),
        expiry: Date.now() + (this.analysisCacheTTL * 1000)
      };
      
      this.cache.set(cacheKey, cacheData, this.analysisCacheTTL);
      logger.info('AI analysis cached', { cacheKey, ttl: this.analysisCacheTTL });
    } catch (error) {
      logger.error('Failed to cache analysis', { error, cacheKey });
    }
  }
  
  /**
   * Get cached AI analysis
   */
  async getCachedAnalysis(cacheKey: string): Promise<any | null> {
    try {
      const cached = this.cache.get<CachedMetaData>(cacheKey);
      
      if (cached) {
        logger.info('AI analysis cache hit', { 
          cacheKey, 
          age: this.getCacheAge(cached.timestamp) 
        });
        return cached.data;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get cached analysis', { error, cacheKey });
      return null;
    }
  }
  
  /**
   * Generate cache key for meta data
   * Uses hourly granularity to balance freshness and efficiency
   */
  private generateMetaCacheKey(champion: string, role: string): string {
    const now = new Date();
    const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    return `meta_${champion}_${role}_${hourKey}`;
  }
  
  /**
   * Calculate cache age in minutes
   */
  private getCacheAge(timestamp: string): string {
    const age = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(age / 60000);
    return `${minutes} minutes`;
  }
  
  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getStats(): any {
    const stats = this.cache.getStats();
    const keys = this.cache.keys();
    
    return {
      ...stats,
      totalKeys: keys.length,
      keys: keys.slice(0, 10), // Show first 10 keys
      memoryUsage: process.memoryUsage()
    };
  }
  
  /**
   * Warm up cache with common champions/roles
   */
  async warmupCache(): Promise<void> {
    const commonChampions = [
      { champion: 'Azir', role: 'MIDDLE' },
      { champion: 'Jinx', role: 'BOTTOM' },
      { champion: 'Thresh', role: 'SUPPORT' },
      { champion: 'LeeSin', role: 'JUNGLE' },
      { champion: 'Darius', role: 'TOP' }
    ];
    
    logger.info('Starting cache warmup');
    
    for (const { champion, role } of commonChampions) {
      try {
        await this.getMetaData(champion, role);
        await this.getBenchmarks(champion, role);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      } catch (error) {
        logger.warn('Cache warmup failed for champion', { champion, role, error });
      }
    }
    
    logger.info('Cache warmup completed');
  }
}

// Export singleton instance
export const metaCacheService = new MetaCacheService();