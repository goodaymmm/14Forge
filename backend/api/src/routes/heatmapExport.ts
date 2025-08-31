import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Export heatmap data for n8n analysis
 * Returns structured data for specified time range and participant
 */
router.get('/:matchId/export', async (req: Request, res: Response): Promise<any> => {
  try {
    const { matchId } = req.params;
    const { 
      participantId, 
      startTime = 0, 
      endTime = 840 
    } = req.query;
    
    logger.info(`[Heatmap Export] Exporting data for match ${matchId}`, {
      participantId,
      startTime,
      endTime
    });

    // Get position data
    let positionQuery = `
      SELECT 
        participant_id,
        timestamp,
        x_position,
        y_position,
        champion_level,
        total_gold,
        cs
      FROM position_history
      WHERE match_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
    `;
    const positionParams: any[] = [matchId, startTime, endTime];

    if (participantId && participantId !== 'all') {
      positionQuery += ` AND participant_id = $4`;
      positionParams.push(participantId);
    }

    positionQuery += ` ORDER BY timestamp, participant_id`;

    // Get ward events
    let wardQuery = `
      SELECT 
        participant_id,
        timestamp,
        x_position,
        y_position,
        ward_type
      FROM ward_events
      WHERE match_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
    `;
    const wardParams: any[] = [matchId, startTime, endTime];

    if (participantId && participantId !== 'all') {
      wardQuery += ` AND participant_id = $4`;
      wardParams.push(participantId);
    }

    // Get combat events
    let combatQuery = `
      SELECT 
        timestamp,
        x_position,
        y_position,
        killer_id,
        victim_id,
        assisting_participant_ids,
        kill_type
      FROM combat_events
      WHERE match_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
    `;
    const combatParams: any[] = [matchId, startTime, endTime];

    // Execute all queries in parallel
    const [positionResult, wardResult, combatResult] = await Promise.all([
      pool.query(positionQuery, positionParams),
      pool.query(wardQuery, wardParams),
      pool.query(combatQuery, combatParams)
    ]);

    // Calculate statistics
    const stats = calculateStats(positionResult.rows, combatResult.rows, participantId);
    
    // Format movement path (60-second intervals)
    const movementPath = formatMovementPath(positionResult.rows);
    
    // Prepare export data
    const exportData = {
      matchId,
      participantId: participantId || 'all',
      timeRange: {
        start: Number(startTime),
        end: Number(endTime),
        duration: Number(endTime) - Number(startTime)
      },
      positions: {
        count: positionResult.rows.length,
        data: positionResult.rows.map(row => ({
          participantId: row.participant_id,
          timestamp: row.timestamp,
          x: row.x_position,
          y: row.y_position,
          level: row.champion_level,
          gold: row.total_gold,
          cs: row.cs
        }))
      },
      movementPath,
      wards: {
        count: wardResult.rows.length,
        data: wardResult.rows.map(row => ({
          participantId: row.participant_id,
          timestamp: row.timestamp,
          x: row.x_position,
          y: row.y_position,
          type: row.ward_type
        }))
      },
      combat: {
        count: combatResult.rows.length,
        data: combatResult.rows.map(row => ({
          timestamp: row.timestamp,
          x: row.x_position,
          y: row.y_position,
          killerId: row.killer_id,
          victimId: row.victim_id,
          assists: row.assisting_participant_ids,
          type: row.kill_type
        }))
      },
      statistics: stats,
      metadata: {
        exportedAt: new Date().toISOString(),
        dataPoints: positionResult.rows.length + wardResult.rows.length + combatResult.rows.length
      }
    };

    res.json({
      success: true,
      data: exportData
    });
    
    logger.info(`[Heatmap Export] Successfully exported ${exportData.metadata.dataPoints} data points`);
  } catch (error) {
    logger.error('[Heatmap Export] Failed to export data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export heatmap data'
    });
  }
});

/**
 * Calculate statistics from the data
 */
function calculateStats(positions: any[], combat: any[], participantId: any) {
  const stats: any = {
    avgLevel: 0,
    avgGold: 0,
    avgCs: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    uniquePositions: new Set()
  };

  // Calculate position-based stats
  if (positions.length > 0) {
    let totalLevel = 0;
    let totalGold = 0;
    let totalCs = 0;

    positions.forEach(pos => {
      if (!participantId || participantId === 'all' || pos.participant_id == participantId) {
        totalLevel += pos.champion_level || 0;
        totalGold += pos.total_gold || 0;
        totalCs += pos.cs || 0;
        stats.uniquePositions.add(`${Math.floor(pos.x_position / 100)},${Math.floor(pos.y_position / 100)}`);
      }
    });

    const count = participantId && participantId !== 'all' 
      ? positions.filter(p => p.participant_id == participantId).length 
      : positions.length;

    if (count > 0) {
      stats.avgLevel = Math.round(totalLevel / count);
      stats.avgGold = Math.round(totalGold / count);
      stats.avgCs = Math.round(totalCs / count);
    }
  }

  // Calculate combat stats
  if (participantId && participantId !== 'all') {
    combat.forEach(event => {
      if (event.killer_id == participantId) stats.kills++;
      if (event.victim_id == participantId) stats.deaths++;
      if (event.assisting_participant_ids && event.assisting_participant_ids.includes(Number(participantId))) {
        stats.assists++;
      }
    });
  }

  stats.uniquePositions = stats.uniquePositions.size;
  
  return stats;
}

/**
 * Format movement path for visualization
 */
function formatMovementPath(positions: any[]) {
  const pathByParticipant: { [key: number]: any[] } = {};
  
  positions.forEach(pos => {
    if (!pathByParticipant[pos.participant_id]) {
      pathByParticipant[pos.participant_id] = [];
    }
    
    // Only include positions at 60-second intervals
    if (pos.timestamp % 60 === 0) {
      pathByParticipant[pos.participant_id].push({
        timestamp: pos.timestamp,
        x: pos.x_position,
        y: pos.y_position
      });
    }
  });
  
  // Sort each participant's path by timestamp
  Object.keys(pathByParticipant).forEach(key => {
    pathByParticipant[Number(key)].sort((a, b) => a.timestamp - b.timestamp);
  });
  
  return pathByParticipant;
}

export default router;