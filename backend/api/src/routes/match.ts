import { Router, Request, Response, NextFunction } from 'express';
import { getRiotApi } from '../services/riotApi';
import { ApiError } from '../middleware/errorHandler';
import { riotApiLimiter } from '../middleware/rateLimiter';
import { query } from '../services/database';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting
router.use(riotApiLimiter);

// Get match history
router.get('/:region/:puuid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region, puuid } = req.params;
    const { 
      start = 0, 
      count = 20,
      queue = 420, // Default to ranked solo
      type = 'ranked'
    } = req.query;

    if (!region || !puuid) {
      throw new ApiError(400, 'Region and PUUID are required');
    }

    // Get match IDs
    const matchIds = await getRiotApi().getMatchList(region, puuid, {
      start: parseInt(start as string),
      count: parseInt(count as string),
      queue: queue ? parseInt(queue as string) : undefined,
      type: type as string
    });

    // Get match details for each match (limit to prevent timeout)
    const matches = await Promise.all(
      matchIds.slice(0, 10).map(async (matchId: string) => {
        try {
          const match = await getRiotApi().getMatch(region, matchId);
          await saveMatchToDatabase(match, region);
          return await formatMatchData(match, puuid, region);
        } catch (error) {
          logger.error(`Error fetching match ${matchId}:`, error);
          return null;
        }
      })
    );

    // Filter out failed matches
    const validMatches = matches.filter(m => m !== null);

    res.json({
      success: true,
      data: {
        matches: validMatches,
        total: matchIds.length,
        region,
        puuid
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single match details
router.get('/:region/match/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region, matchId } = req.params;

    if (!region || !matchId) {
      throw new ApiError(400, 'Region and match ID are required');
    }

    const match = await getRiotApi().getMatch(region, matchId);
    await saveMatchToDatabase(match, region);
    
    // Get puuid from query parameter - required for proper formatting
    const puuid = req.query.puuid as string;
    if (!puuid) {
      // Return raw match data if no puuid provided (for backward compatibility)
      res.json({
        success: true,
        data: match
      });
      return;
    }
    const formattedMatch = await formatMatchData(match, puuid, region);

    res.json({
      success: true,
      data: formattedMatch
    });
  } catch (error) {
    next(error);
  }
});

// Get match timeline
router.get('/:region/match/:matchId/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region, matchId } = req.params;

    if (!region || !matchId) {
      throw new ApiError(400, 'Region and match ID are required');
    }

    const timeline = await getRiotApi().getMatchTimeline(region, matchId);

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
async function formatMatchData(match: any, puuid: string, region: string) {
  const matchId = match.metadata.matchId;
  const participant = match.info.participants.find((p: any) => p.puuid === puuid);
  
  if (!participant) {
    return null;
  }
  
  // Debug logging for challenges data
  if (participant.challenges) {
    logger.debug(`[match] Participant has challenges data:`, {
      turretPlatesTaken: participant.challenges.turretPlatesTaken,
      totalHeal: participant.challenges.totalHeal,
      totalDamageShieldedOnTeammates: participant.challenges.totalDamageShieldedOnTeammates,
      totalTimeCCDealt: participant.challenges.totalTimeCCDealt
    });
  } else {
    logger.warn(`[match] No challenges data for participant ${participant.summonerName}`);
  }
  
  // Debug logging for ping data
  logger.debug(`[match] Ping data for ${participant.summonerName}:`, {
    allInPings: participant.allInPings,
    assistMePings: participant.assistMePings,
    dangerPings: participant.dangerPings,
    enemyMissingPings: participant.enemyMissingPings,
    onMyWayPings: participant.onMyWayPings,
    pushPings: participant.pushPings,
    holdPings: participant.holdPings,
    needVisionPings: participant.needVisionPings,
    baitPings: participant.baitPings,
    commandPings: participant.commandPings,
    visionClearedPings: participant.visionClearedPings,
    enemyVisionPings: participant.enemyVisionPings,
    basicPings: participant.basicPings,
    retreatPings: participant.retreatPings,
    getBackPings: participant.getBackPings
  });

  const team = match.info.teams.find((t: any) => t.teamId === participant.teamId);

  // Get rank information for all participants
  const participantRanks: { [key: string]: any } = {};
  
  logger.info(`Starting rank fetch for ${match.info.participants.length} participants in region ${region}`);
  
  // Batch fetch rank data for all participants
  const rankPromises = match.info.participants.map(async (p: any) => {
    try {
      const leagueEntries = await getRiotApi().getLeagueEntries(region, p.puuid);
      const soloQueue = leagueEntries.find((e: any) => e.queueType === 'RANKED_SOLO_5x5');
      if (soloQueue) {
        participantRanks[p.puuid] = {
          tier: soloQueue.tier,
          rank: soloQueue.rank,
          leaguePoints: soloQueue.leaguePoints
        };
      }
    } catch (error: any) {
      logger.error(`Failed to fetch rank for ${p.puuid}:`, {
        error: error.message,
        statusCode: error.response?.status,
        data: error.response?.data,
        puuid: p.puuid,
        region: region
      });
    }
  });

  // Wait for all rank fetches to complete (with timeout)
  await Promise.race([
    Promise.all(rankPromises),
    new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
  ]);
  
  logger.info(`Rank fetch completed. Retrieved ${Object.keys(participantRanks).length} ranks`);

  // Debug log for first participant's combat stats
  const firstParticipant = match.info.participants[0];
  if (firstParticipant) {
    logger.debug('[match] Combat stats location check:', {
      // Direct participant fields
      direct_totalHeal: firstParticipant.totalHeal,
      direct_totalHealsOnTeammates: firstParticipant.totalHealsOnTeammates,
      direct_totalDamageShieldedOnTeammates: firstParticipant.totalDamageShieldedOnTeammates,
      direct_timeCCingOthers: firstParticipant.timeCCingOthers,
      direct_totalTimeCCDealt: firstParticipant.totalTimeCCDealt,
      // Challenges fields
      challenges_totalHeal: firstParticipant.challenges?.totalHeal,
      challenges_totalHealsOnTeammates: firstParticipant.challenges?.totalHealsOnTeammates,
      challenges_totalDamageShieldedOnTeammates: firstParticipant.challenges?.totalDamageShieldedOnTeammates,
      challenges_timeCCingOthers: firstParticipant.challenges?.timeCCingOthers,
      challenges_totalTimeCCDealt: firstParticipant.challenges?.totalTimeCCDealt,
      // Other potential fields
      challenges_turretPlatesTaken: firstParticipant.challenges?.turretPlatesTaken
    });
  }

  // Try to get timeline data for skill order and item timeline
  let timeline: any = null;
  let skillOrderMap: Record<string, string[]> = {};
  let itemTimelineMap: Record<string, any[]> = {};
  
  try {
    timeline = await getRiotApi().getMatchTimeline(region, matchId);
    logger.debug(`[match] Timeline fetched for ${matchId}, has frames: ${!!timeline?.info?.frames}`);
    
    // Extract skill order and item purchases for each participant
    if (timeline && timeline.info && timeline.info.frames) {
      // Initialize skill order tracking
      const participantSkillOrders: Record<number, string[]> = {};
      const participantItemTimelines: Record<number, any[]> = {};
      
      // Process each frame for events
      timeline.info.frames.forEach((frame: any) => {
        if (frame.events) {
          frame.events.forEach((event: any) => {
            // Track skill level-ups
            if (event.type === 'SKILL_LEVEL_UP' && event.participantId) {
              if (!participantSkillOrders[event.participantId]) {
                participantSkillOrders[event.participantId] = [];
              }
              // Map skill slot to letter (1=Q, 2=W, 3=E, 4=R)
              const skillMap: Record<number, string> = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' };
              const skill = skillMap[event.skillSlot];
              if (skill) {
                participantSkillOrders[event.participantId].push(skill);
                logger.debug(`[match] Skill level up: participant ${event.participantId} leveled ${skill} at ${event.timestamp}ms`);
              }
            }
            
            // Track item purchases
            if (event.type === 'ITEM_PURCHASED' && event.participantId) {
              if (!participantItemTimelines[event.participantId]) {
                participantItemTimelines[event.participantId] = [];
              }
              
              // Check if this was after a recall
              const wasRecall = frame.events.some((e: any) => 
                e.type === 'RECALL_FINISHED' && 
                e.participantId === event.participantId &&
                Math.abs(e.timestamp - event.timestamp) < 5000 // Within 5 seconds
              );
              
              participantItemTimelines[event.participantId].push({
                itemId: event.itemId,
                timestamp: event.timestamp,
                minute: Math.floor(event.timestamp / 60000),
                afterRecall: wasRecall
              });
            }
          });
        }
      });
      
      // Map participant IDs to PUUIDs
      match.info.participants.forEach((p: any, index: number) => {
        const participantId = index + 1; // participantId is 1-indexed
        if (participantSkillOrders[participantId]) {
          skillOrderMap[p.puuid] = participantSkillOrders[participantId];
          logger.debug(`[match] Skill order for ${p.summonerName}: ${participantSkillOrders[participantId].join(', ')}`);
        }
        if (participantItemTimelines[participantId]) {
          itemTimelineMap[p.puuid] = participantItemTimelines[participantId];
          logger.debug(`[match] Item timeline for ${p.summonerName}: ${participantItemTimelines[participantId].length} items`);
        }
      });
    }
  } catch (timelineError) {
    logger.warn(`Could not fetch timeline for match ${match.metadata.matchId}:`, timelineError);
    // Continue without timeline data
  }

  // Get detailed info for all participants (for team overview)
  const allParticipants = match.info.participants.map((p: any) => ({
    participantId: p.participantId,  // Add participantId for heatmap functionality
    summonerName: p.summonerName,
    riotIdGameName: p.riotIdGameName || p.summonerName,
    riotIdTagline: p.riotIdTagline || '',
    summonerLevel: p.summonerLevel,
    champLevel: p.champLevel,  // Add champion level
    puuid: p.puuid,
    championName: p.championName,
    championId: p.championId,
    teamId: p.teamId,
    individualPosition: p.individualPosition,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    win: p.win,
    totalDamageDealtToChampions: p.totalDamageDealtToChampions,
    totalDamageTaken: p.totalDamageTaken,
    totalMinionsKilled: p.totalMinionsKilled,
    neutralMinionsKilled: p.neutralMinionsKilled,
    goldEarned: p.goldEarned,  // Added goldEarned
    visionScore: p.visionScore,
    visionWardsBoughtInGame: p.visionWardsBoughtInGame,
    wardsPlaced: p.wardsPlaced,
    wardsKilled: p.wardsKilled,
    summoner1Id: p.summoner1Id,
    summoner2Id: p.summoner2Id,
    perks: p.perks,
    item0: p.item0,
    item1: p.item1,
    item2: p.item2,
    item3: p.item3,
    item4: p.item4,
    item5: p.item5,
    item6: p.item6,
    // Add skill order and item timeline from timeline data
    skillOrder: skillOrderMap[p.puuid] || [],
    itemTimeline: itemTimelineMap[p.puuid] || [],
    // Add challenges data for epic monsters and combat stats
    challenges: p.challenges ? {
      turretPlatesTaken: p.challenges.turretPlatesTaken || 0,
      epicMonsterKillsNearEnemyJungler: p.challenges.epicMonsterKillsNearEnemyJungler || 0,
      epicMonsterSteals: p.challenges.epicMonsterSteals || 0,
      // Combat stats with fallback to direct participant fields
      totalHeal: p.totalHeal || p.challenges.totalHeal || 0,
      totalDamageShieldedOnTeammates: p.totalDamageShieldedOnTeammates || p.challenges.totalDamageShieldedOnTeammates || 0,
      totalTimeCCDealt: p.totalTimeCCDealt || p.challenges.totalTimeCCDealt || 0,
      enemyJungleMonsterKills: p.challenges.enemyJungleMonsterKills || 0,
      alliedJungleMonsterKills: p.challenges.alliedJungleMonsterKills || 0,
      // Add void grubs specific field
      voidMonsterKill: p.challenges.voidMonsterKill || 0,
      // Add additional combat stats fields with fallback
      totalHealsOnTeammates: p.totalHealsOnTeammates || p.challenges?.totalHealsOnTeammates || 0,
      damageSelfMitigated: p.damageSelfMitigated || p.challenges?.damageSelfMitigated || 0,
      timeCCingOthers: p.timeCCingOthers || p.challenges?.timeCCingOthers || 0,
      // Add objective participation fields
      takedowns: p.challenges.takedowns || 0,
      teamDamagePercentage: p.challenges.teamDamagePercentage || 0,
      killParticipation: p.challenges.killParticipation || 0,
      objectivesStolen: p.challenges.objectivesStolen || 0,
      dragonTakedowns: p.challenges.dragonTakedowns || 0,
      baronTakedowns: p.challenges.baronTakedowns || 0,
      riftHeraldTakedowns: p.challenges.riftHeraldTakedowns || 0
    } : null,
    // Add combat stats directly on participant (outside challenges)
    totalHealsOnTeammates: p.totalHealsOnTeammates || 0,
    totalDamageShieldedOnTeammates: p.totalDamageShieldedOnTeammates || 0,
    timeCCingOthers: p.timeCCingOthers || 0,
    // Add ping statistics
    allInPings: p.allInPings || 0,
    assistMePings: p.assistMePings || 0,
    commandPings: p.commandPings || 0,
    holdPings: p.holdPings || 0,
    needVisionPings: p.needVisionPings || 0,
    pushPings: p.pushPings || 0,
    visionClearedPings: p.visionClearedPings || 0,
    baitPings: p.baitPings || 0,
    dangerPings: p.dangerPings || 0,
    enemyMissingPings: p.enemyMissingPings || 0,
    enemyVisionPings: p.enemyVisionPings || 0,
    onMyWayPings: p.onMyWayPings || 0,
    // Additional ping types
    getBackPings: p.getBackPings || 0,
    retreatPings: p.retreatPings || 0,
    basicPings: p.basicPings || 0,
    // Add rank information if available
    rankedInfo: participantRanks[p.puuid] || null
  }));

  return {
    matchId: match.metadata.matchId,
    gameCreation: match.info.gameCreation,
    gameDuration: match.info.gameDuration,
    gameMode: match.info.gameMode,
    gameType: match.info.gameType,
    gameVersion: match.info.gameVersion,  // Added gameVersion
    queueId: match.info.queueId,
    teams: match.info.teams,  // Added teams data for objectives
    allParticipants,
    participant: {
      championId: participant.championId,
      championName: participant.championName,
      summonerName: participant.summonerName,
      teamPosition: participant.teamPosition,
      individualPosition: participant.individualPosition,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      kda: participant.deaths === 0 
        ? participant.kills + participant.assists 
        : ((participant.kills + participant.assists) / participant.deaths).toFixed(2),
      totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
      totalDamageTaken: participant.totalDamageTaken,
      goldEarned: participant.goldEarned,
      totalMinionsKilled: participant.totalMinionsKilled,
      neutralMinionsKilled: participant.neutralMinionsKilled,
      champLevel: participant.champLevel,
      visionScore: participant.visionScore,
      // Individual item fields for compatibility
      item0: participant.item0,
      item1: participant.item1,
      item2: participant.item2,
      item3: participant.item3,
      item4: participant.item4,
      item5: participant.item5,
      item6: participant.item6,
      // Also provide as array for convenience
      items: [
        participant.item0,
        participant.item1,
        participant.item2,
        participant.item3,
        participant.item4,
        participant.item5,
        participant.item6
      ],
      perks: participant.perks,
      summoner1Id: participant.summoner1Id,
      summoner2Id: participant.summoner2Id,
      // Add skill order and item timeline for the main participant
      skillOrder: skillOrderMap[participant.puuid] || [],
      itemTimeline: itemTimelineMap[participant.puuid] || [],
      // Add challenges data
      challenges: participant.challenges ? {
        turretPlatesTaken: participant.challenges.turretPlatesTaken || 0,
        epicMonsterKillsNearEnemyJungler: participant.challenges.epicMonsterKillsNearEnemyJungler || 0,
        epicMonsterSteals: participant.challenges.epicMonsterSteals || 0,
        totalHeal: participant.challenges.totalHeal || 0,
        totalDamageShieldedOnTeammates: participant.challenges.totalDamageShieldedOnTeammates || 0,
        totalTimeCCDealt: participant.challenges.totalTimeCCDealt || 0,
        enemyJungleMonsterKills: participant.challenges.enemyJungleMonsterKills || 0,
        alliedJungleMonsterKills: participant.challenges.alliedJungleMonsterKills || 0
      } : null,
      // Add individual combat stats
      totalHealsOnTeammates: participant.totalHealsOnTeammates || 0,
      totalDamageShieldedOnTeammates: participant.totalDamageShieldedOnTeammates || 0,
      timeCCingOthers: participant.timeCCingOthers || 0,
      // Add ping statistics
      allInPings: participant.allInPings || 0,
      assistMePings: participant.assistMePings || 0,
      commandPings: participant.commandPings || 0,
      holdPings: participant.holdPings || 0,
      needVisionPings: participant.needVisionPings || 0,
      pushPings: participant.pushPings || 0,
      visionClearedPings: participant.visionClearedPings || 0,
      baitPings: participant.baitPings || 0,
      dangerPings: participant.dangerPings || 0,
      enemyMissingPings: participant.enemyMissingPings || 0,
      enemyVisionPings: participant.enemyVisionPings || 0,
      onMyWayPings: participant.onMyWayPings || 0,
      // Additional ping types
      getBackPings: participant.getBackPings || 0,
      retreatPings: participant.retreatPings || 0,
      basicPings: participant.basicPings || 0
    },
    win: participant.win,
    teamStats: team ? {
      teamId: team.teamId,
      win: team.win,
      firstBlood: team.objectives.champion.first,
      firstTower: team.objectives.tower.first,
      firstDragon: team.objectives.dragon.first,
      dragonKills: team.objectives.dragon.kills,
      baronKills: team.objectives.baron.kills,
      towerKills: team.objectives.tower.kills,
      inhibitorKills: team.objectives.inhibitor.kills
    } : null
  };
}

async function saveMatchToDatabase(match: any, region: string) {
  try {
    await query(
      `INSERT INTO matches (match_id, region, queue_id, game_version, game_duration, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (match_id) DO NOTHING`,
      [
        match.metadata.matchId,
        region,
        match.info.queueId,
        match.info.gameVersion,
        match.info.gameDuration
      ]
    );
  } catch (error) {
    logger.error('Error saving match to database:', error);
  }
}

export default router;