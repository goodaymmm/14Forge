import { Router, Request, Response } from 'express';
import { timelineAnalysisService } from '../services/timelineAnalysis';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get or generate position heatmap data for a match
 */
router.get('/:matchId/positions', async (req: Request, res: Response): Promise<any> => {
  try {
    const { matchId } = req.params;
    const { participantId, startTime = 0, endTime = 840 } = req.query;
    
    logger.info(`[Heatmap] Positions endpoint called for match ${matchId}`, {
      participantId,
      startTime,
      endTime
    });

    // Check if data exists in database
    const existingData = await pool.query(
      `SELECT COUNT(*) as count FROM position_history WHERE match_id = $1`,
      [matchId]
    );
    
    logger.info(`[Heatmap] Existing data count for match ${matchId}: ${existingData.rows[0].count}`);

    if (Number(existingData.rows[0].count) === 0) {
      // Fetch and store timeline data
      logger.info(`[Heatmap] Fetching timeline data for match ${matchId}`);
      try {
        const timeline = await timelineAnalysisService.getMatchTimeline(matchId);
        logger.info(`[Heatmap] Timeline fetched, frames count: ${timeline?.info?.frames?.length || 0}`);
        
        const positions = timelineAnalysisService.extractPositionData(timeline, Number(endTime) * 1000);
        logger.info(`[Heatmap] Extracted ${positions.length} position records`);
        
        // Bulk insert position data
        if (positions.length > 0) {
        const values = positions.map(p => 
          `('${matchId}', ${p.participantId}, ${p.timestamp}, ${p.position.x}, ${p.position.y}, ${p.level}, ${p.currentGold}, ${p.totalGold}, ${p.cs})`
        ).join(',');
        
        await pool.query(
          `INSERT INTO position_history (match_id, participant_id, timestamp, x_position, y_position, champion_level, current_gold, total_gold, cs) 
           VALUES ${values}
           ON CONFLICT DO NOTHING`
        );
        logger.info(`[Heatmap] Inserted ${positions.length} position records for match ${matchId}`);
      } else {
        logger.warn(`[Heatmap] No positions extracted from timeline for match ${matchId}`);
      }
    } catch (timelineError) {
      logger.error(`[Heatmap] Failed to fetch/process timeline for match ${matchId}:`, timelineError);
      // Continue without timeline data - will return empty heatmap
    }
    }

    // Query position data with optional filters
    let query = `
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
    const params: any[] = [matchId, startTime, endTime];

    if (participantId) {
      query += ` AND participant_id = $4`;
      params.push(participantId);
    }

    query += ` ORDER BY timestamp, participant_id`;

    const result = await pool.query(query, params);

    // Generate heatmap grid
    const heatmapData = generateHeatmapGrid(result.rows);

    res.json({
      success: true,
      data: {
        matchId,
        participantId: participantId || 'all',
        timeRange: { start: startTime, end: endTime },
        positionCount: result.rows.length,
        heatmap: heatmapData,
        rawPositions: result.rows
      }
    });
  } catch (error) {
    logger.error('Failed to get position heatmap:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate position heatmap'
    });
  }
});

/**
 * Get ward placement heatmap
 */
router.get('/:matchId/wards', async (req: Request, res: Response): Promise<any> => {
  try {
    const { matchId } = req.params;
    const { wardType, teamId } = req.query;

    // Check if data exists
    const existingData = await pool.query(
      `SELECT COUNT(*) as count FROM ward_events WHERE match_id = $1`,
      [matchId]
    );

    if (Number(existingData.rows[0].count) === 0) {
      // Fetch and store ward data
      const timeline = await timelineAnalysisService.getMatchTimeline(matchId);
      const wards = timelineAnalysisService.extractWardEvents(timeline);
      
      if (wards.length > 0) {
        const values = wards.map(w => 
          `('${matchId}', ${w.participantId}, ${w.timestamp}, ${w.position.x}, ${w.position.y}, '${w.wardType}')`
        ).join(',');
        
        await pool.query(
          `INSERT INTO ward_events (match_id, participant_id, timestamp, x_position, y_position, ward_type) 
           VALUES ${values}
           ON CONFLICT DO NOTHING`
        );
        logger.info(`Inserted ${wards.length} ward events for match ${matchId}`);
      }
    }

    // Query ward data
    let query = `
      SELECT 
        participant_id,
        timestamp,
        x_position,
        y_position,
        ward_type
      FROM ward_events
      WHERE match_id = $1
        AND timestamp <= 840
    `;
    const params: any[] = [matchId];

    if (wardType) {
      query += ` AND ward_type = $2`;
      params.push(wardType);
    }

    if (teamId) {
      const teamFilter = teamId === '100' ? '<= 5' : '> 5';
      query += ` AND participant_id ${teamFilter}`;
    }

    const result = await pool.query(query, params);

    // Generate ward heatmap
    const wardHeatmap = generateWardHeatmap(result.rows);

    res.json({
      success: true,
      data: {
        matchId,
        wardCount: result.rows.length,
        heatmap: wardHeatmap,
        wardTypes: [...new Set(result.rows.map(r => r.ward_type))],
        rawWards: result.rows
      }
    });
  } catch (error) {
    logger.error('Failed to get ward heatmap:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate ward heatmap'
    });
  }
});

/**
 * Get combat events heatmap
 */
router.get('/:matchId/combat', async (req: Request, res: Response): Promise<any> => {
  try {
    const { matchId } = req.params;
    const { participantId } = req.query;

    // Check if data exists
    const existingData = await pool.query(
      `SELECT COUNT(*) as count FROM combat_events WHERE match_id = $1`,
      [matchId]
    );

    if (Number(existingData.rows[0].count) === 0) {
      // Fetch and store combat data
      const timeline = await timelineAnalysisService.getMatchTimeline(matchId);
      const combat = timelineAnalysisService.extractCombatEvents(timeline);
      
      if (combat.length > 0) {
        const values = combat.map(c => {
          const assists = `{${c.assistingParticipantIds.join(',')}}`;
          const killType = c.killType ? `'${c.killType}'` : 'NULL';
          return `('${matchId}', ${c.timestamp}, ${c.position.x}, ${c.position.y}, ${c.killerId}, ${c.victimId}, '${assists}', ${killType})`;
        }).join(',');
        
        await pool.query(
          `INSERT INTO combat_events (match_id, timestamp, x_position, y_position, killer_id, victim_id, assisting_participant_ids, kill_type) 
           VALUES ${values}
           ON CONFLICT DO NOTHING`
        );
        logger.info(`Inserted ${combat.length} combat events for match ${matchId}`);
      }
    }

    // Query combat data with optional participant filter
    let query = `
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
        AND timestamp <= 840
    `;
    const params: any[] = [matchId];
    
    // Filter by participantId if provided
    if (participantId && participantId !== 'all') {
      query += ` AND (killer_id = $2 OR victim_id = $2 OR $2 = ANY(assisting_participant_ids))`;
      params.push(participantId);
    }
    
    query += ` ORDER BY timestamp`;
    
    const result = await pool.query(query, params);

    // Generate combat heatmap
    const combatHeatmap = generateCombatHeatmap(result.rows);

    res.json({
      success: true,
      data: {
        matchId,
        killCount: result.rows.length,
        heatmap: combatHeatmap,
        timeline: result.rows.map(r => ({
          time: formatTime(r.timestamp),
          killer: r.killer_id,
          victim: r.victim_id,
          position: { x: r.x_position, y: r.y_position }
        }))
      }
    });
  } catch (error) {
    logger.error('Failed to get combat heatmap:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate combat heatmap'
    });
  }
});

/**
 * Generate all heatmaps for a match
 */
router.post('/:matchId/generate', async (req: Request, res: Response): Promise<any> => {
  try {
    const { matchId } = req.params;
    
    logger.info(`Generating all heatmap data for match ${matchId}`);
    
    // Generate all heatmap data
    const heatmapData = await timelineAnalysisService.generateHeatmapData(matchId);
    
    // Store in cache
    await pool.query(
      `INSERT INTO heatmap_cache (match_id, heatmap_type, grid_data, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (match_id) DO UPDATE
       SET grid_data = $3, metadata = $4, created_at = CURRENT_TIMESTAMP`,
      [matchId, 'combined', JSON.stringify(heatmapData.heatmaps), JSON.stringify(heatmapData.rawData)]
    );

    res.json({
      success: true,
      data: heatmapData
    });
  } catch (error) {
    logger.error('Failed to generate heatmaps:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate heatmaps'
    });
  }
});

/**
 * Get aggregated heatmap statistics
 */
router.get('/:matchId/stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const { matchId } = req.params;

    // Get aggregated statistics from views
    const [positionStats, wardStats, combatStats] = await Promise.all([
      pool.query(
        `SELECT 
          participant_id,
          COUNT(DISTINCT CONCAT(grid_x, ',', grid_y)) as unique_positions,
          SUM(density) as total_movements,
          AVG(avg_level) as avg_level,
          AVG(avg_gold) as avg_gold
        FROM position_density
        WHERE match_id = $1
        GROUP BY participant_id`,
        [matchId]
      ),
      pool.query(
        `SELECT 
          ward_type,
          COUNT(*) as ward_count,
          COUNT(DISTINCT CONCAT(grid_x, ',', grid_y)) as unique_locations
        FROM ward_patterns
        WHERE match_id = $1
        GROUP BY ward_type`,
        [matchId]
      ),
      pool.query(
        `SELECT 
          COUNT(*) as total_kills,
          COUNT(DISTINCT CONCAT(grid_x, ',', grid_y)) as kill_zones,
          MAX(kill_count) as max_kills_in_zone
        FROM combat_hotspots
        WHERE match_id = $1`,
        [matchId]
      )
    ]);

    res.json({
      success: true,
      data: {
        matchId,
        positions: positionStats.rows,
        wards: wardStats.rows,
        combat: combatStats.rows[0]
      }
    });
  } catch (error) {
    logger.error('Failed to get heatmap stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get heatmap statistics'
    });
  }
});

// Helper functions

// Actual playable area boundaries
const MAP_MIN = 570;
const MAP_MAX = 14870;
const MAP_RANGE = MAP_MAX - MAP_MIN;

function generateHeatmapGrid(positions: any[], gridSize: number = 50): number[][] {
  const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  let outOfBoundsCount = 0;

  for (const pos of positions) {
    // Debug log for first few positions
    if (positions.indexOf(pos) < 3) {
      logger.info(`[Heatmap Debug] Original position: x=${pos.x_position}, y=${pos.y_position}`);
    }
    
    // Clamp positions to valid range
    const clampedX = Math.max(MAP_MIN, Math.min(MAP_MAX, pos.x_position));
    const clampedY = Math.max(MAP_MIN, Math.min(MAP_MAX, pos.y_position));
    
    // Check if clamping was needed
    if (clampedX !== pos.x_position || clampedY !== pos.y_position) {
      outOfBoundsCount++;
      if (outOfBoundsCount <= 3) {
        logger.warn(`[Heatmap] Position out of bounds: original=(${pos.x_position}, ${pos.y_position}), clamped=(${clampedX}, ${clampedY})`);
      }
    }
    
    // Normalize position to 0-1 range based on actual playable area
    const normalizedX = (clampedX - MAP_MIN) / MAP_RANGE;
    const normalizedY = (clampedY - MAP_MIN) / MAP_RANGE;
    
    // Convert to grid coordinates
    const gridX = Math.floor(normalizedX * gridSize);
    const gridY = Math.floor(normalizedY * gridSize);
    
    // Ensure grid coordinates are within bounds
    const finalX = Math.max(0, Math.min(gridSize - 1, gridX));
    const finalY = Math.max(0, Math.min(gridSize - 1, gridY));
    
    // Important: Riot API uses bottom-left origin (0,0 is bottom-left)
    // Canvas uses top-left origin (0,0 is top-left)
    // So we need to invert the Y coordinate
    grid[gridSize - 1 - finalY][finalX]++;
    
    // Debug log for first few positions
    if (positions.indexOf(pos) < 3) {
      logger.info(`[Heatmap Debug] Grid position: x=${finalX}, y=${gridSize - 1 - finalY} (after Y-axis inversion)`);
    }
  }
  
  if (outOfBoundsCount > 0) {
    logger.warn(`[Heatmap] Total positions out of bounds: ${outOfBoundsCount} / ${positions.length}`);
  }

  return grid;
}

function generateWardHeatmap(wards: any[], gridSize: number = 50): number[][] {
  const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  let outOfBoundsCount = 0;

  for (const ward of wards) {
    // Debug log for first few wards
    if (wards.indexOf(ward) < 3) {
      logger.info(`[Ward Debug] Original position: x=${ward.x_position}, y=${ward.y_position}, type=${ward.ward_type}`);
    }
    
    // Clamp positions to valid range
    const clampedX = Math.max(MAP_MIN, Math.min(MAP_MAX, ward.x_position));
    const clampedY = Math.max(MAP_MIN, Math.min(MAP_MAX, ward.y_position));
    
    // Check if clamping was needed
    if (clampedX !== ward.x_position || clampedY !== ward.y_position) {
      outOfBoundsCount++;
    }
    
    // Normalize position to 0-1 range based on actual playable area
    const normalizedX = (clampedX - MAP_MIN) / MAP_RANGE;
    const normalizedY = (clampedY - MAP_MIN) / MAP_RANGE;
    
    // Convert to grid coordinates
    const gridX = Math.floor(normalizedX * gridSize);
    const gridY = Math.floor(normalizedY * gridSize);
    
    // Ensure grid coordinates are within bounds
    const finalX = Math.max(0, Math.min(gridSize - 1, gridX));
    const finalY = Math.max(0, Math.min(gridSize - 1, gridY));
    
    // Invert Y axis for display (Riot uses bottom-left origin)
    grid[gridSize - 1 - finalY][finalX]++;
  }
  
  if (outOfBoundsCount > 0) {
    logger.warn(`[Ward Heatmap] Positions out of bounds: ${outOfBoundsCount} / ${wards.length}`);
  }

  return grid;
}

function generateCombatHeatmap(combat: any[], gridSize: number = 50): number[][] {
  const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  let outOfBoundsCount = 0;

  for (const event of combat) {
    // Debug log for first few combat events
    if (combat.indexOf(event) < 3) {
      logger.info(`[Combat Debug] Original position: x=${event.x_position}, y=${event.y_position}`);
    }
    
    // Clamp positions to valid range
    const clampedX = Math.max(MAP_MIN, Math.min(MAP_MAX, event.x_position));
    const clampedY = Math.max(MAP_MIN, Math.min(MAP_MAX, event.y_position));
    
    // Check if clamping was needed
    if (clampedX !== event.x_position || clampedY !== event.y_position) {
      outOfBoundsCount++;
      if (outOfBoundsCount <= 3) {
        logger.warn(`[Combat] Position out of bounds: original=(${event.x_position}, ${event.y_position}), clamped=(${clampedX}, ${clampedY})`);
      }
    }
    
    // Normalize position to 0-1 range based on actual playable area
    const normalizedX = (clampedX - MAP_MIN) / MAP_RANGE;
    const normalizedY = (clampedY - MAP_MIN) / MAP_RANGE;
    
    // Convert to grid coordinates
    const gridX = Math.floor(normalizedX * gridSize);
    const gridY = Math.floor(normalizedY * gridSize);
    
    // Ensure grid coordinates are within bounds
    const finalX = Math.max(0, Math.min(gridSize - 1, gridX));
    const finalY = Math.max(0, Math.min(gridSize - 1, gridY));
    
    // Invert Y axis for display (Riot uses bottom-left origin)
    grid[gridSize - 1 - finalY][finalX]++;
  }
  
  if (outOfBoundsCount > 0) {
    logger.warn(`[Combat Heatmap] Positions out of bounds: ${outOfBoundsCount} / ${combat.length}`);
  }

  return grid;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default router;