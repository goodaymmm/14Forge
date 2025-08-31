import axios from 'axios';
import { logger } from '../utils/logger';

interface BrightDataConfig {
  zone: string;
  url: string;
  render_js?: boolean;
  timeout?: number;
  selectors?: {
    [key: string]: string;
  };
}

interface ScrapedData {
  source: string;
  url: string;
  timestamp: string;
  data: any;
  success: boolean;
  error?: string;
}

interface ChampionBenchmark {
  cs_14: number;
  gold_14: number;
  items_14: string[];
  win_rate: number;
  sample_size: number;
}

export class BrightDataScraper {
  private apiKey: string;
  private baseUrl: string = 'https://api.brightdata.com/dca/dataset';
  
  constructor() {
    this.apiKey = process.env.BRIGHTDATA_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('BrightData API key not configured, using mock data');
    }
  }
  
  /**
   * Scrape high-rank data for a specific champion and role
   */
  async scrapeHighRankData(champion: string, role: string): Promise<ChampionBenchmark> {
    try {
      logger.info('Scraping high-rank data', { champion, role });
      
      // If no API key, return mock data
      if (!this.apiKey) {
        return this.getMockHighRankData(champion, role);
      }
      
      // Scrape from multiple sources in parallel
      const sources = await Promise.all([
        this.scrapeOPGG(champion, role),
        this.scrapeUGG(champion, role),
        this.scrapeMobalytics(champion, role)
      ]);
      
      // Aggregate results
      return this.aggregateBenchmarks(sources);
    } catch (error) {
      logger.error('Failed to scrape high-rank data', { error, champion, role });
      return this.getMockHighRankData(champion, role);
    }
  }
  
  /**
   * Scrape OP.GG for champion data
   */
  private async scrapeOPGG(champion: string, role: string): Promise<ScrapedData> {
    // Normalize champion name for URL (remove spaces, apostrophes, etc.)
    const normalizedChampion = champion.toLowerCase()
      .replace(/['\s]/g, '')  // Remove apostrophes and spaces
      .replace(/\./g, '');     // Remove dots
    
    // Map role to OP.GG position format
    const positionMap: { [key: string]: string } = {
      'TOP': 'top',
      'JUNGLE': 'jungle',
      'MIDDLE': 'mid',
      'MID': 'mid',
      'BOTTOM': 'adc',
      'ADC': 'adc',
      'SUPPORT': 'support',
      'UTILITY': 'support'
    };
    const position = positionMap[role.toUpperCase()] || 'mid';
    
    const config: BrightDataConfig = {
      zone: 'web_unlocker_lol',
      url: `https://op.gg/champions/${normalizedChampion}/build/${position}?region=kr&tier=master_plus`,
      render_js: true,
      timeout: 30000,
      selectors: {
        win_rate: '.css-b0uosc',
        pick_rate: '.css-fzj40v',
        cs_14: '.minute-14 .cs-value',
        gold_14: '.minute-14 .gold-value',
        items: '.item-build .item-icon'
      }
    };
    
    try {
      // In production, this would make actual BrightData API call
      // For now, return simulated data
      const response = await this.simulateBrightDataCall(config);
      
      return {
        source: 'opgg',
        url: config.url,
        timestamp: new Date().toISOString(),
        data: response,
        success: true
      };
    } catch (error) {
      logger.error('OP.GG scraping failed', { error });
      return {
        source: 'opgg',
        url: config.url,
        timestamp: new Date().toISOString(),
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Scrape U.GG for champion data
   */
  private async scrapeUGG(champion: string, role: string): Promise<ScrapedData> {
    // Normalize champion name for URL
    const normalizedChampion = champion.toLowerCase()
      .replace(/['\s]/g, '')
      .replace(/\./g, '');
    
    // Map role to U.GG position format
    const positionMap: { [key: string]: string } = {
      'TOP': 'top',
      'JUNGLE': 'jungle',
      'MIDDLE': 'mid',
      'MID': 'mid',
      'BOTTOM': 'adc',
      'ADC': 'adc',
      'SUPPORT': 'support',
      'UTILITY': 'support'
    };
    const position = positionMap[role.toUpperCase()] || 'mid';
    
    const config: BrightDataConfig = {
      zone: 'web_unlocker_lol',
      url: `https://u.gg/lol/champions/${normalizedChampion}/build/${position}?rank=master_plus`,
      render_js: true,
      timeout: 30000,
      selectors: {
        win_rate: '.win-rate-text',
        cs_14: '[data-minute="14"] .cs-stat',
        gold_14: '[data-minute="14"] .gold-stat',
        items: '.item-build-list img'
      }
    };
    
    try {
      const response = await this.simulateBrightDataCall(config);
      
      return {
        source: 'ugg',
        url: config.url,
        timestamp: new Date().toISOString(),
        data: response,
        success: true
      };
    } catch (error) {
      logger.error('U.GG scraping failed', { error });
      return {
        source: 'ugg',
        url: config.url,
        timestamp: new Date().toISOString(),
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Scrape Mobalytics for champion data
   */
  private async scrapeMobalytics(champion: string, role: string): Promise<ScrapedData> {
    // Normalize champion name for URL
    const normalizedChampion = champion.toLowerCase()
      .replace(/['\s]/g, '')
      .replace(/\./g, '');
    
    // Map role to Mobalytics position format
    const positionMap: { [key: string]: string } = {
      'TOP': 'top',
      'JUNGLE': 'jungle',
      'MIDDLE': 'mid',
      'MID': 'mid',
      'BOTTOM': 'adc',
      'ADC': 'adc',
      'SUPPORT': 'support',
      'UTILITY': 'support'
    };
    const position = positionMap[role.toUpperCase()] || 'mid';
    
    const config: BrightDataConfig = {
      zone: 'web_unlocker_lol',
      url: `https://mobalytics.gg/lol/champions/${normalizedChampion}/build/${position}`,
      render_js: true,
      timeout: 30000,
      selectors: {
        win_rate: '.win-rate',
        cs_14: '.cs-at-14',
        gold_14: '.gold-at-14',
        items: '.item-build img'
      }
    };
    
    try {
      const response = await this.simulateBrightDataCall(config);
      
      return {
        source: 'mobalytics',
        url: config.url,
        timestamp: new Date().toISOString(),
        data: response,
        success: true
      };
    } catch (error) {
      logger.error('Mobalytics scraping failed', { error });
      return {
        source: 'mobalytics',
        url: config.url,
        timestamp: new Date().toISOString(),
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Simulate BrightData API call (replace with actual implementation)
   */
  private async simulateBrightDataCall(config: BrightDataConfig): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return simulated scraped data
    const roleMultiplier = this.getRoleMultiplier(config.url);
    
    return {
      win_rate: 51 + Math.random() * 3,
      cs_14: Math.round((110 + Math.random() * 10) * roleMultiplier),
      gold_14: Math.round((9000 + Math.random() * 500) * roleMultiplier),
      items: ['Lost Chapter', 'Boots', 'Amplifying Tome'],
      sample_size: Math.round(1000 + Math.random() * 500)
    };
  }
  
  /**
   * Get role multiplier for CS/Gold calculations
   */
  private getRoleMultiplier(url: string): number {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('jungle')) return 0.75;
    if (lowerUrl.includes('support')) return 0.2;
    if (lowerUrl.includes('adc') || lowerUrl.includes('bottom')) return 1.05;
    if (lowerUrl.includes('mid')) return 1.0;
    if (lowerUrl.includes('top')) return 0.95;
    return 1.0;
  }
  
  /**
   * Aggregate benchmarks from multiple sources
   */
  private aggregateBenchmarks(sources: ScrapedData[]): ChampionBenchmark {
    const validSources = sources.filter(s => s.success && s.data);
    
    if (validSources.length === 0) {
      // Return default benchmarks if all sources failed
      return {
        cs_14: 110,
        gold_14: 9000,
        items_14: ['Lost Chapter', 'Boots'],
        win_rate: 50,
        sample_size: 0
      };
    }
    
    // Calculate averages
    const avgCs = Math.round(
      validSources.reduce((sum, s) => sum + (s.data.cs_14 || 0), 0) / validSources.length
    );
    
    const avgGold = Math.round(
      validSources.reduce((sum, s) => sum + (s.data.gold_14 || 0), 0) / validSources.length
    );
    
    const avgWinRate = 
      validSources.reduce((sum, s) => sum + (s.data.win_rate || 0), 0) / validSources.length;
    
    const totalSamples = 
      validSources.reduce((sum, s) => sum + (s.data.sample_size || 0), 0);
    
    // Get most common items
    const items = validSources[0]?.data?.items || ['Lost Chapter', 'Boots'];
    
    return {
      cs_14: avgCs,
      gold_14: avgGold,
      items_14: items,
      win_rate: Math.round(avgWinRate * 10) / 10,
      sample_size: totalSamples
    };
  }
  
  /**
   * Get mock high-rank data for testing
   */
  private getMockHighRankData(champion: string, role: string): ChampionBenchmark {
    const roleData: { [key: string]: { cs: number; gold: number } } = {
      'TOP': { cs: 105, gold: 8800 },
      'JUNGLE': { cs: 85, gold: 8500 },
      'MIDDLE': { cs: 115, gold: 9200 },
      'BOTTOM': { cs: 120, gold: 9500 },
      'SUPPORT': { cs: 25, gold: 6000 }
    };
    
    const data = roleData[role] || { cs: 110, gold: 9000 };
    
    return {
      cs_14: data.cs,
      gold_14: data.gold,
      items_14: this.getMockItems(role),
      win_rate: 52.3,
      sample_size: 1500
    };
  }
  
  /**
   * Get mock items based on role
   */
  private getMockItems(role: string): string[] {
    const itemsByRole: { [key: string]: string[] } = {
      'TOP': ['Doran\'s Shield', 'Bamis Cinder', 'Boots'],
      'JUNGLE': ['Jungle Item', 'Boots', 'Long Sword'],
      'MIDDLE': ['Lost Chapter', 'Boots', 'Amplifying Tome'],
      'BOTTOM': ['Noonquiver', 'Boots', 'Long Sword'],
      'SUPPORT': ['Support Item', 'Boots', 'Ruby Crystal']
    };
    
    return itemsByRole[role] || ['Doran\'s Ring', 'Boots', 'Amplifying Tome'];
  }
  
  /**
   * Scrape current patch notes for meta changes
   */
  async scrapePatchNotes(): Promise<any> {
    try {
      const config: BrightDataConfig = {
        zone: 'web_unlocker_lol',
        url: 'https://www.leagueoflegends.com/en-us/news/game-updates/',
        render_js: true,
        selectors: {
          patch_title: '.patch-notes-header h1',
          champion_changes: '.champion-changes',
          item_changes: '.item-changes'
        }
      };
      
      const response = await this.simulateBrightDataCall(config);
      return response;
    } catch (error) {
      logger.error('Failed to scrape patch notes', { error });
      return null;
    }
  }
}

// Export singleton instance
export const brightDataScraper = new BrightDataScraper();