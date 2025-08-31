import { metaDataCollector } from './metaDataCollector';
import { COACHER_PROMPT_TEMPLATE } from '../prompts/14coacher';
import { logger } from '../utils/logger';

export interface PlayerData {
  summonerName: string;
  region: string;
  matchId: string;
  champion: string;
  role: string;
  cs_at_14: number;
  gold_at_14: number;
  kda: string;
  items_at_14: string[];
  team_gold_diff: number;
  cs_efficiency?: number;
  estimated_apm?: number;
  win_prediction?: number;
  locale?: string; // Language preference: 'ja' | 'en' | 'ko'
}

export interface PromptContext {
  // Meta information
  current_date: string;
  current_patch: string;
  scrape_timestamp: string;
  current_tier: string;
  current_win_rate: number;
  current_pick_rate: number;
  current_ban_rate: number;
  optimal_items_14: string;
  high_rank_cs_14: number;
  high_rank_gold_14: number;
  meta_trends: string;
  
  // Player data
  summoner_name: string;
  region: string;
  champion: string;
  role: string;
  player_cs_14: number;
  player_gold_14: number;
  player_kda: string;
  player_items_14: string;
  team_gold_diff: number;
}

export class PromptContextBuilder {
  /**
   * Get the appropriate prompt template based on locale
   */
  private async getPromptTemplate(locale: string = 'ja'): Promise<string> {
    try {
      switch(locale) {
        case 'en':
          const { COACHER_PROMPT_TEMPLATE_EN } = await import('../prompts/14coacher-en');
          return COACHER_PROMPT_TEMPLATE_EN;
        case 'ko':
          const { COACHER_PROMPT_TEMPLATE_KO } = await import('../prompts/14coacher-ko');
          return COACHER_PROMPT_TEMPLATE_KO;
        case 'ja':
        default:
          return COACHER_PROMPT_TEMPLATE;
      }
    } catch (error) {
      logger.warn('Failed to load locale-specific prompt, using Japanese', { locale, error });
      return COACHER_PROMPT_TEMPLATE;
    }
  }
  
  /**
   * Build a complete context for the AI prompt with current meta data
   * This ensures Gemini 2.0 Flash has the latest LoL information
   */
  async buildContext(playerData: PlayerData): Promise<string> {
    try {
      logger.info('Building prompt context', { 
        champion: playerData.champion, 
        role: playerData.role,
        locale: playerData.locale || 'ja'
      });
      
      // 1. Collect current meta data
      const metaData = await metaDataCollector.getCurrentMetaData(
        playerData.champion,
        playerData.role
      );
      
      // 2. Create context object with all necessary data
      const context: PromptContext = {
        // Meta information from BrightData/scraping
        current_date: metaData.current_date,
        current_patch: metaData.current_patch,
        scrape_timestamp: metaData.scrape_timestamp,
        current_tier: metaData.champion_stats.tier,
        current_win_rate: metaData.champion_stats.win_rate,
        current_pick_rate: metaData.champion_stats.pick_rate,
        current_ban_rate: metaData.champion_stats.ban_rate,
        optimal_items_14: metaData.high_rank_benchmarks.items_14.join(', '),
        high_rank_cs_14: metaData.high_rank_benchmarks.cs_14,
        high_rank_gold_14: metaData.high_rank_benchmarks.gold_14,
        meta_trends: metaData.meta_trends,
        
        // Player performance data
        summoner_name: playerData.summonerName,
        region: playerData.region,
        champion: playerData.champion,
        role: playerData.role,
        player_cs_14: playerData.cs_at_14,
        player_gold_14: playerData.gold_at_14,
        player_kda: playerData.kda,
        player_items_14: playerData.items_at_14.join(', '),
        team_gold_diff: playerData.team_gold_diff
      };
      
      // 3. Get appropriate template based on locale
      const template = await this.getPromptTemplate(playerData.locale);
      
      // 4. Render the template with context
      const prompt = this.renderTemplate(template, context);
      
      logger.info('Prompt context built successfully', {
        patch: context.current_patch,
        locale: playerData.locale || 'ja',
        promptLength: prompt.length
      });
      
      return prompt;
    } catch (error) {
      logger.error('Failed to build prompt context', { error });
      // Return a basic prompt without meta data as fallback
      return this.buildFallbackPrompt(playerData);
    }
  }
  
