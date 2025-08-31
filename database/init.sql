-- LoL Performance Analytics Platform
-- Database Schema Initialization

-- Create database if not exists
-- CREATE DATABASE lol_stats;

-- Use the database
-- \c lol_stats;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================
-- Core Tables
-- ===============================

-- Summoners table
CREATE TABLE IF NOT EXISTS summoners (
  id SERIAL PRIMARY KEY,
  puuid VARCHAR(100) UNIQUE NOT NULL,
  summoner_id VARCHAR(100),
  summoner_name VARCHAR(100),
  region VARCHAR(10) NOT NULL,
  tier VARCHAR(20),
  rank VARCHAR(5),
  profile_icon_id INTEGER,
  summoner_level INTEGER,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for summoners table
CREATE INDEX IF NOT EXISTS idx_summoners_region ON summoners(region);
CREATE INDEX IF NOT EXISTS idx_summoners_name ON summoners(summoner_name);
CREATE INDEX IF NOT EXISTS idx_summoners_puuid ON summoners(puuid);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(50) UNIQUE NOT NULL,
  region VARCHAR(10) NOT NULL,
  queue_id INTEGER NOT NULL,
  game_version VARCHAR(20),
  game_duration INTEGER,
  game_creation BIGINT,
  participants JSONB,
  teams JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for matches table
CREATE INDEX IF NOT EXISTS idx_matches_region ON matches(region);
CREATE INDEX IF NOT EXISTS idx_matches_queue ON matches(queue_id);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC);

-- 14-minute analysis table (Ranked games only)
CREATE TABLE IF NOT EXISTS fourteen_min_analysis (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(50) UNIQUE NOT NULL,
  region VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  queue_id INTEGER DEFAULT 420, -- Ranked Solo/Duo
  participants JSONB NOT NULL,
  team_stats JSONB NOT NULL,
  gold_diff INTEGER,
  win_prediction DECIMAL(5,2),
  actual_winner INTEGER,
  insights JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_match 
    FOREIGN KEY (match_id) 
    REFERENCES matches(match_id)
    ON DELETE CASCADE
);

-- Create indexes for fourteen_min_analysis table
CREATE INDEX IF NOT EXISTS idx_14min_match ON fourteen_min_analysis(match_id);
CREATE INDEX IF NOT EXISTS idx_14min_region ON fourteen_min_analysis(region);
CREATE INDEX IF NOT EXISTS idx_14min_created ON fourteen_min_analysis(created_at DESC);

-- ===============================
-- BrightData Integration Tables
-- ===============================

