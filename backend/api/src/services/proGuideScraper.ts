import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';
import NodeCache from 'node-cache';

export interface CoachingGuide {
  champion: string;
  role: string;
  matchups: MatchupGuide[];
  lanePhase: LanePhaseGuide;
  teamfighting: TeamfightGuide;
  builds: BuildGuide[];
  tips: string[];
  source: string;
  timestamp: Date;
}

export interface MatchupGuide {
  against: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tips: string[];
  keyPoints: string[];
  winCondition: string;
}

export interface LanePhaseGuide {
  levels1to3: string[];
  levels4to6: string[];
  levels7to9: string[];
  waveManagement: string[];
  tradingPatterns: string[];
  recallTimings: string[];
}

export interface TeamfightGuide {
  role: string;
  positioning: string[];
  targetPriority: string[];
  combos: string[];
}

export interface BuildGuide {
  situation: string;
  coreItems: string[];
  boots: string;
  situationalItems: string[];
  reasoning: string;
}

class ProGuideScraper {
  private cache: NodeCache;
  private brightDataConfig: any;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 21600, // 6 hours cache for guides
      checkperiod: 3600
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
   * Scrape coaching guides from multiple sources
   */
  async scrapeCoachingGuides(
    champion: string,
    role?: string
  ): Promise<CoachingGuide[]> {
    const cacheKey = `guide_${champion}_${role || 'all'}`;
    const cached = this.cache.get<CoachingGuide[]>(cacheKey);
    
    if (cached) {
      logger.info('Returning cached coaching guides', { champion, role });
      return cached;
    }

    const sources = [
      {
        name: 'mobalytics',
        url: `https://mobalytics.gg/lol/champions/${champion.toLowerCase()}/guide`
      },
      {
        name: 'proguides',
        url: `https://www.proguides.com/lol/champions/${champion.toLowerCase()}`
      },
      {
        name: 'mobafire',
        url: `https://www.mobafire.com/league-of-legends/champion/${champion.toLowerCase()}`
      }
    ];

    const guidePromises = sources.map(source => 
      this.scrapeGuideFromSource(source, champion, role)
    );

    const results = await Promise.allSettled(guidePromises);
    
    const guides = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<CoachingGuide>).value)
      .filter(Boolean);

    this.cache.set(cacheKey, guides);
    return guides;
  }

  /**
   * Scrape guide from a specific source
   */
  private async scrapeGuideFromSource(
    source: { name: string; url: string },
    champion: string,
    role?: string
  ): Promise<CoachingGuide | null> {
    try {
      const response = await this.fetchWithBrightData(source.url);
      
      if (!response) {
        return null;
      }

      const $ = cheerio.load(response);
      
      // Parse based on source
      switch (source.name) {
        case 'mobalytics':
          return this.parseMobalyticsGuide($, champion, role);
        case 'proguides':
          return this.parseProGuidesGuide($, champion, role);
        case 'mobafire':
          return this.parseMobafireGuide($, champion, role);
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Failed to scrape guide from ${source.name}`, error);
      return null;
    }
  }

  /**
   * Fetch content using BrightData
   */
  private async fetchWithBrightData(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
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

      return response.data;
    } catch (error) {
      logger.error('BrightData fetch failed', { url, error });
      return null;
    }
  }

  /**
   * Parse Mobalytics guide
   */
  private parseMobalyticsGuide(
    $: cheerio.CheerioAPI,
    champion: string,
    role?: string
  ): CoachingGuide {
    const guide: CoachingGuide = {
      champion,
      role: role || this.extractRole($),
      matchups: this.extractMobalyticsMatchups($),
      lanePhase: this.extractMobalyticsLanePhase($),
      teamfighting: this.extractMobalyticsTeamfighting($),
      builds: this.extractMobalyticsBuilds($),
      tips: this.extractMobalyticsTips($),
      source: 'mobalytics',
      timestamp: new Date()
    };

    return guide;
  }

  /**
   * Parse ProGuides guide
   */
  private parseProGuidesGuide(
    $: cheerio.CheerioAPI,
    champion: string,
    role?: string
  ): CoachingGuide {
    const guide: CoachingGuide = {
      champion,
      role: role || this.extractRole($),
      matchups: this.extractProGuidesMatchups($),
      lanePhase: this.extractProGuidesLanePhase($),
      teamfighting: this.extractProGuidesTeamfighting($),
      builds: this.extractProGuidesBuilds($),
      tips: this.extractProGuidesTips($),
      source: 'proguides',
      timestamp: new Date()
    };

    return guide;
  }

  /**
   * Parse Mobafire guide
   */
  private parseMobafireGuide(
    $: cheerio.CheerioAPI,
    champion: string,
    role?: string
  ): CoachingGuide {
    const guide: CoachingGuide = {
      champion,
      role: role || this.extractRole($),
      matchups: [],
      lanePhase: this.extractMobafireLanePhase($),
      teamfighting: this.extractMobafireTeamfighting($),
      builds: this.extractMobafireBuilds($),
      tips: this.extractMobafireTips($),
      source: 'mobafire',
      timestamp: new Date()
    };

    return guide;
  }

  /**
   * Extract role from page
   */
  private extractRole($: cheerio.CheerioAPI): string {
    // Look for role indicators in various places
    const roleText = $('.role, .position, [data-role]').first().text();
    return roleText || 'mid';
  }

  /**
   * Extract Mobalytics matchups
   */
  private extractMobalyticsMatchups($: cheerio.CheerioAPI): MatchupGuide[] {
    const matchups: MatchupGuide[] = [];
    
    $('.matchup-item, .counter-champion').each((_, elem) => {
      const $elem = $(elem);
      const championName = $elem.find('.champion-name').text();
      const difficulty = $elem.find('.difficulty').text().toLowerCase() as any;
      const tips = $elem.find('.tip').map((_, tip) => $(tip).text()).get();
      
      if (championName) {
        matchups.push({
          against: championName,
          difficulty: difficulty || 'medium',
          tips,
          keyPoints: [],
          winCondition: ''
        });
      }
    });

    return matchups;
  }

  /**
   * Extract Mobalytics lane phase guide
   */
  private extractMobalyticsLanePhase($: cheerio.CheerioAPI): LanePhaseGuide {
    return {
      levels1to3: this.extractTextArray($, '.early-game .tips'),
      levels4to6: this.extractTextArray($, '.mid-game .tips'),
      levels7to9: this.extractTextArray($, '.late-laning .tips'),
      waveManagement: this.extractTextArray($, '.wave-management .tips'),
      tradingPatterns: this.extractTextArray($, '.trading .tips'),
      recallTimings: this.extractTextArray($, '.recall-timing .tips')
    };
  }

  /**
   * Extract Mobalytics teamfighting guide
   */
  private extractMobalyticsTeamfighting($: cheerio.CheerioAPI): TeamfightGuide {
    return {
      role: $('.teamfight-role').text() || 'damage dealer',
      positioning: this.extractTextArray($, '.positioning .tips'),
      targetPriority: this.extractTextArray($, '.target-priority .tips'),
      combos: this.extractTextArray($, '.combos .combo')
    };
  }

  /**
   * Extract Mobalytics builds
   */
  private extractMobalyticsBuilds($: cheerio.CheerioAPI): BuildGuide[] {
    const builds: BuildGuide[] = [];
    
    $('.build-path').each((_, elem) => {
      const $elem = $(elem);
      builds.push({
        situation: $elem.find('.situation').text() || 'standard',
        coreItems: this.extractTextArray($elem, '.core-item'),
        boots: $elem.find('.boots').text(),
        situationalItems: this.extractTextArray($elem, '.situational-item'),
        reasoning: $elem.find('.reasoning').text()
      });
    });

    return builds;
  }

  /**
   * Extract Mobalytics tips
   */
  private extractMobalyticsTips($: cheerio.CheerioAPI): string[] {
    return this.extractTextArray($, '.pro-tip, .tip-content');
  }

  /**
   * Similar extraction methods for ProGuides...
   */
  private extractProGuidesMatchups($: cheerio.CheerioAPI): MatchupGuide[] {
    // Simplified implementation
    return [];
  }

  private extractProGuidesLanePhase($: cheerio.CheerioAPI): LanePhaseGuide {
    return {
      levels1to3: [],
      levels4to6: [],
      levels7to9: [],
      waveManagement: [],
      tradingPatterns: [],
      recallTimings: []
    };
  }

  private extractProGuidesTeamfighting($: cheerio.CheerioAPI): TeamfightGuide {
    return {
      role: 'damage dealer',
      positioning: [],
      targetPriority: [],
      combos: []
    };
  }

  private extractProGuidesBuilds($: cheerio.CheerioAPI): BuildGuide[] {
    return [];
  }

  private extractProGuidesTips($: cheerio.CheerioAPI): string[] {
    return [];
  }

  /**
   * Similar extraction methods for Mobafire...
   */
  private extractMobafireLanePhase($: cheerio.CheerioAPI): LanePhaseGuide {
    return {
      levels1to3: [],
      levels4to6: [],
      levels7to9: [],
      waveManagement: [],
      tradingPatterns: [],
      recallTimings: []
    };
  }

  private extractMobafireTeamfighting($: cheerio.CheerioAPI): TeamfightGuide {
    return {
      role: 'damage dealer',
      positioning: [],
      targetPriority: [],
      combos: []
    };
  }

  private extractMobafireBuilds($: cheerio.CheerioAPI): BuildGuide[] {
    return [];
  }

  private extractMobafireTips($: cheerio.CheerioAPI): string[] {
    return [];
  }

  /**
   * Helper to extract text array from elements
   */
  private extractTextArray(
    $: cheerio.CheerioAPI | cheerio.Cheerio<any>,
    selector: string
  ): string[] {
    const results: string[] = [];
    $(selector).each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) {
        results.push(text);
      }
    });
    return results;
  }
}

export const proGuideScraper = new ProGuideScraper();