import { Router, Request, Response } from 'express';
import { query } from '../services/database';
import { logger } from '../utils/logger';
import axios from 'axios';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// Get current patch version
router.get('/current-patch', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'current-patch-v2'; // Changed to force cache miss
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let patchVersion: string | null = null;

    // Check database first
    try {
      const dbResult = await query(
        'SELECT patch_version FROM patch_versions WHERE is_current = true LIMIT 1'
      );

      if (dbResult.rows.length > 0) {
        patchVersion = dbResult.rows[0].patch_version;
        logger.info(`Current patch from database: ${patchVersion}`);
      }
    } catch (dbError) {
      logger.warn('Database query failed for patch_versions:', dbError);
    }

    // Fallback to Riot API if no database result
    if (!patchVersion) {
      try {
        logger.info('Fetching current patch from Riot API...');
        const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json', {
          timeout: 5000
        });
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          patchVersion = response.data[0];
          logger.info(`Current patch from Riot API: ${patchVersion}`);
        }
      } catch (apiError: any) {
        logger.error('Riot API request failed:', {
          message: apiError.message,
          code: apiError.code,
          response: apiError.response?.status
        });
      }
    }

    // Use a default version as last resort
    if (!patchVersion) {
      patchVersion = '14.23.1'; // Default fallback version
      logger.warn(`Using default patch version: ${patchVersion}`);
    }
    
    const result = { version: patchVersion };
    cache.set(cacheKey, result, 300); // Cache for 5 minutes
    
    res.json(result);
  } catch (error: any) {
    logger.error('Unexpected error in current-patch endpoint:', {
      message: error.message,
      stack: error.stack
    });
    
    // Return a default version even on error to allow workflow to continue
    res.json({ version: '14.23.1' });
  }
});

// Get static data (champions, items, or runes)
router.get('/static/:dataType/:language?', async (req: Request, res: Response) => {
  try {
    const { dataType } = req.params;
    const language = req.params.language || 'ja_JP';
    
    // Validate data type
    if (!['champions', 'items', 'runes'].includes(dataType)) {
      return res.status(400).json({ error: 'Invalid data type' });
    }

    const cacheKey = `static-${dataType}-${language}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get current patch version
    let patchVersion: string;
    try {
      const patchResult = await query(
        'SELECT patch_version FROM patch_versions WHERE is_current = true LIMIT 1'
      );
      
      if (patchResult.rows.length > 0) {
        patchVersion = patchResult.rows[0].patch_version;
        logger.info(`Using patch version from database: ${patchVersion}`);
      } else {
        // Fallback to latest from Riot
        logger.info('No patch version in database, fetching from Riot API...');
        const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json', {
          timeout: 5000
        });
        patchVersion = versionsResponse.data[0];
        logger.info(`Using patch version from Riot API: ${patchVersion}`);
      }
    } catch (patchError: any) {
      logger.error('Error getting patch version:', {
        message: patchError.message,
        stack: patchError.stack
      });
      patchVersion = '15.16.1'; // Fallback to known version
      logger.warn(`Using fallback patch version: ${patchVersion}`);
    }

    // Check database for cached data
    try {
      const dataResult = await query(
        `SELECT data, patch_version, updated_at 
         FROM static_data_cache 
         WHERE data_type = $1 AND patch_version = $2 AND language = $3
         LIMIT 1`,
        [dataType, patchVersion, language]
      );

      if (dataResult.rows.length > 0) {
        logger.info(`Returning cached data for ${dataType} (${language})`);
        const result = {
          data: dataResult.rows[0].data,
          patch_version: dataResult.rows[0].patch_version,
          language,
          cached_at: dataResult.rows[0].updated_at
        };
        cache.set(cacheKey, result);
        return res.json(result);
      }
    } catch (dbError: any) {
      logger.warn('Database query failed, will fetch from Riot API:', dbError.message);
    }

    // If not in database, fetch from Data Dragon and store
    let url: string;
    switch (dataType) {
      case 'champions':
        url = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/${language}/champion.json`;
        break;
      case 'items':
        url = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/${language}/item.json`;
        break;
      case 'runes':
        url = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/${language}/runesReforged.json`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid data type' });
    }

    logger.info(`Fetching ${dataType} data from: ${url}`);
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LoL-Analytics/1.0'
        }
      });
      
      logger.info(`Successfully fetched ${dataType} data, storing in database...`);
      
      // Store in database
      try {
        await query(
          `INSERT INTO static_data_cache (data_type, patch_version, language, data)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (data_type, patch_version, language)
           DO UPDATE SET data = $4, updated_at = CURRENT_TIMESTAMP`,
          [dataType, patchVersion, language, JSON.stringify(response.data)]
        );
        logger.info(`Successfully stored ${dataType} data in database`);
      } catch (storeError: any) {
        logger.error('Failed to store data in database:', storeError.message);
        // Continue anyway, we have the data
      }

      const result = {
        data: response.data,
        patch_version: patchVersion,
        language,
        cached_at: new Date()
      };

      cache.set(cacheKey, result);
      res.json(result);
    } catch (fetchError: any) {
      logger.error('Failed to fetch from Data Dragon:', {
        url,
        message: fetchError.message,
        code: fetchError.code,
        status: fetchError.response?.status,
        statusText: fetchError.response?.statusText,
        data: fetchError.response?.data
      });
      
      // Return more detailed error
      res.status(500).json({ 
        error: 'Failed to fetch static data',
        details: {
          dataType,
          language,
          patchVersion,
          url,
          errorMessage: fetchError.message,
          errorCode: fetchError.code
        }
      });
    }
  } catch (error: any) {
    logger.error('Unexpected error in static data endpoint:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to fetch static data',
      message: error.message 
    });
  }
});

