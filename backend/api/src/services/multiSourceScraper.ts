import axios from 'axios';
import { logger } from '../utils/logger';
import NodeCache from 'node-cache';

export interface MetaSource {
  name: string;
  url: string;
  selector?: string;
}

export interface ChampionMetaData {
  champion: string;
  region: string;
  tier?: string;
  pickRate?: number;
  banRate?: number;
  winRate?: number;
  builds?: BuildData[];
  runes?: RuneData[];
  timestamp: Date;
  source: string;
}

export interface BuildData {
  items: string[];
  winRate: number;
  playRate: number;
  games: number;
}

export interface RuneData {
  primary: string;
  secondary: string;
  winRate: number;
  playRate: number;
}

export interface RegionMetaComparison {
  champion: string;
  kr: ChampionMetaData | null;
  na: ChampionMetaData | null;
  eu: ChampionMetaData | null;
  variance: {
    winRate: number;
    pickRate: number;
    banRate: number;
  };
  consensusTier?: string;
}

class MultiSourceScraper {
  private cache: NodeCache;
  private brightDataConfig: any;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour cache
      checkperiod: 600
    });

    this.brightDataConfig = {
      host: process.env.BRIGHTDATA_HOST || 'brd.superproxy.io',
      port: process.env.BRIGHTDATA_PORT_PUPPETEER || 9222,
      username: process.env.BRIGHTDATA_USERNAME,
      password: process.env.BRIGHTDATA_PASSWORD,
      zone: process.env.BRIGHTDATA_ZONE || 'web_unlocker_lol'
    };
  }

  /**
   * Scrape data from multiple sources in parallel
   */
  async scrapeMultipleSources(
    champion: string,
    regions: string[] = ['kr', 'na', 'euw']
  ): Promise<RegionMetaComparison> {
    const cacheKey = `meta_${champion}_${regions.join('_')}`;
    const cached = this.cache.get<RegionMetaComparison>(cacheKey);
    
    if (cached) {
      logger.info('Returning cached meta comparison', { champion, regions });
      return cached;
    }

    logger.info('Starting parallel scraping', { champion, regions });

    // Define sources for each region
    const sources: { [key: string]: MetaSource[] } = {
      kr: [
        { name: 'opgg', url: `https://www.op.gg/champions/${champion.toLowerCase()}` },
        { name: 'ugg', url: `https://u.gg/lol/champions/${champion.toLowerCase()}/build?region=kr` }
      ],
      na: [
        { name: 'opgg', url: `https://na.op.gg/champions/${champion.toLowerCase()}` },
        { name: 'ugg', url: `https://u.gg/lol/champions/${champion.toLowerCase()}/build?region=na1` }
      ],
      euw: [
        { name: 'opgg', url: `https://euw.op.gg/champions/${champion.toLowerCase()}` },
        { name: 'ugg', url: `https://u.gg/lol/champions/${champion.toLowerCase()}/build?region=euw1` }
      ]
    };

    // Parallel scraping for all regions
    const scrapePromises = regions.map(async (region) => {
      try {
        const regionSources = sources[region];
        if (!regionSources) return null;

        // Scrape from multiple sources for this region
        const sourcePromises = regionSources.map(source => 
          this.scrapeWithBrightData(source, champion, region)
        );

        const results = await Promise.allSettled(sourcePromises);
        
        // Aggregate data from successful scrapes
        const successfulData = results
          .filter(r => r.status === 'fulfilled')
          .map(r => (r as PromiseFulfilledResult<ChampionMetaData>).value)
          .filter(Boolean);

        if (successfulData.length === 0) return null;

        // Merge data from multiple sources
        return this.mergeSourceData(successfulData);
      } catch (error) {
        logger.error(`Failed to scrape ${region}`, error);
        return null;
      }
    });

    const [krData, naData, euData] = await Promise.all(scrapePromises);

    // Calculate variance between regions
    const variance = this.calculateVariance(krData, naData, euData);
    const consensusTier = this.determineConsensusTier(krData, naData, euData);

    const comparison: RegionMetaComparison = {
      champion,
      kr: krData,
      na: naData,
      eu: euData,
      variance,
      consensusTier
    };

    // Cache the result
    this.cache.set(cacheKey, comparison);

    return comparison;
  }

  /**
   * Scrape data using BrightData
   */
  private async scrapeWithBrightData(
    source: MetaSource,
    champion: string,
    region: string
  ): Promise<ChampionMetaData | null> {
    try {
      const proxyUrl = `http://${this.brightDataConfig.username}:${this.brightDataConfig.password}@${this.brightDataConfig.host}:${this.brightDataConfig.port}`;

      const response = await axios.get(source.url, {
        proxy: {
          host: this.brightDataConfig.host,
          port: parseInt(this.brightDataConfig.port),
          auth: {
            username: this.brightDataConfig.username,
            password: this.brightDataConfig.password
          }
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      // Parse the HTML response based on source
      return this.parseSourceData(response.data, source.name, champion, region);
    } catch (error) {
      logger.error(`BrightData scraping failed for ${source.name}`, error);
      return null;
    }
  }

  /**
   * Parse HTML data based on source
   */
  private parseSourceData(
    html: string,
    sourceName: string,
    champion: string,
    region: string
  ): ChampionMetaData {
    // This is a simplified parser - in production, use cheerio or similar
    const data: ChampionMetaData = {
      champion,
      region,
      source: sourceName,
      timestamp: new Date()
    };

    // Extract stats using regex (simplified example)
    const winRateMatch = html.match(/win\s*rate[:\s]*([0-9.]+)%/i);
    const pickRateMatch = html.match(/pick\s*rate[:\s]*([0-9.]+)%/i);
    const banRateMatch = html.match(/ban\s*rate[:\s]*([0-9.]+)%/i);

    if (winRateMatch) data.winRate = parseFloat(winRateMatch[1]);
    if (pickRateMatch) data.pickRate = parseFloat(pickRateMatch[1]);
    if (banRateMatch) data.banRate = parseFloat(banRateMatch[1]);

    // Extract tier if available
    const tierMatch = html.match(/tier[:\s]*([S|A|B|C|D][\+\-]?)/i);
    if (tierMatch) data.tier = tierMatch[1];

    return data;
  }

  /**
   * Merge data from multiple sources
   */
  private mergeSourceData(sources: ChampionMetaData[]): ChampionMetaData {
    if (sources.length === 0) {
      throw new Error('No data to merge');
    }

    if (sources.length === 1) {
      return sources[0];
    }

    // Average the numerical values
    const merged: ChampionMetaData = {
      ...sources[0],
      winRate: this.average(sources.map(s => s.winRate).filter(Boolean) as number[]),
      pickRate: this.average(sources.map(s => s.pickRate).filter(Boolean) as number[]),
      banRate: this.average(sources.map(s => s.banRate).filter(Boolean) as number[]),
      source: sources.map(s => s.source).join(', ')
    };

    // Use most common tier
    const tiers = sources.map(s => s.tier).filter(Boolean);
    if (tiers.length > 0) {
      merged.tier = this.mostCommon(tiers as string[]);
    }

    return merged;
  }

  /**
   * Calculate variance between regions
   */
  private calculateVariance(
    kr: ChampionMetaData | null,
    na: ChampionMetaData | null,
    eu: ChampionMetaData | null
  ): { winRate: number; pickRate: number; banRate: number } {
    const winRates = [kr?.winRate, na?.winRate, eu?.winRate].filter(Boolean) as number[];
    const pickRates = [kr?.pickRate, na?.pickRate, eu?.pickRate].filter(Boolean) as number[];
    const banRates = [kr?.banRate, na?.banRate, eu?.banRate].filter(Boolean) as number[];

    return {
      winRate: this.calculateStdDev(winRates),
      pickRate: this.calculateStdDev(pickRates),
      banRate: this.calculateStdDev(banRates)
    };
  }

  /**
   * Determine consensus tier across regions
   */
  private determineConsensusTier(
    kr: ChampionMetaData | null,
    na: ChampionMetaData | null,
    eu: ChampionMetaData | null
  ): string {
    const tiers = [kr?.tier, na?.tier, eu?.tier].filter(Boolean) as string[];
    
    if (tiers.length === 0) return 'Unknown';
    
    // Weight KR tier more heavily (Korean meta is often ahead)
    if (kr?.tier) {
      tiers.push(kr.tier); // Add KR tier twice for weighting
    }

    return this.mostCommon(tiers);
  }

  /**
   * Calculate average
   */
  private average(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(nums: number[]): number {
    if (nums.length === 0) return 0;
    const avg = this.average(nums);
    const squareDiffs = nums.map(n => Math.pow(n - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }

  /**
   * Find most common element
   */
  private mostCommon<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    return [...counts.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
  }

  /**
   * Get high-rank player positions for heatmap
   */
  async getHighRankPositions(
    region: string,
    champion: string,
    limit: number = 10
  ): Promise<any[]> {
    const cacheKey = `positions_${region}_${champion}`;
    const cached = this.cache.get<any[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Scrape high-rank match data from OP.GG or U.GG
      const url = `https://${region === 'kr' ? 'www' : region}.op.gg/champions/${champion.toLowerCase()}/matches`;
      
      const response = await this.scrapeWithBrightData(
        { name: 'opgg-matches', url },
        champion,
        region
      );

      // This would normally parse match IDs and fetch position data
      // For now, return empty array as placeholder
      const positions: any[] = [];
      
      this.cache.set(cacheKey, positions);
      return positions;
    } catch (error) {
      logger.error('Failed to get high rank positions', error);
      return [];
    }
  }
}

export const multiSourceScraper = new MultiSourceScraper();