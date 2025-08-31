-- Migration: Add tier_meta_cache table for BrightData scraped tier-specific champion data
-- Purpose: Store cached tier-specific champion meta data scraped from external sources
-- Created: 2025-08-28

-- Create tier_meta_cache table
CREATE TABLE IF NOT EXISTS tier_meta_cache (
    id SERIAL PRIMARY KEY,
    champion VARCHAR(50) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    role VARCHAR(20),
    server VARCHAR(10) NOT NULL,
    scraped_data JSONB NOT NULL,
    source VARCHAR(50), -- 'opgg', 'ugg', 'mobalytics', etc.
    data_version VARCHAR(20), -- League patch version if available
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Create indexes for efficient querying
CREATE INDEX idx_tier_meta_cache_champion_tier ON tier_meta_cache(champion, tier);
CREATE INDEX idx_tier_meta_cache_role_tier ON tier_meta_cache(role, tier);
CREATE INDEX idx_tier_meta_cache_expires ON tier_meta_cache(expires_at);
CREATE INDEX idx_tier_meta_cache_server ON tier_meta_cache(server);
CREATE INDEX idx_tier_meta_cache_source ON tier_meta_cache(source);

-- Create composite index for common query pattern
CREATE INDEX idx_tier_meta_cache_lookup ON tier_meta_cache(champion, tier, role, server);

-- Add trigger to automatically clean up expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_tier_meta_cache()
RETURNS trigger AS $$
BEGIN
    DELETE FROM tier_meta_cache WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs cleanup once per day
CREATE OR REPLACE FUNCTION should_cleanup_tier_meta_cache()
RETURNS boolean AS $$
DECLARE
    last_cleanup TIMESTAMP;
BEGIN
    -- Check if cleanup was done today
    SELECT MAX(created_at) INTO last_cleanup
    FROM tier_meta_cache
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- If no entries today or more than 24 hours since last cleanup
    RETURN last_cleanup IS NULL OR 
           (CURRENT_TIMESTAMP - last_cleanup) > INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Comment on table for documentation
COMMENT ON TABLE tier_meta_cache IS 'Stores cached tier-specific champion meta data from BrightData web scraping with 7-day expiration';
COMMENT ON COLUMN tier_meta_cache.champion IS 'Champion name (e.g., Ahri, LeeSin)';
COMMENT ON COLUMN tier_meta_cache.tier IS 'Rank tier (IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER)';
COMMENT ON COLUMN tier_meta_cache.role IS 'Champion role (TOP, JUNGLE, MID, ADC, SUPPORT)';
COMMENT ON COLUMN tier_meta_cache.server IS 'Server region (kr, na, euw, etc.)';
COMMENT ON COLUMN tier_meta_cache.scraped_data IS 'JSON data containing builds, runes, stats from scraped sources';
COMMENT ON COLUMN tier_meta_cache.source IS 'Data source identifier (opgg, ugg, mobalytics, etc.)';
COMMENT ON COLUMN tier_meta_cache.data_version IS 'League of Legends patch version';
COMMENT ON COLUMN tier_meta_cache.expires_at IS 'Automatic expiration timestamp (7 days from creation)';