// Get all static data for a specific language
router.get('/static/all/:language?', async (req: Request, res: Response) => {
  try {
    const language = req.params.language || 'ja_JP';
    const cacheKey = `static-all-${language}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get current patch
    const patchResult = await query(
      'SELECT patch_version FROM patch_versions WHERE is_current = true LIMIT 1'
    );
    
    let patchVersion: string;
    if (patchResult.rows.length > 0) {
      patchVersion = patchResult.rows[0].patch_version;
    } else {
      const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
      patchVersion = versionsResponse.data[0];
    }

    // Fetch all data types
    const dataResult = await query(
      `SELECT data_type, data 
       FROM static_data_cache 
       WHERE patch_version = $1 AND language = $2`,
      [patchVersion, language]
    );

    let champions = {};
    let items = {};
    let runes = [];

    // If data exists in database
    if (dataResult.rows.length >= 3) {
      dataResult.rows.forEach(row => {
        switch (row.data_type) {
          case 'champions':
            champions = row.data.data || row.data;
            break;
          case 'items':
            items = row.data.data || row.data;
            break;
          case 'runes':
            runes = row.data;
            break;
        }
      });
    } else {
      // Fetch from Data Dragon
      const [champResponse, itemResponse, runeResponse] = await Promise.all([
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/${language}/champion.json`),
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/${language}/item.json`),
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/${language}/runesReforged.json`)
      ]);

      champions = champResponse.data.data;
      items = itemResponse.data.data;
      runes = runeResponse.data;

      // Store in database
      const queries = [
        ['champions', champResponse.data],
        ['items', itemResponse.data],
        ['runes', runeResponse.data]
      ];

      for (const [dataType, data] of queries) {
        await query(
          `INSERT INTO static_data_cache (data_type, patch_version, language, data)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (data_type, patch_version, language)
           DO UPDATE SET data = $4, updated_at = CURRENT_TIMESTAMP`,
          [dataType, patchVersion, language, JSON.stringify(data)]
        );
      }
    }

    const result = {
      patch_version: patchVersion,
      language,
      champions,
      items,
      runes
    };

    cache.set(cacheKey, result, 3600); // Cache for 1 hour
    res.json(result);
  } catch (error) {
    logger.error('Error fetching all static data:', error);
    res.status(500).json({ error: 'Failed to fetch static data' });
  }
});