-- Multi-source statistics
CREATE TABLE IF NOT EXISTS multi_source_stats (
  id SERIAL PRIMARY KEY,
  champion VARCHAR(50) NOT NULL,
  region VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opgg_data JSONB,
  ugg_data JSONB,
  mobalytics_data JSONB,
  analysis JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for multi_source_stats table
CREATE INDEX IF NOT EXISTS idx_multi_champion ON multi_source_stats(champion);
CREATE INDEX IF NOT EXISTS idx_multi_region ON multi_source_stats(region);
CREATE INDEX IF NOT EXISTS idx_multi_timestamp ON multi_source_stats(timestamp DESC);

-- Trending topics from social media
CREATE TABLE IF NOT EXISTS trending_topics (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- 'champion', 'build', 'keyword'
  name VARCHAR(100) NOT NULL,
  mentions INTEGER DEFAULT 0,
  sources TEXT[], -- Array of sources: reddit, twitter, inven, weibo
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trend_score DECIMAL(10,2),
  increase DECIMAL(10,2),
  status VARCHAR(20), -- 'rising', 'stable', 'falling'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for trending_topics table
CREATE INDEX IF NOT EXISTS idx_trending_type ON trending_topics(type);
CREATE INDEX IF NOT EXISTS idx_trending_timestamp ON trending_topics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trending_score ON trending_topics(trend_score DESC);

-- Meta predictions
CREATE TABLE IF NOT EXISTS meta_predictions (
  id SERIAL PRIMARY KEY,
  champion VARCHAR(50) NOT NULL,
  role VARCHAR(20),
  prediction_type VARCHAR(30), -- 'early_adopter', 'counter_meta', 'pro_influence'
  confidence DECIMAL(5,2),
  expected_timeframe VARCHAR(50),
  source_region VARCHAR(10), -- KR, CN, etc.
  target_regions TEXT[],
  reasoning TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Create indexes for meta_predictions table
CREATE INDEX IF NOT EXISTS idx_predictions_champion ON meta_predictions(champion);
CREATE INDEX IF NOT EXISTS idx_predictions_confidence ON meta_predictions(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON meta_predictions(created_at DESC);

-- ===============================
-- Analytics & Cache Tables
-- ===============================

-- Champion performance cache
CREATE TABLE IF NOT EXISTS champion_performance (
  id SERIAL PRIMARY KEY,
  champion_id INTEGER NOT NULL,
  champion_name VARCHAR(50),
  region VARCHAR(10) NOT NULL,
  queue_id INTEGER,
  tier VARCHAR(20),
  games_analyzed INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2),
  pick_rate DECIMAL(5,2),
  ban_rate DECIMAL(5,2),
  average_kda DECIMAL(5,2),
  data JSONB,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (champion_id, region, queue_id, tier)
);

-- Create indexes for champion_performance table
CREATE INDEX IF NOT EXISTS idx_perf_champion ON champion_performance(champion_id);
CREATE INDEX IF NOT EXISTS idx_perf_region ON champion_performance(region);
CREATE INDEX IF NOT EXISTS idx_perf_updated ON champion_performance(last_updated DESC);

-- API cache for expensive operations
CREATE TABLE IF NOT EXISTS api_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for api_cache table
CREATE INDEX IF NOT EXISTS idx_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON api_cache(expires_at);

-- ===============================
-- n8n Integration Tables
-- ===============================

-- AI analysis cache for n8n workflows
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  analysis_result JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ai_analysis_cache table
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_analysis_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_created ON ai_analysis_cache(created_at DESC);

-- n8n workflow execution logs
CREATE TABLE IF NOT EXISTS n8n_workflows (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  execution_id VARCHAR(100),
  status VARCHAR(20), -- 'running', 'success', 'error', 'timeout'
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  execution_time INTEGER, -- in milliseconds
  brightdata_requests INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for n8n_workflows table
CREATE INDEX IF NOT EXISTS idx_n8n_name ON n8n_workflows(workflow_name);
CREATE INDEX IF NOT EXISTS idx_n8n_status ON n8n_workflows(status);
CREATE INDEX IF NOT EXISTS idx_n8n_created ON n8n_workflows(created_at DESC);

-- ===============================
-- User & Session Tables
-- ===============================

-- User favorites and preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  favorite_summoners JSONB DEFAULT '[]'::jsonb,
  favorite_champions JSONB DEFAULT '[]'::jsonb,
  default_region VARCHAR(10),
  notification_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_preferences table
CREATE INDEX IF NOT EXISTS idx_user_id ON user_preferences(user_id);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  search_type VARCHAR(20), -- 'summoner', 'champion', 'match'
  search_value VARCHAR(100),
  region VARCHAR(10),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for search_history table
CREATE INDEX IF NOT EXISTS idx_search_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_timestamp ON search_history(timestamp DESC);

-- ===============================
-- Monitoring & Logs
-- ===============================

-- API request logs
CREATE TABLE IF NOT EXISTS api_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time INTEGER, -- in milliseconds
  ip_address VARCHAR(45),
  user_agent TEXT,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for api_logs table
CREATE INDEX IF NOT EXISTS idx_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON api_logs(timestamp DESC);

-- BrightData usage tracking
CREATE TABLE IF NOT EXISTS brightdata_usage (
  id SERIAL PRIMARY KEY,
  request_type VARCHAR(50),
  target_url TEXT,
  success BOOLEAN,
  credits_used INTEGER,
  response_time INTEGER,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for brightdata_usage table
CREATE INDEX IF NOT EXISTS idx_bd_timestamp ON brightdata_usage(timestamp DESC);

-- ===============================
-- Functions & Triggers
-- ===============================

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM api_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- ===============================
-- Initial Data & Indexes
-- ===============================

-- Insert default regions
INSERT INTO api_cache (cache_key, cache_value, expires_at)
VALUES 
  ('regions', '{"regions": ["na1", "euw1", "kr", "jp1", "eun1", "br1", "la1", "la2", "oc1", "ru", "tr1"]}'::jsonb, NOW() + INTERVAL '30 days')
ON CONFLICT (cache_key) DO NOTHING;

-- Create composite indexes for common queries
CREATE INDEX idx_match_summoner ON matches USING gin(participants);
CREATE INDEX idx_analysis_participants ON fourteen_min_analysis USING gin(participants);
CREATE INDEX idx_multi_analysis ON multi_source_stats USING gin(analysis);

-- ===============================
-- Permissions (if needed)
-- ===============================

-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;