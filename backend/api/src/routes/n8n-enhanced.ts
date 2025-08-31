import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { multiSourceScraper } from '../services/multiSourceScraper';
import { proGuideScraper } from '../services/proGuideScraper';
import { fourteenMinAnalysis } from '../services/fourteenMinAnalysis';
import NodeCache from 'node-cache';

const router = Router();
const analysisCache = new NodeCache({ stdTTL: 21600 }); // 6 hour cache

/**
 * Enhanced 14 Coacher webhook with multi-source data
 */
router.post('/webhook/enhanced-14coacher', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      summonerName,
      region,
      matchId,
      champion,
      role,
      includeGuides = true,
      includeMetaComparison = true
    } = req.body;

    logger.info('Enhanced 14 Coacher webhook triggered', {
      summonerName,
      matchId,
      champion,
      includeGuides,
      includeMetaComparison
    });

    // Generate unique cache key
    const cacheKey = `enhanced_${matchId}_${champion}_${region}`;
    
    // Check cache first
    const cached = analysisCache.get(cacheKey);
    if (cached) {
      logger.info('Returning cached enhanced analysis', { cacheKey });
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // Parallel data fetching
    const promises: Promise<any>[] = [];

    // 1. Get 14-minute analysis
    promises.push(fourteenMinAnalysis.analyzeMatch(matchId, region));

    // 2. Get coaching guides if requested
    if (includeGuides) {
      promises.push(proGuideScraper.scrapeCoachingGuides(champion, role));
    }

    // 3. Get meta comparison if requested
    if (includeMetaComparison) {
      promises.push(multiSourceScraper.scrapeMultipleSources(champion, ['kr', 'na', 'euw']));
    }

    const results = await Promise.allSettled(promises);

    const analysisResult = results[0].status === 'fulfilled' 
      ? (results[0] as PromiseFulfilledResult<any>).value 
      : null;

    const guides = includeGuides && results[1]?.status === 'fulfilled'
      ? (results[1] as PromiseFulfilledResult<any>).value
      : [];

    const metaComparison = includeMetaComparison && results[2]?.status === 'fulfilled'
      ? (results[2] as PromiseFulfilledResult<any>).value
      : null;

    // Combine all data
    const enhancedAnalysis = {
      matchId,
      summonerName,
      champion,
      region,
      role,
      fourteenMinAnalysis: analysisResult,
      coachingGuides: guides,
      metaComparison,
      insights: generateInsights(analysisResult, guides, metaComparison),
      timestamp: new Date()
    };

    // Cache the result
    analysisCache.set(cacheKey, enhancedAnalysis);

    return res.json({
      success: true,
      data: enhancedAnalysis,
      cached: false
    });
  } catch (error) {
    logger.error('Enhanced 14 Coacher webhook failed', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate enhanced analysis'
    });
  }
});

/**
 * Multi-region parallel analysis
 */
router.post('/webhook/multi-region-analysis', async (req: Request, res: Response): Promise<any> => {
  try {
    const { champion, regions = ['kr', 'na', 'euw'] } = req.body;

    logger.info('Multi-region analysis triggered', { champion, regions });

    // Parallel scraping for all regions
    const scrapingPromises = regions.map(async (region: string) => {
      const comparison = await multiSourceScraper.scrapeMultipleSources(
        champion,
        [region]
      );
      return { region, data: comparison };
    });

    const results = await Promise.allSettled(scrapingPromises);

    const successfulResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value);

    // Generate cross-region insights
    const insights = generateCrossRegionInsights(successfulResults);

    return res.json({
      success: true,
      data: {
        champion,
        regions: successfulResults,
        insights,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Multi-region analysis failed', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform multi-region analysis'
    });
  }
});

/**
 * Batch champion analysis
 */
router.post('/webhook/batch-analysis', async (req: Request, res: Response): Promise<any> => {
  try {
    const { champions, region = 'kr' } = req.body;

    if (!champions || !Array.isArray(champions)) {
      return res.status(400).json({
        success: false,
        error: 'Champions array is required'
      });
    }

    logger.info('Batch analysis triggered', { 
      champions: champions.length, 
      region 
    });

    const analysisPromises = champions.map(async (champion: string) => {
      const [metaData, guides] = await Promise.all([
        multiSourceScraper.scrapeMultipleSources(champion, [region]),
        proGuideScraper.scrapeCoachingGuides(champion)
      ]);

      return {
        champion,
        metaData,
        guides
      };
    });

    const results = await Promise.all(analysisPromises);

    return res.json({
      success: true,
      data: results,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Batch analysis failed', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform batch analysis'
    });
  }
});

/**
 * Generate insights from combined data
 */
function generateInsights(
  analysis: any,
  guides: any[],
  metaComparison: any
): string[] {
  const insights: string[] = [];

  // Analysis-based insights
  if (analysis) {
    if (analysis.goldDiff > 2000) {
      insights.push('Strong gold lead at 14 minutes - push for objectives');
    } else if (analysis.goldDiff < -2000) {
      insights.push('Behind in gold - focus on farming and avoiding fights');
    }
  }

  // Meta-based insights
  if (metaComparison) {
    if (metaComparison.variance.winRate > 5) {
      insights.push('High variance in win rates across regions - adapt to local meta');
    }

    if (metaComparison.kr?.winRate && metaComparison.kr.winRate > 52) {
      insights.push('Champion performing well in Korean meta - study KR builds');
    }
  }

  // Guide-based insights
  if (guides && guides.length > 0) {
    const hasHardMatchups = guides.some(g => 
      g.matchups?.some((m: any) => m.difficulty === 'hard')
    );
    
    if (hasHardMatchups) {
      insights.push('Difficult matchups detected - review counter strategies');
    }
  }

  return insights;
}

/**
 * Generate cross-region insights
 */
function generateCrossRegionInsights(regionData: any[]): string[] {
  const insights: string[] = [];

  // Find common trends
  const winRates = regionData
    .map(r => r.data?.winRate)
    .filter(Boolean);

  if (winRates.length > 0) {
    const avgWinRate = winRates.reduce((a, b) => a + b, 0) / winRates.length;
    
    if (avgWinRate > 52) {
      insights.push('Champion is strong across all regions');
    } else if (avgWinRate < 48) {
      insights.push('Champion is underperforming globally');
    }

    // Find outliers
    regionData.forEach(r => {
      if (r.data?.winRate && Math.abs(r.data.winRate - avgWinRate) > 3) {
        insights.push(`${r.region.toUpperCase()} shows significant deviation from global average`);
      }
    });
  }

  return insights;
}

export default router;