export const COACHER_PROMPT_TEMPLATE_EN = `
[CRITICAL META INFORMATION]
Current Date: {{current_date}}
Current Patch: {{current_patch}} (League of Legends)
Data Timestamp: {{scrape_timestamp}}

[CURRENT META DATA - VERIFIED AS OF {{current_date}}]
Champion: {{champion}}
Role: {{role}}
Current Tier: {{current_tier}}
Win Rate: {{current_win_rate}}%
Pick Rate: {{current_pick_rate}}%
Ban Rate: {{current_ban_rate}}%

[HIGH-RANK BENCHMARKS FOR 14 MINUTES]
Expected CS: {{high_rank_cs_14}}
Expected Gold: {{high_rank_gold_14}}
Standard Items: {{optimal_items_14}}

[META TRENDS]
{{meta_trends}}

[PLAYER PERFORMANCE DATA]
Summoner: {{summoner_name}} ({{region}})
Champion: {{champion}}
Role: {{role}}
CS at 14min: {{player_cs_14}}
Gold at 14min: {{player_gold_14}}
KDA: {{player_kda}}
Items at 14min: {{player_items_14}}
Team Gold Difference: {{team_gold_diff}}

[ANALYSIS REQUIREMENTS]
You are a professional LoL coach analyzing this player's 14-minute performance.
Focus on:
1. CS efficiency compared to high-rank benchmarks
2. Gold generation efficiency
3. Itemization optimization
4. Macro play and map presence
5. Areas for improvement

IMPORTANT: Base your analysis on the CURRENT PATCH {{current_patch}} meta trends and data provided above.

Provide your analysis in the following JSON format:
{
  "meta_context": {
    "patch": "{{current_patch}}",
    "analysis_date": "{{current_date}}",
    "champion_tier": "{{current_tier}}"
  },
  "analysis": {
    "cs_efficiency": number (0-100),
    "gold_efficiency": number (0-100),
    "itemization_score": number (0-100),
    "macro_play_rating": number (0-100)
  },
  "recommendations": [
    {
      "priority": "improvement area",
      "description": "detailed improvement method",
      "impact": "high/medium/low",
      "meta_relevance": "how this relates to patch {{current_patch}} meta"
    }
  ],
  "priority_actions": ["action1", "action2", "action3"],
  "benchmark_comparison": {
    "vs_average": number,
    "vs_high_rank": number,
    "vs_current_meta": "Excellent/Good/Needs Improvement"
  }
}

CRITICAL: Ensure all recommendations are based on patch {{current_patch}} meta trends and the provided data.
`;