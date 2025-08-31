import { Router, Request, Response, NextFunction } from 'express';
import { getRiotApi } from '../services/riotApi';
import { ApiError } from '../middleware/errorHandler';
import { riotApiLimiter } from '../middleware/rateLimiter';
import { query } from '../services/database';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting to all summoner routes
router.use(riotApiLimiter);

// Get summoner by name
router.get('/:region/:summonerName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region, summonerName } = req.params;

    if (!region || !summonerName) {
      throw new ApiError(400, 'Region and summoner name are required');
    }

    // Get summoner data
    const summoner = await getRiotApi().getSummonerByName(region, summonerName);
    
    // Get ranked data using PUUID
    const leagueEntries = await getRiotApi().getLeagueEntries(region, summoner.puuid);
    
    // Save to database for tracking
    await saveSummonerToDatabase(summoner, region, leagueEntries);

    // Format response
    const response = {
      success: true,
      data: {
        summoner: {
          id: summoner.id,
          accountId: summoner.accountId,
          puuid: summoner.puuid,
          name: summoner.name,
          profileIconId: summoner.profileIconId,
          summonerLevel: summoner.summonerLevel,
          revisionDate: summoner.revisionDate
        },
        ranked: formatRankedData(leagueEntries),
        region
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get summoner by PUUID
router.get('/by-puuid/:region/:puuid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region, puuid } = req.params;

    if (!region || !puuid) {
      throw new ApiError(400, 'Region and PUUID are required');
    }

    const summoner = await getRiotApi().getSummonerByPuuid(region, puuid);
    const leagueEntries = await getRiotApi().getLeagueEntries(region, puuid);

    res.json({
      success: true,
      data: {
        summoner,
        ranked: formatRankedData(leagueEntries),
        region
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get champion mastery
router.get('/:region/:puuid/mastery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region, puuid } = req.params;
    const { limit = 10 } = req.query;

    const mastery = await getRiotApi().getChampionMastery(region, puuid);
    const topMastery = mastery.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: topMastery
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function formatRankedData(leagueEntries: any[]) {
  const ranked: any = {
    soloQueue: null,
    flexQueue: null
  };

  leagueEntries.forEach(entry => {
    const data = {
      queueType: entry.queueType,
      tier: entry.tier,
      rank: entry.rank,
      leaguePoints: entry.leaguePoints,
      wins: entry.wins,
      losses: entry.losses,
      winRate: Math.round((entry.wins / (entry.wins + entry.losses)) * 100),
      hotStreak: entry.hotStreak,
      veteran: entry.veteran,
      freshBlood: entry.freshBlood,
      inactive: entry.inactive
    };

    if (entry.queueType === 'RANKED_SOLO_5x5') {
      ranked.soloQueue = data;
    } else if (entry.queueType === 'RANKED_FLEX_SR') {
      ranked.flexQueue = data;
    }
  });

  return ranked;
}

async function saveSummonerToDatabase(summoner: any, region: string, leagueEntries: any[]) {
  try {
    // Find solo queue entry for tier/rank
    const soloQueue = leagueEntries.find(e => e.queueType === 'RANKED_SOLO_5x5');
    
    await query(
      `INSERT INTO summoners (puuid, summoner_id, summoner_name, region, tier, rank, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (puuid) 
       DO UPDATE SET 
         summoner_name = $3,
         tier = $5,
         rank = $6,
         last_updated = NOW()`,
      [
        summoner.puuid,
        summoner.id,
        summoner.name,
        region,
        soloQueue?.tier || 'UNRANKED',
        soloQueue?.rank || ''
      ]
    );
  } catch (error) {
    logger.error('Error saving summoner to database:', error);
    // Don't throw - this is not critical for the API response
  }
}

export default router;