// Get champion build data
router.get('/champion-build/:championId/:role?', async (req: Request, res: Response) => {
  try {
    const { championId, role } = req.params;
    const source = req.query.source as string || 'all';
    
    const cacheKey = `build-${championId}-${role || 'all'}-${source}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get current patch
    const patchResult = await query(
      'SELECT patch_version FROM patch_versions WHERE is_current = true LIMIT 1'
    );
    
    let patchVersion: string;
    if (patchResult.rows.length > 0) {
      patchVersion = patchResult.rows[0].patch_version;
    } else {
      const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
      patchVersion = versionsResponse.data[0];
    }

    let query = `
      SELECT * FROM champion_builds 
      WHERE champion_id = $1 AND patch_version = $2
    `;
    const params: any[] = [championId, patchVersion];

    if (role && role !== 'all') {
      query += ' AND role = $3';
      params.push(role.toUpperCase());
    }

    if (source !== 'all') {
      query += ` AND source = $${params.length + 1}`;
      params.push(source);
    }

    query += ' ORDER BY win_rate DESC';

    const result = await query(query, params);

    if (result.rows.length === 0) {
      return res.json({
        champion_id: championId,
        patch_version: patchVersion,
        builds: [],
        message: 'No build data available for this champion'
      });
    }

    const response = {
      champion_id: championId,
      patch_version: patchVersion,
      builds: result.rows.map(row => ({
        role: row.role,
        source: row.source,
        core_items: row.core_items,
        starting_items: row.starting_items,
        boots: row.boots,
        primary_runes: row.primary_runes,
        secondary_runes: row.secondary_runes,
        stat_shards: row.stat_shards,
        skill_order: row.skill_order,
        skill_priority: row.skill_priority,
        win_rate: parseFloat(row.win_rate),
        pick_rate: parseFloat(row.pick_rate),
        ban_rate: parseFloat(row.ban_rate),
        games_played: row.games_played,
        tier: row.tier,
        counters: row.counters || [],
        synergies: row.synergies || [],
        scraped_at: row.scraped_at
      }))
    };

    cache.set(cacheKey, response, 1800); // Cache for 30 minutes
    res.json(response);
  } catch (error) {
    logger.error('Error fetching champion build:', error);
    res.status(500).json({ error: 'Failed to fetch champion build data' });
  }
});

// Store build data (called by n8n workflow)
router.post('/champion-build', async (req: Request, res: Response) => {
  try {
    const buildData = req.body;
    
    logger.info('Received build data:', {
      champion_id: buildData.champion_id,
      role: buildData.role,
      source: buildData.source,
      patch_version: buildData.patch_version
    });
    
    // Validate required fields
    if (!buildData.champion_id || !buildData.patch_version) {
      logger.error('Missing required fields:', buildData);
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: {
          champion_id: buildData.champion_id,
          patch_version: buildData.patch_version
        }
      });
    }
    
    // Set defaults for missing fields
    buildData.role = buildData.role || 'UNKNOWN';
    buildData.source = buildData.source || 'unknown';

    await query(
      `INSERT INTO champion_builds (
        champion_id, patch_version, role, source,
        core_items, situational_items, starting_items, boots,
        primary_rune_tree, primary_runes, secondary_rune_tree, secondary_runes, stat_shards,
        skill_order, skill_priority,
        win_rate, pick_rate, ban_rate, games_played, tier,
        counters, synergies
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (champion_id, patch_version, role, source)
      DO UPDATE SET
        core_items = $5,
        situational_items = $6,
        starting_items = $7,
        boots = $8,
        primary_rune_tree = $9,
        primary_runes = $10,
        secondary_rune_tree = $11,
        secondary_runes = $12,
        stat_shards = $13,
        skill_order = $14,
        skill_priority = $15,
        win_rate = $16,
        pick_rate = $17,
        ban_rate = $18,
        games_played = $19,
        tier = $20,
        counters = $21,
        synergies = $22,
        scraped_at = CURRENT_TIMESTAMP`,
      [
        buildData.champion_id,
        buildData.patch_version,
        buildData.role,
        buildData.source,
        JSON.stringify(buildData.core_items || []),
        JSON.stringify(buildData.situational_items || []),
        JSON.stringify(buildData.starting_items || []),
        JSON.stringify(buildData.boots || []),
        buildData.primary_rune_tree,
        JSON.stringify(buildData.primary_runes || []),
        buildData.secondary_rune_tree,
        JSON.stringify(buildData.secondary_runes || []),
        JSON.stringify(buildData.stat_shards || []),
        JSON.stringify(buildData.skill_order || []),
        buildData.skill_priority,
        buildData.win_rate,
        buildData.pick_rate,
        buildData.ban_rate,
        buildData.games_played,
        buildData.tier,
        JSON.stringify(buildData.counters || []),
        JSON.stringify(buildData.synergies || [])
      ]
    );

    // Clear relevant caches
    cache.flushAll();

    logger.info('Build data stored successfully:', {
      champion_id: buildData.champion_id,
      role: buildData.role,
      source: buildData.source
    });

    res.json({ 
      success: true, 
      message: 'Build data stored successfully',
      stored: {
        champion_id: buildData.champion_id,
        role: buildData.role,
        source: buildData.source,
        patch_version: buildData.patch_version
      }
    });
  } catch (error: any) {
    logger.error('Error storing build data:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      buildData: req.body
    });
    
    res.status(500).json({ 
      error: 'Failed to store build data',
      message: error.message,
      detail: error.detail || 'Database error'
    });
  }
});

// Update patch version
router.post('/patch-version', async (req: Request, res: Response) => {
  try {
    const { patch_version, release_date, notes_summary } = req.body;

    if (!patch_version) {
      return res.status(400).json({ error: 'Patch version is required' });
    }

    // Check current version
    const currentResult = await query(
      'SELECT patch_version FROM patch_versions WHERE is_current = true'
    );
    
    // If already the target version, do nothing (idempotent)
    if (currentResult.rows.length > 0 && currentResult.rows[0].patch_version === patch_version) {
      logger.info(`Patch version ${patch_version} is already current, skipping update`);
      return res.json({ 
        success: true, 
        message: 'Already up to date', 
        patch_version,
        skipped: true 
      });
    }

    // Only update if different version
    // First, set all existing versions to not current
    await query(
      'UPDATE patch_versions SET is_current = false WHERE is_current = true'
    );

    // Then insert or update the new version
    await query(
      `INSERT INTO patch_versions (patch_version, release_date, notes_summary, is_current)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (patch_version)
       DO UPDATE SET 
         release_date = EXCLUDED.release_date,
         notes_summary = EXCLUDED.notes_summary,
         is_current = true`,
      [patch_version, release_date, notes_summary]
    );

    // Clear all caches when patch changes
    cache.flushAll();

    logger.info(`Patch version updated from ${currentResult.rows[0]?.patch_version || 'none'} to ${patch_version}`);
    res.json({ success: true, message: 'Patch version updated', patch_version });
  } catch (error: any) {
    logger.error('Error updating patch version:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      body: req.body
    });
    res.status(500).json({ 
      error: 'Failed to update patch version',
      details: error.message 
    });
  }
});

// Calculate champion stats with items
router.post('/calculate-stats', async (req: Request, res: Response) => {
  try {
    const { championId, level, items, runes } = req.body;

    if (!championId || !level) {
      return res.status(400).json({ error: 'Champion ID and level are required' });
    }

    // Get champion base stats
    const language = req.query.language as string || 'ja_JP';
    const staticDataResponse = await axios.get(
      `http://localhost:3000/api/knowledge/static/champions/${language}`
    );
    
    const championData = staticDataResponse.data.data.champions[championId];
    if (!championData) {
      return res.status(404).json({ error: 'Champion not found' });
    }

    // Calculate base stats at level
    const stats = championData.stats;
    const calculatedStats = {
      hp: stats.hp + (stats.hpperlevel * (level - 1)),
      mp: stats.mp + (stats.mpperlevel * (level - 1)),
      armor: stats.armor + (stats.armorperlevel * (level - 1)),
      spellblock: stats.spellblock + (stats.spellblockperlevel * (level - 1)),
      attackdamage: stats.attackdamage + (stats.attackdamageperlevel * (level - 1)),
      attackspeed: stats.attackspeed * (1 + (stats.attackspeedperlevel * (level - 1) / 100)),
      movespeed: stats.movespeed,
      crit: 0
    };

    // Add item stats (simplified - would need full item data)
    if (items && items.length > 0) {
      // This would require fetching item data and calculating effects
      // Placeholder for now
    }

    res.json({
      champion_id: championId,
      level,
      base_stats: stats,
      calculated_stats: calculatedStats,
      items: items || [],
      runes: runes || {}
    });
  } catch (error) {
    logger.error('Error calculating stats:', error);
    res.status(500).json({ error: 'Failed to calculate champion stats' });
  }
});

