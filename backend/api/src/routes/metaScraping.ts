import { Router, Request, Response } from 'express';
import { multiSourceScraper } from '../services/multiSourceScraper';
import { proGuideScraper } from '../services/proGuideScraper';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * Get multi-region meta comparison for a champion
 */
router.get('/champion/:champion/comparison', async (req: Request, res: Response): Promise<any> => {
  try {
    const { champion } = req.params;
    const { regions } = req.query;
    
    const regionList = regions 
      ? (regions as string).split(',')
      : ['kr', 'na', 'euw'];

    logger.info('Fetching multi-region comparison', { champion, regions: regionList });

    const comparison = await multiSourceScraper.scrapeMultipleSources(
      champion,
      regionList
    );

    return res.json({
      success: true,
      data: comparison,
      timestamp: new Date(),
      cacheTTL: 3600
    });
  } catch (error) {
    logger.error('Failed to get meta comparison', error);
    throw new ApiError('Failed to fetch meta comparison', 500);
  }
});

/**
 * Get coaching guides for a champion
 */
router.get('/champion/:champion/guides', async (req: Request, res: Response): Promise<any> => {
  try {
    const { champion } = req.params;
    const { role } = req.query;

    logger.info('Fetching coaching guides', { champion, role });

    const guides = await proGuideScraper.scrapeCoachingGuides(
      champion,
      role as string | undefined
    );

    return res.json({
      success: true,
      data: guides,
      timestamp: new Date(),
      cacheTTL: 21600
    });
  } catch (error) {
    logger.error('Failed to get coaching guides', error);
    throw new ApiError('Failed to fetch coaching guides', 500);
  }
});

/**
 * Get high-rank position data for heatmap generation
 */
router.get('/champion/:champion/positions', async (req: Request, res: Response): Promise<any> => {
  try {
    const { champion } = req.params;
    const { region = 'kr', limit = 10 } = req.query;

    logger.info('Fetching high-rank positions', { champion, region, limit });

    const positions = await multiSourceScraper.getHighRankPositions(
      region as string,
      champion,
      parseInt(limit as string)
    );

    return res.json({
      success: true,
      data: positions,
      timestamp: new Date(),
      cacheTTL: 3600
    });
  } catch (error) {
    logger.error('Failed to get position data', error);
    throw new ApiError('Failed to fetch position data', 500);
  }
});

/**
 * Batch scrape multiple champions
 */
router.post('/batch/comparison', async (req: Request, res: Response): Promise<any> => {
  try {
    const { champions, regions = ['kr', 'na', 'euw'] } = req.body;

    if (!champions || !Array.isArray(champions)) {
      throw new ApiError('Champions array is required', 400);
    }

    logger.info('Batch scraping meta comparison', { 
      champions: champions.length, 
      regions 
    });

    const comparisons = await Promise.all(
      champions.map(champion => 
        multiSourceScraper.scrapeMultipleSources(champion, regions)
      )
    );

    return res.json({
      success: true,
      data: comparisons,
      timestamp: new Date(),
      cacheTTL: 3600
    });
  } catch (error) {
    logger.error('Failed to batch scrape', error);
    throw new ApiError('Failed to batch scrape meta data', 500);
  }
});

/**
 * Get meta trends across regions
 */
router.get('/trends', async (req: Request, res: Response): Promise<any> => {
  try {
    const { tier = 'challenger', role } = req.query;

    logger.info('Fetching meta trends', { tier, role });

    // This would fetch trending champions across regions
    // For now, return mock data structure
    const trends = {
      rising: [],
      falling: [],
      stable: [],
      regional_differences: {
        kr_exclusive: [],
        na_exclusive: [],
        eu_exclusive: []
      }
    };

    return res.json({
      success: true,
      data: trends,
      timestamp: new Date(),
      cacheTTL: 1800
    });
  } catch (error) {
    logger.error('Failed to get meta trends', error);
    throw new ApiError('Failed to fetch meta trends', 500);
  }
});

export default router;