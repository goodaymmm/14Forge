import axios, { AxiosInstance, AxiosError } from 'axios';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

interface RateLimitInfo {
  appRateLimit: string;
  appRateLimitCount: string;
  methodRateLimit: string;
  methodRateLimitCount: string;
  retryAfter?: number;
}

export class RiotApiClient {
  private client: AxiosInstance;
  private cache: NodeCache;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor() {
    
    if (!process.env.RIOT_API_KEY) {
      logger.warn('RIOT_API_KEY is not configured - API calls will fail');
    }

    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60,
      useClones: false
    });

    this.client = axios.create({
      timeout: 10000,
      headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY || ''
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Response interceptor for caching and rate limit handling
    this.client.interceptors.response.use(
      (response) => {
        // Store rate limit info from headers
        this.rateLimitInfo = {
          appRateLimit: response.headers['x-app-rate-limit'] || '',
          appRateLimitCount: response.headers['x-app-rate-limit-count'] || '',
          methodRateLimit: response.headers['x-method-rate-limit'] || '',
          methodRateLimitCount: response.headers['x-method-rate-limit-count'] || ''
        };
        
        return response;
      },
      async (error: AxiosError) => {
        if (error.response) {
          const { status, data, headers } = error.response;
          
          switch (status) {
            case 404:
              throw new ApiError(404, 'Summoner not found');
            
            case 429:
              const retryAfter = parseInt(headers['retry-after'] as string || '5');
              logger.warn('Rate limit exceeded', { retryAfter });
              throw new ApiError(429, `Rate limit exceeded. Retry after ${retryAfter} seconds`);
            
            case 403:
              throw new ApiError(403, 'Invalid API key or forbidden access');
            
            case 503:
              throw new ApiError(503, 'Riot API service is temporarily unavailable');
            
            default:
              throw new ApiError(status, `Riot API error: ${(data as any)?.status?.message || 'Unknown error'}`);
          }
        }
        
        throw new ApiError(500, 'Network error while contacting Riot API');
      }
    );
  }

  private getRegionalEndpoint(region: string): string {
    const regionalEndpoints: Record<string, string> = {
      'br1': 'https://br1.api.riotgames.com',
      'eun1': 'https://eun1.api.riotgames.com',
      'euw1': 'https://euw1.api.riotgames.com',
      'jp1': 'https://jp1.api.riotgames.com',
      'kr': 'https://kr.api.riotgames.com',
      'la1': 'https://la1.api.riotgames.com',
      'la2': 'https://la2.api.riotgames.com',
      'na1': 'https://na1.api.riotgames.com',
      'oc1': 'https://oc1.api.riotgames.com',
      'ph2': 'https://ph2.api.riotgames.com',
      'ru': 'https://ru.api.riotgames.com',
      'sg2': 'https://sg2.api.riotgames.com',
      'th2': 'https://th2.api.riotgames.com',
      'tr1': 'https://tr1.api.riotgames.com',
      'tw2': 'https://tw2.api.riotgames.com',
      'vn2': 'https://vn2.api.riotgames.com'
    };

    return regionalEndpoints[region.toLowerCase()] || regionalEndpoints['na1'];
  }

  private getRoutingValue(region: string): string {
    const routingValues: Record<string, string> = {
      'br1': 'americas',
      'eun1': 'europe',
      'euw1': 'europe',
      'jp1': 'asia',
      'kr': 'asia',
      'la1': 'americas',
      'la2': 'americas',
      'na1': 'americas',
      'oc1': 'sea',
      'ph2': 'sea',
      'ru': 'europe',
      'sg2': 'sea',
      'th2': 'sea',
      'tr1': 'europe',
      'tw2': 'sea',
      'vn2': 'sea'
    };

    return routingValues[region.toLowerCase()] || 'americas';
  }

  // Helper method to validate API key
  private validateApiKey(): void {
    if (!process.env.RIOT_API_KEY) {
      throw new ApiError(403, 'RIOT_API_KEY is not configured');
    }
  }

  // Account and Summoner endpoints
  async getSummonerByName(region: string, summonerName: string) {
    this.validateApiKey();
    
    // Normalize full-width characters to half-width
    summonerName = summonerName.replace(/[＃]/g, '#');
    
    // Parse Riot ID (gameName#tagLine)
    let gameName: string;
    let tagLine: string;
    
    if (summonerName.includes('#')) {
      [gameName, tagLine] = summonerName.split('#');
    } else {
      // If no tag provided, use default region tag
      gameName = summonerName;
      tagLine = this.getDefaultTagLine(region);
    }

    // First, get account by Riot ID
    const accountCacheKey = `account:${gameName.toLowerCase()}:${tagLine.toLowerCase()}`;
    let accountData: any = this.cache.get(accountCacheKey);
    
    if (!accountData) {
      const routing = this.getRoutingValue(region);
      const accountUrl = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
      
      
      try {
        const accountResponse = await this.client.get(accountUrl);
        accountData = accountResponse.data;
        this.cache.set(accountCacheKey, accountData, 600);
      } catch (error) {
        // If account not found, throw more specific error
        if ((error as any).response?.status === 404) {
          throw new ApiError(404, `Summoner "${gameName}#${tagLine}" not found`);
        }
        throw error;
      }
    }

    // Now try to get summoner data from Summoner v4 API for profile info
    let summonerV4Data: any = null;
    const summonerV4CacheKey = `summoner:v4:${region}:${(accountData as any).puuid}`;
    summonerV4Data = this.cache.get(summonerV4CacheKey);
    
    if (!summonerV4Data) {
      try {
        const endpoint = this.getRegionalEndpoint(region);
        const summonerUrl = `${endpoint}/lol/summoner/v4/summoners/by-puuid/${(accountData as any).puuid}`;
        const summonerResponse = await this.client.get(summonerUrl);
        summonerV4Data = summonerResponse.data;
        this.cache.set(summonerV4CacheKey, summonerV4Data, 600);
      } catch (error) {
        logger.warn('Failed to fetch Summoner v4 data, using defaults', error);
        // If Summoner v4 fails (API deprecated), use default values
        summonerV4Data = null;
      }
    }

    // Combine Account API and Summoner v4 data
    const summonerData = {
      // Core identifiers
      puuid: (accountData as any).puuid,
      id: summonerV4Data?.id || (accountData as any).puuid, // Use actual summoner ID if available
      accountId: summonerV4Data?.accountId || (accountData as any).puuid,
      
      // Display information
      name: `${(accountData as any).gameName}#${(accountData as any).tagLine}`,
      gameName: (accountData as any).gameName,
      tagLine: (accountData as any).tagLine,
      
      // Profile information from Summoner v4 (or defaults)
      profileIconId: summonerV4Data?.profileIconId || 0,
      summonerLevel: summonerV4Data?.summonerLevel || 0,
      revisionDate: summonerV4Data?.revisionDate || Date.now()
    };
    
    // Cache the formatted data
    const summonerCacheKey = `summoner:${region}:${(accountData as any).puuid}`;
    this.cache.set(summonerCacheKey, summonerData, 600);
    
    return summonerData;
  }

  private getDefaultTagLine(region: string): string {
    // Default tag lines for each region
    const defaultTags: Record<string, string> = {
      'jp1': 'JP1',
      'kr': 'KR',
      'na1': 'NA1',
      'euw1': 'EUW',
      'eun1': 'EUNE',
      'br1': 'BR',
      'la1': 'LAN',
      'la2': 'LAS',
      'oc1': 'OCE',
      'ru': 'RU',
      'tr1': 'TR'
    };
    return defaultTags[region.toLowerCase()] || region.toUpperCase();
  }

  async getSummonerByPuuid(region: string, puuid: string) {
    this.validateApiKey();
    const cacheKey = `summoner:puuid:${region}:${puuid}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Try to get summoner data from Summoner v4 API
    try {
      const endpoint = this.getRegionalEndpoint(region);
      const url = `${endpoint}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
      
      const response = await this.client.get(url);
      this.cache.set(cacheKey, response.data, 600);
      
      return response.data;
    } catch (error) {
      logger.warn('Failed to fetch Summoner v4 data by PUUID, returning minimal data', error);
      // If Summoner v4 fails, return minimal data
      const minimalData = {
        puuid: puuid,
        id: puuid,
        accountId: puuid,
        profileIconId: 0,
        summonerLevel: 0,
        revisionDate: Date.now()
      };
      this.cache.set(cacheKey, minimalData, 600);
      return minimalData;
    }
  }

  // League endpoints
  async getLeagueEntries(region: string, encryptedPUUID: string) {
    this.validateApiKey();
    const cacheKey = `league:${region}:${encryptedPUUID}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const endpoint = this.getRegionalEndpoint(region);
    const url = `${endpoint}/lol/league/v4/entries/by-puuid/${encryptedPUUID}`;
    
    const response = await this.client.get(url);
    this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
    
    return response.data;
  }

  // Match endpoints
  async getMatchList(region: string, puuid: string, options?: {
    start?: number;
    count?: number;
    queue?: number;
    type?: string;
  }) {
    this.validateApiKey();
    const routing = this.getRoutingValue(region);
    const params = new URLSearchParams();
    
    if (options?.start !== undefined) params.append('start', options.start.toString());
    if (options?.count !== undefined) params.append('count', options.count.toString());
    if (options?.queue !== undefined) params.append('queue', options.queue.toString());
    if (options?.type) params.append('type', options.type);

    const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?${params}`;
    
    const response = await this.client.get(url);
    return response.data;
  }

  async getMatch(region: string, matchId: string) {
    this.validateApiKey();
    const cacheKey = `match:${matchId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const routing = this.getRoutingValue(region);
    const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    
    const response = await this.client.get(url);
    this.cache.set(cacheKey, response.data, 3600); // Cache for 1 hour
    
    return response.data;
  }

  async getMatchTimeline(region: string, matchId: string) {
    this.validateApiKey();
    const cacheKey = `timeline:${matchId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const routing = this.getRoutingValue(region);
    const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
    
    const response = await this.client.get(url);
    this.cache.set(cacheKey, response.data, 3600); // Cache for 1 hour
    
    return response.data;
  }

  // Champion mastery
  async getChampionMastery(region: string, puuid: string) {
    this.validateApiKey();
    const endpoint = this.getRegionalEndpoint(region);
    const url = `${endpoint}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`;
    
    const response = await this.client.get(url);
    return response.data;
  }

  // Static data
  async getChampions() {
    const cacheKey = 'static:champions';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const version = await this.getLatestVersion();
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
    
    const response = await axios.get(url);
    this.cache.set(cacheKey, response.data, 86400); // Cache for 24 hours
    
    return response.data;
  }

  async getLatestVersion() {
    const cacheKey = 'static:version';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const url = 'https://ddragon.leagueoflegends.com/api/versions.json';
    const response = await axios.get(url);
    const latestVersion = response.data[0];
    
    this.cache.set(cacheKey, latestVersion, 86400); // Cache for 24 hours
    
    return latestVersion;
  }

  // Utility methods
  clearCache() {
    this.cache.flushAll();
    logger.info('Riot API cache cleared');
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  getRateLimitInfo() {
    return this.rateLimitInfo;
  }
}

// Export singleton instance with lazy initialization
let riotApiInstance: RiotApiClient | null = null;

export const getRiotApi = () => {
  if (!riotApiInstance) {
    riotApiInstance = new RiotApiClient();
  }
  return riotApiInstance;
};