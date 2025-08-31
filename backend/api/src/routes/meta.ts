import { Router, Request, Response, NextFunction } from 'express';
import { getRiotApi } from '../services/riotApi';
import { query } from '../services/database';
// import { ApiError } from '../middleware/errorHandler'; // TODO: Phase 2 - Will be used for BrightData error handling

const router = Router();

// Get current meta statistics
router.get('/:region', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region } = req.params;
    
    // For now, return placeholder data
    // This will be populated by BrightData integration in Phase 2
    const metaData = {
      region,
      lastUpdated: new Date().toISOString(),
      topChampions: [],
      tierList: {
        S: [],
        A: [],
        B: [],
        C: [],
        D: []
      },
      trends: [],
      patch: await getRiotApi().getLatestVersion()
    };

    res.json({
      success: true,
      data: metaData
    });
  } catch (error) {
    next(error);
  }
});

// Get champion statistics
router.get('/:region/champions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region } = req.params;
    const { role } = req.query;
    
    // TODO: Phase 2 - Use region and role to filter champion statistics
    // region will be used to get region-specific win rates
    // role will filter champions by their primary role (TOP, JUNGLE, MID, ADC, SUPPORT)
    console.log(`Future implementation: Filter by region=${region}, role=${role}`);

    const champions = await getRiotApi().getChampions();
    
    // Format champion data
    const championList = Object.values(champions.data).map((champ: any) => ({
      id: champ.id,
      key: champ.key,
      name: champ.name,
      title: champ.title,
      tags: champ.tags,
      stats: champ.stats
    }));

    res.json({
      success: true,
      data: {
        champions: championList,
        total: championList.length,
        version: champions.version
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get trending topics (placeholder for BrightData integration)
router.get('/trends/current', async (_req: Request, res: Response, next: NextFunction) => {
  // TODO: Future - req will be used for pagination and filtering parameters
  try {
    const trends = await query(
      `SELECT * FROM trending_topics 
       WHERE timestamp > NOW() - INTERVAL '24 hours'
       ORDER BY trend_score DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: trends.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;