  /**
   * Render template by replacing placeholders with actual values
   */
  private renderTemplate(template: string, context: PromptContext): string {
    let result = template;
    
    // Replace all placeholders with actual values
    for (const [key, value] of Object.entries(context)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(value));
    }
    
    // Log any remaining placeholders (for debugging)
    const remainingPlaceholders = result.match(/{{[^}]+}}/g);
    if (remainingPlaceholders) {
      logger.warn('Unreplaced placeholders found', { placeholders: remainingPlaceholders });
    }
    
    return result;
  }
  
  /**
   * Build a fallback prompt if meta data collection fails
   */
  private buildFallbackPrompt(playerData: PlayerData): string {
    const fallbackPrompt = `
    あなたはプロのLoLコーチです。以下のプレイヤーの14分時点のパフォーマンスを分析してください。
    
    プレイヤー情報:
    - サモナー名: ${playerData.summonerName}
    - チャンピオン: ${playerData.champion}
    - ロール: ${playerData.role}
    - CS@14分: ${playerData.cs_at_14}
    - ゴールド@14分: ${playerData.gold_at_14}
    - KDA: ${playerData.kda}
    - アイテム: ${playerData.items_at_14.join(', ')}
    
    一般的なベンチマーク（${playerData.role}）:
    - 期待CS@14分: ${this.getExpectedCS(playerData.role)}
    - 期待ゴールド@14分: 9000
    
    以下のJSON形式で分析結果を提供してください:
    {
      "analysis": {
        "cs_efficiency": 数値(0-100),
        "gold_efficiency": 数値(0-100),
        "itemization_score": 数値(0-100),
        "macro_play_rating": 数値(0-100)
      },
      "recommendations": [
        {
          "priority": "改善項目",
          "description": "具体的な改善方法",
          "impact": "high/medium/low"
        }
      ],
      "priority_actions": ["アクション1", "アクション2", "アクション3"],
      "benchmark_comparison": {
        "vs_average": 数値,
        "vs_high_rank": 数値
      }
    }
    `;
    
    return fallbackPrompt;
  }
  
  /**
   * Get expected CS based on role
   */
  private getExpectedCS(role: string): number {
    const csExpectations: { [key: string]: number } = {
      'TOP': 100,
      'JUNGLE': 80,
      'MIDDLE': 110,
      'BOTTOM': 115,
      'SUPPORT': 20
    };
    
    return csExpectations[role] || 100;
  }
  
  /**
   * Create a context for testing purposes
   */
  createTestContext(): PromptContext {
    return {
      current_date: '2025-08-18',
      current_patch: '25.16',
      scrape_timestamp: new Date().toISOString(),
      current_tier: 'S',
      current_win_rate: 52.3,
      current_pick_rate: 8.5,
      current_ban_rate: 15.2,
      optimal_items_14: 'Doran\'s Ring, Lost Chapter, Boots',
      high_rank_cs_14: 115,
      high_rank_gold_14: 9200,
      meta_trends: 'Current Tier: S (52.3% win rate)\nTrending Build: Luden\'s Echo -> Shadowflame',
      summoner_name: 'TestPlayer',
      region: 'kr',
      champion: 'Azir',
      role: 'MIDDLE',
      player_cs_14: 105,
      player_gold_14: 8500,
      player_kda: '3/2/5',
      player_items_14: 'Doran\'s Ring, Lost Chapter',
      team_gold_diff: 1500
    };
  }
}

// Export singleton instance
export const promptContextBuilder = new PromptContextBuilder();