// Store champion build data (from n8n workflow)
router.post('/champion-build', async (req: Request, res: Response) => {
  try {
    const buildData = req.body;
    
    // Validate required fields
    if (!buildData.champion_id || !buildData.patch_version) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['champion_id', 'patch_version'],
        received: Object.keys(buildData)
      });
    }

    // Log incoming data for debugging
    logger.info('Storing champion build data:', {
      champion_id: buildData.champion_id,
      role: buildData.role,
      source: buildData.source,
      patch_version: buildData.patch_version
    });

    try {
      // Store in database with minimal required fields
      await query(
        `INSERT INTO champion_builds (
          champion_id, patch_version, role, source,
          core_items, starting_items, boots,
          summoner_spells, skill_order, skill_priority,
          primary_rune_tree, primary_runes,
          secondary_rune_tree, secondary_runes,
          stat_shards,
          win_rate, pick_rate, ban_rate, games_played,
          tier, counters, synergies
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22
        )
        ON CONFLICT (champion_id, patch_version, role, source)
        DO UPDATE SET
          core_items = EXCLUDED.core_items,
          starting_items = EXCLUDED.starting_items,
          boots = EXCLUDED.boots,
          summoner_spells = EXCLUDED.summoner_spells,
          skill_order = EXCLUDED.skill_order,
          skill_priority = EXCLUDED.skill_priority,
          primary_rune_tree = EXCLUDED.primary_rune_tree,
          primary_runes = EXCLUDED.primary_runes,
          secondary_rune_tree = EXCLUDED.secondary_rune_tree,
          secondary_runes = EXCLUDED.secondary_runes,
          stat_shards = EXCLUDED.stat_shards,
          win_rate = EXCLUDED.win_rate,
          pick_rate = EXCLUDED.pick_rate,
          ban_rate = EXCLUDED.ban_rate,
          games_played = EXCLUDED.games_played,
          tier = EXCLUDED.tier,
          counters = EXCLUDED.counters,
          synergies = EXCLUDED.synergies,
          updated_at = CURRENT_TIMESTAMP`,
        [
          buildData.champion_id,
          buildData.patch_version,
          buildData.role || 'UNKNOWN',
          buildData.source || 'unknown',
          JSON.stringify(buildData.core_items || []),
          JSON.stringify(buildData.starting_items || []),
          JSON.stringify(buildData.boots || []),
          JSON.stringify(buildData.summoner_spells || []),
          JSON.stringify(buildData.skill_order || []),
          buildData.skill_priority || null,
          buildData.primary_rune_tree || null,
          JSON.stringify(buildData.primary_runes || []),
          buildData.secondary_rune_tree || null,
          JSON.stringify(buildData.secondary_runes || []),
          JSON.stringify(buildData.stat_shards || []),
          buildData.win_rate || 0,
          buildData.pick_rate || 0,
          buildData.ban_rate || 0,
          buildData.games_played || 0,
          buildData.tier || null,
          JSON.stringify(buildData.counters || []),
          JSON.stringify(buildData.synergies || [])
        ]
      );

      logger.info('Successfully stored build data for', buildData.champion_id);

      // Clear relevant caches
      const cacheKey = `build-${buildData.champion_id}-${buildData.role}-${buildData.source}`;
      cache.del(cacheKey);

      res.json({ 
        success: true, 
        message: 'Build data stored successfully',
        champion: buildData.champion_id,
        role: buildData.role
      });
    } catch (dbError: any) {
      logger.error('Database error storing build data:', {
        message: dbError.message,
        detail: dbError.detail,
        code: dbError.code
      });
      
      res.status(500).json({ 
        error: 'Failed to store build data in database',
        details: dbError.message
      });
    }
  } catch (error: any) {
    logger.error('Error storing build data:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to store build data',
      message: error.message
    });
  }
});

// Store static data from n8n workflow
router.post('/static-data', async (req: Request, res: Response) => {
  try {
    const { data_type, patch_version, language, data } = req.body;
    
    // Validate required fields
    if (!data_type || !patch_version || !language || !data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: data_type, patch_version, language, data' 
      });
    }
    
    // Store in database
    await query(
      `INSERT INTO static_data_cache (data_type, patch_version, language, data, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (data_type, patch_version, language) 
       DO UPDATE SET 
         data = EXCLUDED.data,
         updated_at = CURRENT_TIMESTAMP`,
      [data_type, patch_version, language, JSON.stringify(data)]
    );
    
    // Clear relevant cache entries
    cache.del(`static-${data_type}-${language}`);
    cache.del(`static-all-${language}`);
    
    logger.info(`Static data stored: ${data_type} - ${patch_version} - ${language}`);
    
    res.json({ 
      success: true, 
      message: 'Static data stored successfully',
      data_type,
      patch_version,
      language
    });
  } catch (error: any) {
    logger.error('Error storing static data:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to store static data',
      message: error.message 
    });
  }
});

export default router;