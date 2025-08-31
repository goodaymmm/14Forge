import { Router, Request, Response, NextFunction } from 'express';
import { fourteenMinAnalysis } from '../services/fourteenMinAnalysis';
import { ApiError } from '../middleware/errorHandler';
import { riotApiLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting
router.use(riotApiLimiter);

// Get 14-minute analysis for a match
router.get('/14min/:region/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region, matchId } = req.params;
    const { force } = req.query;

    if (!region || !matchId) {
      throw new ApiError(400, 'Region and match ID are required');
    }

    const forceRegenerate = force === 'true';
    const analysis = await fourteenMinAnalysis.analyzeMatch(region, matchId, forceRegenerate);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
});

// Batch analyze multiple matches
router.post('/14min/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matches } = req.body;

    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      throw new ApiError(400, 'Matches array is required');
    }

    if (matches.length > 5) {
      throw new ApiError(400, 'Maximum 5 matches can be analyzed at once');
    }

    const results = await Promise.allSettled(
      matches.map(async (match: { region: string; matchId: string }) => {
        return await fourteenMinAnalysis.analyzeMatch(match.region, match.matchId);
      })
    );

    const analyses = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          matchId: matches[index].matchId,
          success: true,
          data: result.value
        };
      } else {
        return {
          matchId: matches[index].matchId,
          success: false,
          error: result.reason.message || 'Analysis failed'
        };
      }
    });

    res.json({
      success: true,
      data: analyses
    });
  } catch (error) {
    next(error);
  }
});

export default router;