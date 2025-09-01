@echo off
echo Testing n8n Webhook with complete data structure...
curl -X POST "http://localhost:5678/webhook-test/14coacher" ^
  -H "Content-Type: application/json" ^
  -d "{\"summonerName\":\"Hikarukk\",\"region\":\"jp1\",\"matchId\":\"JP1_522825776\",\"champion\":\"Lulu\",\"role\":\"UTILITY\",\"tier\":\"SILVER\",\"division\":\"IV\",\"locale\":\"en\",\"patch\":\"15.14\",\"cs_at_14\":94,\"gold_at_14\":4211,\"cs_efficiency\":79,\"estimated_apm\":9,\"items_at_14\":[],\"kda\":\"0/0/0\",\"team_gold_diff\":-2782,\"win_prediction\":\"25.00\",\"expected_cs_14\":110,\"expected_gold_14\":9000,\"common_items\":[\"Doran's Ring\",\"Boots\",\"Amplifying Tome\"],\"win_rate\":52.3,\"sample_size\":1500,\"cache_key\":\"14coacher_Hikarukk_JP1_522825776_en\",\"timestamp\":\"2025-08-31T21:22:07.539Z\"}"