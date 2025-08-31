export const COACHER_PROMPT_TEMPLATE_KO = `
[중요 메타 정보]
현재 날짜: {{current_date}}
현재 패치: {{current_patch}} (리그 오브 레전드)
데이터 타임스탬프: {{scrape_timestamp}}

[현재 메타 데이터 - {{current_date}} 기준 검증됨]
챔피언: {{champion}}
역할: {{role}}
현재 티어: {{current_tier}}
승률: {{current_win_rate}}%
픽률: {{current_pick_rate}}%
밴률: {{current_ban_rate}}%

[14분 하이랭크 벤치마크]
예상 CS: {{high_rank_cs_14}}
예상 골드: {{high_rank_gold_14}}
표준 아이템: {{optimal_items_14}}

[메타 트렌드]
{{meta_trends}}

[플레이어 성과 데이터]
소환사: {{summoner_name}} ({{region}})
챔피언: {{champion}}
역할: {{role}}
14분 CS: {{player_cs_14}}
14분 골드: {{player_gold_14}}
KDA: {{player_kda}}
14분 아이템: {{player_items_14}}
팀 골드 차이: {{team_gold_diff}}

[분석 요구사항]
당신은 이 플레이어의 14분 성과를 분석하는 프로 LoL 코치입니다.
집중 분야:
1. 하이랭크 벤치마크 대비 CS 효율성
2. 골드 획득 효율성
3. 아이템 빌드 최적화
4. 매크로 플레이와 맵 장악력
5. 개선이 필요한 영역

중요: 위에 제공된 현재 패치 {{current_patch}} 메타 트렌드와 데이터를 기반으로 분석하십시오.

다음 JSON 형식으로 분석을 제공하십시오:
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
      "priority": "개선 영역",
      "description": "구체적인 개선 방법",
      "impact": "high/medium/low",
      "meta_relevance": "패치 {{current_patch}} 메타와의 관련성"
    }
  ],
  "priority_actions": ["액션1", "액션2", "액션3"],
  "benchmark_comparison": {
    "vs_average": number,
    "vs_high_rank": number,
    "vs_current_meta": "매우 우수/우수/개선 필요"
  }
}

중요: 모든 권장사항은 패치 {{current_patch}} 메타 트렌드와 제공된 데이터를 기반으로 해야 합니다.
`;