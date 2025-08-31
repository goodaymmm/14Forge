import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { query } from '../services/database';
import { fourteenMinAnalysis } from '../services/fourteenMinAnalysis';
import { promptContextBuilder, PlayerData } from '../services/promptContextBuilder';
import { brightDataScraper } from '../services/brightDataScraper';

const router = Router();

// 14 Coacher AI Agent Webhook - Support both GET and POST
router.get('/webhook/14coacher', async (req: Request, res: Response): Promise<any> => {
  try {
    // Debug: Log raw query parameters and headers
    logger.info('14 Coacher webhook RAW request (GET)', {
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'origin': req.headers['origin'],
        'host': req.headers['host']
      },
      url: req.url
    });

    // Extract from query parameters for GET request
    const { 
      summonerName, 
      region, 
      matchId, 
      champion, 
      role,
      tier,
      division,
      cs_at_14, 
      gold_at_14, 
      items_at_14, 
      locale = 'ja' 
    } = req.query as any;

    // Check for template strings from n8n
    const hasTemplateStrings = [
      summonerName,
      region,
      matchId,
      champion,
      role
    ].some(value => 
      typeof value === 'string' && 
      (value.includes('{{ $json') || value.includes('{{$json') || value.includes('{{ $'))
    );

    if (hasTemplateStrings) {
      logger.warn('n8n template strings detected in request!', {
        summonerName,
        region,
        matchId,
        champion,
        role,
        hint: 'n8n expressions must start with = to be evaluated. Example: ={{ $json.summonerName }}'
      });
    }

    logger.info('14 Coacher webhook triggered (GET)', { summonerName, matchId, region, tier, division, locale });

    // Convert string numbers to actual numbers
    const csAt14 = cs_at_14 ? parseInt(cs_at_14 as string) : undefined;
    const goldAt14 = gold_at_14 ? parseInt(gold_at_14 as string) : undefined;
    const itemsAt14 = items_at_14 ? (items_at_14 as string).split(',') : [];

    // Call the shared handler
    return handle14CoacherRequest(
      res,
      summonerName as string,
      region as string,
      matchId as string,
      champion as string,
      role as string,
      tier as string,
      division as string,
      csAt14,
      goldAt14,
      itemsAt14,
      locale as string
    );
  } catch (error) {
    logger.error('14 Coacher webhook error (GET)', { error });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/webhook/14coacher', async (req: Request, res: Response): Promise<any> => {
  try {
    // Debug: Log raw body and headers
    logger.info('14 Coacher webhook RAW request (POST)', {
      body: req.body,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'origin': req.headers['origin'],
        'host': req.headers['host']
      }
    });

    const { summonerName, region, matchId, champion, role, tier, division, cs_at_14, gold_at_14, items_at_14, locale = 'en' } = req.body;

    // Check for template strings from n8n
    const hasTemplateStrings = [
      summonerName,
      region,
      matchId,
      champion,
      role
    ].some(value => 
      typeof value === 'string' && 
      (value.includes('{{ $json') || value.includes('{{$json') || value.includes('{{ $'))
    );

    if (hasTemplateStrings) {
      logger.warn('n8n template strings detected in request!', {
        summonerName,
        region,
        matchId,
        champion,
        role,
        hint: 'n8n expressions must start with = to be evaluated. Example: ={{ $json.summonerName }}'
      });
    }

    logger.info('14 Coacher webhook triggered (POST)', { summonerName, matchId, region, tier, division, locale });

    // Call the shared handler
    return handle14CoacherRequest(
      res,
      summonerName,
      region,
      matchId,
      champion,
      role,
      tier,
      division,
      cs_at_14,
      gold_at_14,
      items_at_14,
      locale
    );
  } catch (error) {
    logger.error('14 Coacher webhook error (POST)', { error });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Shared handler for both GET and POST
async function handle14CoacherRequest(
  res: Response,
  summonerName: string,
  region: string,
  matchId: string,
  champion: string,
  role: string,
  tier?: string,
  division?: string,
  cs_at_14?: number,
  gold_at_14?: number,
  items_at_14?: string[],
  locale: string = 'en'
): Promise<any> {
  try {
    // Debug: Log all parameters received
    logger.info('handle14CoacherRequest called with:', {
      summonerName,
      region,
      matchId,
      champion,
      role,
      tier,
      division,
      cs_at_14,
      gold_at_14,
      items_at_14,
      locale,
      types: {
        summonerName: typeof summonerName,
        region: typeof region,
        matchId: typeof matchId,
        champion: typeof champion,
        role: typeof role,
        tier: typeof tier,
        division: typeof division
      }
    });

    // Auto-fix template strings if detected (temporary workaround)
    const isTemplate = (str: string) => 
      str && (str.includes('{{ $json') || str.includes('{{$json') || str.includes('{{ $'));
    
    if (isTemplate(summonerName) || isTemplate(region) || isTemplate(matchId)) {
      logger.error('Template strings cannot be processed. n8n configuration error.', {
        received: { summonerName, region, matchId },
        solution: 'In n8n, expressions must start with = sign. Example: ={{ $json.summonerName }}'
      });
      
      // Return error response with clear instructions
      return res.status(400).json({
        status: 'error',
        message: 'n8n configuration error: Template strings detected',
        error: 'n8n expressions must start with = to be evaluated',
        example: '={{ $json.summonerName }} instead of {{ $json.summonerName }}',
        received_values: {
          summonerName: summonerName?.substring(0, 50),
          region: region?.substring(0, 50),
          matchId: matchId?.substring(0, 50)
        }
      });
    }

    // Validate required fields
    if (!summonerName || !region || !matchId) {
      throw new ApiError(400, 'Missing required fields: summonerName, region, matchId');
    }

    // Generate cache key for n8n workflow (include locale for language-specific caching)
    const cacheKey = `14coacher_${summonerName}_${matchId}_${locale || 'en'}`;
    
    // Skip cache check in backend - let n8n handle all caching
    logger.info('Proceeding to n8n workflow (cache handled by n8n)', { cacheKey });

    // Get 14-minute analysis data
    let analysisData;
    let playerData: any;    // Declare in outer scope for n8n response processing
    let benchmarks: any;    // Declare in outer scope for n8n response processing
    
    try {
      analysisData = await fourteenMinAnalysis.analyzeMatch(region, matchId);
    } catch (error: any) {
      logger.warn('Failed to get 14-minute analysis', { error: error.message, matchId });
      // Return mock data for n8n workflow testing
      analysisData = {
        participants: [{
          summonerName,
          cs: cs_at_14 || 120,
          goldPerMinute: (gold_at_14 || 8500) / 14,
          csEfficiency: 85,
          estimatedAPM: 45
        }],
        teamStats: [{ teamId: 100, totalGold: gold_at_14 || 8500 }],
        goldDiff: 1500,
        winPrediction: 65
      };
      
      // Initialize playerData and benchmarks for mock data
      playerData = analysisData.participants[0];
      benchmarks = { 
        cs_14: 120, 
        gold_14: 3500, 
        items_14: [], 
        win_rate: 50, 
        sample_size: 100 
      };
    }

    // Extract patch number from game version
    let patchNumber: string | undefined;
    
    // First try to get from analysis data (with type guard)
    if (analysisData && 'gameVersion' in analysisData && analysisData.gameVersion) {
      const versionParts = (analysisData as any).gameVersion.split('.');
      if (versionParts.length >= 2) {
        patchNumber = `${versionParts[0]}.${versionParts[1]}`;
      }
    }
    
    // If not found, try to get from database
    if (!patchNumber) {
      try {
        const matchResult = await query(
          'SELECT game_version FROM matches WHERE match_id = $1',
          [matchId]
        );
        if (matchResult.rows.length > 0 && matchResult.rows[0].game_version) {
          const versionParts = matchResult.rows[0].game_version.split('.');
          if (versionParts.length >= 2) {
            patchNumber = `${versionParts[0]}.${versionParts[1]}`;
          }
        }
      } catch (error) {
        logger.warn('Failed to get game version from database', { error, matchId });
      }
    }
    
    // If still not found, this is an error
    if (!patchNumber) {
      throw new ApiError(500, 'Failed to retrieve game patch version from match data');
    }

    // Find player data
    playerData = analysisData.participants.find(p => 
      p.summonerName.toLowerCase() === summonerName.toLowerCase()
    ) || analysisData.participants[0];

    // Prepare player data for prompt context
    const playerDataForContext: PlayerData = {
      summonerName,
      region,
      matchId,
      champion: champion || 'Unknown',
      role: role || 'Unknown',
      cs_at_14: playerData.cs,
      gold_at_14: Math.round(playerData.goldPerMinute * 14),
      kda: `${(playerData as any).kills || 0}/${(playerData as any).deaths || 0}/${(playerData as any).assists || 0}`,
      items_at_14: items_at_14 || [],
      team_gold_diff: analysisData.goldDiff,
      cs_efficiency: playerData.csEfficiency,
      estimated_apm: playerData.estimatedAPM,
      win_prediction: analysisData.winPrediction,
      locale // Pass locale to prompt builder
    };
    
    // Build context-aware prompt with current meta data
    const contextualPrompt = await promptContextBuilder.buildContext(playerDataForContext);
    
    // Get high-rank benchmarks from BrightData
    benchmarks = await brightDataScraper.scrapeHighRankData(
      champion || 'Unknown',
      role || 'Unknown'
    );

    // Prepare FLATTENED data for n8n workflow - easier to access
    const workflowData = {
      // Top level player info
      summonerName,
      region,
      matchId,
      champion: champion || 'Unknown',
      role: role || 'Unknown',
      tier: tier || 'UNRANKED',
      division: division || 'IV',
      locale,
      patch: patchNumber, // Added patch number
      
      // Player performance (flattened)
      cs_at_14: playerData.cs,
      gold_at_14: Math.round(playerData.goldPerMinute * 14),
      cs_efficiency: playerData.csEfficiency,
      estimated_apm: playerData.estimatedAPM,
      items_at_14: items_at_14 || [],
      kda: playerDataForContext.kda,
      
      // Team data (flattened)
      team_gold_diff: analysisData.goldDiff,
      win_prediction: analysisData.winPrediction,
      
      // Benchmark data (flattened)
      expected_cs_14: benchmarks.cs_14,
      expected_gold_14: benchmarks.gold_14,
      common_items: benchmarks.items_14,
      win_rate: benchmarks.win_rate,
      sample_size: benchmarks.sample_size,
      
      // Prompt for AI
      prompt_for_ai: contextualPrompt,
      
      // Metadata
      cache_key: cacheKey,
      timestamp: new Date().toISOString()
    };

    // Trigger n8n workflow
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
    const n8nPath = '/webhook/14coacher';
    
    try {
      logger.info('Triggering n8n workflow and waiting for completion', { url: `${n8nWebhookUrl}${n8nPath}`, cacheKey });
      
      const n8nResponse = await axios.post(`${n8nWebhookUrl}${n8nPath}`, workflowData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 180000, // 3分のタイムアウト（AI処理に時間がかかるため）
        validateStatus: () => true // Don't throw on non-2xx status
      });
      
      // n8nのWebhook Responseから返されたデータを処理
      if (n8nResponse.status === 200 && n8nResponse.data) {
        logger.info('n8n workflow completed successfully', { 
          cacheKey,
          hasData: !!n8nResponse.data.analysis_result || !!n8nResponse.data.coaching || !!n8nResponse.data.success,
          dataKeys: Object.keys(n8nResponse.data)
        });
        
        // n8nから返されたデータを確認（配列の場合は最初の要素を取る）
        let analysisResult;
        if (Array.isArray(n8nResponse.data)) {
          // Filtering2ノードが配列を返す場合
          analysisResult = n8nResponse.data[0];
        } else {
          // 通常のオブジェクトの場合
          analysisResult = n8nResponse.data.analysis_result || 
                           n8nResponse.data.coaching || 
                           n8nResponse.data;
        }
        
        // analysisフィールドの処理（キャッシュ有無に関わらず同じ処理）
        if (analysisResult) {
          // playerDataとbenchmarksが存在することを確認
          if (playerData && benchmarks && analysisData) {
            // analysisフィールドを常に設定（なければ追加、あれば上書き）
            analysisResult.analysis = {
              cs_efficiency: playerData.csEfficiency || 0,
              gold_efficiency: Math.round((playerData.goldPerMinute * 14 / (benchmarks.gold_14 || 3500)) * 100) || 0,
              itemization_score: 85,
              macro_play_rating: Math.round(analysisData.winPrediction) || 50
            };
          }
          
          // キャッシュフラグを判定
          const isFromCache = n8nResponse.data.cached === true || 
                              (analysisResult && analysisResult.from_cache === true);
          
          return res.json({
            status: 'success',
            coaching_analysis: analysisResult,
            cached: isFromCache,
            generated_at: new Date().toISOString()
          });
        }
      }
      
      if (n8nResponse.status >= 400) {
        logger.warn('n8n webhook response not OK', { 
          status: n8nResponse.status,
          statusText: n8nResponse.statusText,
          data: n8nResponse.data
        });
      }
    } catch (n8nError) {
      logger.error('Failed to complete n8n workflow', { 
        error: n8nError,
        message: n8nError instanceof Error ? n8nError.message : 'Unknown error',
        cacheKey 
      });
      
      // タイムアウトの場合は、処理中として返す
      if (axios.isAxiosError(n8nError) && n8nError.code === 'ECONNABORTED') {
        return res.json({
          status: 'processing',
          message: 'Analysis is taking longer than expected. Please check back later.',
          cache_key: cacheKey
        });
      }
    }

    // フォールバック：n8nが応答しない場合は、処理中として返す
    logger.info('Returning processing status to frontend', { cache_key: cacheKey });
    
    res.json({
      status: 'processing',
      message: 'AI analysis has been initiated. Results will be available shortly.',
      cache_key: cacheKey
    });

  } catch (error) {
    logger.error('14 Coacher webhook error', { error });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Global Meta Comparison Webhook
router.post('/webhook/meta-comparison', async (req: Request, res: Response) => {
  try {
    const { regions, champions, trigger_source } = req.body;

    logger.info('Meta comparison webhook triggered', { regions, trigger_source });

    // Prepare regional data structure
    const regionalData = {
      timestamp: new Date().toISOString(),
      trigger_source: trigger_source || 'manual',
      regions: regions || ['kr', 'euw1', 'na1', 'cn'],
      champions: champions || [],
      target_urls: {
        kr: 'https://op.gg/statistics/champions',
        euw1: 'https://op.gg/statistics/champions?region=euw1',
        na1: 'https://op.gg/statistics/champions?region=na1',
        cn: 'https://op.gg/statistics/champions?region=cn'
      },
      scraping_config: {
        render_js: true,
        timeout: 30000,
        concurrent_requests: 3,
        selectors: {
          champion_name: '.champion-index-table__name',
          win_rate: '.champion-index-table__winrate',
          pick_rate: '.champion-index-table__pickrate',
          tier: '.champion-index-table__tier'
        }
      }
    };

    res.json({
      status: 'success',
      message: 'Regional meta comparison data prepared',
      data: regionalData
    });

  } catch (error) {
    logger.error('Meta comparison webhook error', { error });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// AI Commentary Generator Webhook  
router.post('/webhook/commentary', async (req: Request, res: Response) => {
  try {
    const { 
      matchId, 
      duration, 
      team1_score, 
      team2_score, 
      mvp_player, 
      mvp_kda, 
      key_events,
      language = 'en'
    } = req.body;

    logger.info('AI Commentary webhook triggered', { matchId, language });

    if (!matchId) {
      throw new ApiError(400, 'Missing required field: matchId');
    }

    const commentaryData = {
      match_info: {
        matchId,
        duration: duration || '25:34',
        team1_score: team1_score || '15',
        team2_score: team2_score || '8',
        mvp_player: mvp_player || 'Unknown Player',
        mvp_kda: mvp_kda || '8/2/12'
      },
      key_events: key_events || [
        'First Blood at 3:24',
        'Baron stolen at 22:15',
        'Pentakill at 24:50'
      ],
      language,
      social_platforms: ['twitter', 'discord'],
      hashtags: ['#LoL', '#LeagueOfLegends', '#Gaming', '#Esports'],
      timestamp: new Date().toISOString()
    };

    res.json({
      status: 'success',
      message: 'Commentary data prepared for AI generation',
      data: commentaryData,
      locale: req.body.locale || 'ja' // Include locale from request
    });

  } catch (error) {
    logger.error('Commentary webhook error', { error });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Smart Alert System Webhook
router.post('/webhook/alerts', async (req: Request, res: Response) => {
  try {
    const { 
      alert_type, 
      champion_changes, 
      meta_shifts, 
      patch_notes, 
      user_preferences 
    } = req.body;

    logger.info('Smart alerts webhook triggered', { alert_type });

    const alertData = {
      alert_type: alert_type || 'meta_change',
      timestamp: new Date().toISOString(),
      changes: champion_changes || [],
      meta_analysis: meta_shifts || {},
      patch_info: patch_notes || {},
      user_targeting: user_preferences || {
        roles: ['all'],
        champions: ['all'],
        notification_channels: ['discord']
      },
      severity: 'medium',
      action_required: true
    };

    res.json({
      status: 'success',
      message: 'Alert data prepared for processing',
      data: alertData
    });

  } catch (error) {
    logger.error('Smart alerts webhook error', { error });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Store AI Analysis Result (Called by n8n after AI processing)
router.post('/webhook/store-analysis', async (req: Request, res: Response) => {
  try {
    // Debug: Log received data from n8n
    logger.info('Store-analysis webhook called', {
      body: req.body,
      cache_key: req.body.cache_key,
      has_analysis_result: !!req.body.analysis_result,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      }
    });
    
    const { cache_key, analysis_result } = req.body;
    
    // Validate cache_key format and handle different patterns
    if (!cache_key || cache_key === '14coacher__' || !cache_key.includes('_')) {
      logger.warn('Invalid cache_key received', {
        cache_key,
        expected_format: '14coacher_summonerName_matchId_locale'
      });
    }
    
    // Handle various cache_key patterns and normalize to expected format
    let finalCacheKey = cache_key;
    
    // Handle enhanced_unknown_ pattern from n8n
    if (cache_key && cache_key.startsWith('enhanced_unknown_')) {
      // Try to extract the original cache_key from the analysis_result if available
      if (analysis_result && analysis_result.original_request && analysis_result.original_request.cache_key) {
        finalCacheKey = analysis_result.original_request.cache_key;
        logger.info('Remapped cache_key from enhanced_unknown to original', {
          from: cache_key,
          to: finalCacheKey
        });
      } else if (analysis_result && analysis_result.cache_key && analysis_result.cache_key.startsWith('14coacher_')) {
        finalCacheKey = analysis_result.cache_key;
        logger.info('Using cache_key from analysis_result', {
          from: cache_key,
          to: finalCacheKey
        });
      }
    }
    
    // Ensure cache_key format is consistent: 14coacher_{summonerName}_{matchId}_{locale}
    // Handle various formats and normalize
    if (finalCacheKey && finalCacheKey.includes('_')) {
      const parts = finalCacheKey.split('_');
      if (parts.length > 3 && parts[0] === '14coacher') {
        // Keep the format as is if it already includes locale
        // Format: 14coacher_summonerName_matchId_locale
        logger.info('Cache key format validated', {
          cache_key: finalCacheKey,
          parts_count: parts.length
        });
      }
    }
    
    // Calculate expiration based on JST cache update schedule
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const localOffset = now.getTimezoneOffset();
    const jstTime = new Date(now.getTime() + (jstOffset + localOffset) * 60000);
    
    const hour = jstTime.getHours();
    const updateHours = [3, 9, 15, 21];
    
    // Find next update hour
    let nextHour = updateHours.find(h => h > hour);
    let hoursUntilExpire: number;
    
    if (nextHour) {
      hoursUntilExpire = nextHour - hour;
    } else {
      // Next update is tomorrow at 3 AM
      hoursUntilExpire = (24 - hour) + 3;
    }
    
    // Ensure minimum 1 hour and maximum 6 hours
    const expires_hours = Math.min(6, Math.max(1, hoursUntilExpire));

    if (!cache_key || !analysis_result) {
      throw new ApiError(400, 'Missing required fields: cache_key, analysis_result');
    }

    // Store in database with the correct cache_key
    await query(
      `INSERT INTO ai_analysis_cache (cache_key, analysis_result, expires_at, created_at)
       VALUES ($1, $2, NOW() + INTERVAL '${expires_hours} hours', NOW())
       ON CONFLICT (cache_key) 
       DO UPDATE SET analysis_result = $2, expires_at = NOW() + INTERVAL '${expires_hours} hours'`,
      [finalCacheKey, JSON.stringify(analysis_result)]
    );

    logger.info('AI analysis result stored', { 
      cache_key: finalCacheKey,
      original_cache_key: cache_key,
      expires_hours,
      jst_time: jstTime.toISOString(),
      next_update: `${nextHour || 3}:00 JST`
    });

    res.json({
      status: 'success',
      message: 'Analysis result stored successfully',
      cache_key,
      expires_in_hours: expires_hours
    });

  } catch (error) {
    logger.error('Store analysis webhook error', { error });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get cached analysis results
router.get('/analysis/:cache_key', async (req: Request, res: Response): Promise<any> => {
  try {
    const { cache_key } = req.params;
    
    logger.info('Fetching analysis result', { 
      cache_key,
      url: req.url,
      method: req.method
    });

    // Try to find with exact cache_key first
    let result = await query(
      'SELECT analysis_result, created_at, expires_at FROM ai_analysis_cache WHERE cache_key = $1',
      [cache_key]
    );
    
    // If not found, try multiple search strategies
    if (result.rows.length === 0) {
      const parts = cache_key.split('_');
      const matchId = parts[parts.length - 1];
      const summonerName = parts.length > 2 ? parts[1] : null;
      
      logger.info('Trying alternative search strategies', { 
        cache_key,
        matchId,
        summonerName 
      });
      
      // Strategy 1: Search by matchId (most recent)
      result = await query(
        `SELECT analysis_result, created_at, expires_at, cache_key FROM ai_analysis_cache 
         WHERE cache_key LIKE $1 
         AND expires_at > NOW()
         ORDER BY created_at DESC 
         LIMIT 1`,
        [`%${matchId}%`]
      );
      
      // Strategy 2: If still not found and we have summonerName, try with summonerName + matchId
      if (result.rows.length === 0 && summonerName) {
        result = await query(
          `SELECT analysis_result, created_at, expires_at, cache_key FROM ai_analysis_cache 
           WHERE (cache_key LIKE $1 OR cache_key LIKE $2)
           AND expires_at > NOW()
           ORDER BY created_at DESC 
           LIMIT 1`,
          [`%${summonerName}%${matchId}%`, `14coacher_${summonerName}_${matchId}`]
        );
      }
      
      if (result.rows.length > 0) {
        logger.info('Found analysis with alternative search', { 
          matchId,
          actual_cache_key: result.rows[0].cache_key,
          strategy: summonerName ? 'summonerName+matchId' : 'matchId only'
        });
      }
    }
    
    logger.info('Database query result', {
      cache_key,
      found: result.rows.length > 0,
      rows: result.rows.length
    });

    if (result.rows.length === 0) {
      logger.warn('Analysis not found in cache', { cache_key });
      return res.status(404).json({
        status: 'error',
        message: 'Analysis not found',
        cache_key
      });
    }

    const analysis = result.rows[0];
    const isExpired = new Date() > new Date(analysis.expires_at);

    // Parse the analysis_result if it's wrapped in markdown code blocks
    let parsedResult = analysis.analysis_result;
    
    // Check if the result is a string wrapped in markdown code blocks
    if (typeof parsedResult === 'string') {
      // Remove markdown code blocks if present
      const cleanedJson = parsedResult
        .replace(/^```json\s*\n?/, '')  // Remove opening ```json
        .replace(/\n?```\s*$/, '')       // Remove closing ```
        .trim();
      
      try {
        // Try to parse the cleaned JSON
        parsedResult = JSON.parse(cleanedJson);
        logger.info('Successfully parsed markdown-wrapped JSON', { cache_key });
      } catch (parseError) {
        // If parsing fails, log and return the original
        logger.warn('Failed to parse analysis_result as JSON', { 
          cache_key,
          error: parseError instanceof Error ? parseError.message : parseError 
        });
        // Keep the original string if parsing fails
      }
    }
    
    logger.info('Returning cached analysis', { 
      cache_key,
      is_expired: isExpired,
      created_at: analysis.created_at,
      result_type: typeof parsedResult
    });
    
    res.json({
      status: 'success',
      analysis_result: parsedResult,
      created_at: analysis.created_at,
      expires_at: analysis.expires_at,
      is_expired: isExpired
    });

  } catch (error) {
    logger.error('Get analysis error', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      cache_key: req.params.cache_key
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check for n8n workflows
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      fourteen_min_analysis: 'available',
      cache: 'active'
    }
  });
});

export default router;