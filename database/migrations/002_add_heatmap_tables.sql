-- Migration: Add heatmap and timeline tracking tables
-- Date: 2025-08-20
-- Purpose: Store position, ward, and combat data for heatmap visualization

-- Position history table for tracking player movements
CREATE TABLE IF NOT EXISTS position_history (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL,
    participant_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL, -- Game time in seconds
    x_position INTEGER NOT NULL,
    y_position INTEGER NOT NULL,
    champion_level INTEGER NOT NULL,
    current_gold INTEGER NOT NULL,
    total_gold INTEGER NOT NULL,
    cs INTEGER NOT NULL, -- Combined minions + jungle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_position_match ON position_history(match_id);
CREATE INDEX IF NOT EXISTS idx_position_participant ON position_history(match_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_position_time ON position_history(match_id, timestamp);

-- Ward placement events table
CREATE TABLE IF NOT EXISTS ward_events (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL,
    participant_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    x_position INTEGER NOT NULL,
    y_position INTEGER NOT NULL,
    ward_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ward_match ON ward_events(match_id);
CREATE INDEX IF NOT EXISTS idx_ward_participant ON ward_events(match_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_ward_time ON ward_events(match_id, timestamp);

-- Combat events table (kills/deaths)
CREATE TABLE IF NOT EXISTS combat_events (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL,
    timestamp INTEGER NOT NULL,
    x_position INTEGER NOT NULL,
    y_position INTEGER NOT NULL,
    killer_id INTEGER NOT NULL,
    victim_id INTEGER NOT NULL,
    assisting_participant_ids INTEGER[] DEFAULT '{}',
    kill_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_combat_match ON combat_events(match_id);
CREATE INDEX IF NOT EXISTS idx_combat_time ON combat_events(match_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_combat_killer ON combat_events(match_id, killer_id);
CREATE INDEX IF NOT EXISTS idx_combat_victim ON combat_events(match_id, victim_id);

-- Heatmap cache table for pre-calculated heatmaps
CREATE TABLE IF NOT EXISTS heatmap_cache (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL UNIQUE,
    heatmap_type VARCHAR(50) NOT NULL, -- 'position', 'ward', 'combat', 'cs'
    grid_size INTEGER NOT NULL DEFAULT 50,
    grid_data JSONB NOT NULL, -- 2D array stored as JSON
    metadata JSONB, -- Additional metadata (participant info, time range, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_heatmap_match_type ON heatmap_cache(match_id, heatmap_type);
CREATE INDEX IF NOT EXISTS idx_heatmap_expires ON heatmap_cache(expires_at);

-- Function to clean up expired heatmap cache
CREATE OR REPLACE FUNCTION cleanup_expired_heatmaps()
RETURNS void AS $$
BEGIN
    DELETE FROM heatmap_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create a view for aggregated position density
CREATE OR REPLACE VIEW position_density AS
SELECT 
    match_id,
    participant_id,
    FLOOR(x_position / 320) as grid_x, -- 16000 / 50 = 320 per grid cell
    FLOOR(y_position / 320) as grid_y,
    COUNT(*) as density,
    AVG(champion_level) as avg_level,
    AVG(total_gold) as avg_gold
FROM position_history
WHERE timestamp <= 840 -- First 14 minutes
GROUP BY match_id, participant_id, grid_x, grid_y;

-- Create a view for ward placement patterns
CREATE OR REPLACE VIEW ward_patterns AS
SELECT 
    match_id,
    ward_type,
    FLOOR(x_position / 320) as grid_x,
    FLOOR(y_position / 320) as grid_y,
    COUNT(*) as ward_count,
    MIN(timestamp) as first_placed,
    MAX(timestamp) as last_placed
FROM ward_events
WHERE timestamp <= 840
GROUP BY match_id, ward_type, grid_x, grid_y;

-- Create a view for combat hotspots
CREATE OR REPLACE VIEW combat_hotspots AS
SELECT 
    match_id,
    FLOOR(x_position / 320) as grid_x,
    FLOOR(y_position / 320) as grid_y,
    COUNT(*) as kill_count,
    COUNT(DISTINCT killer_id) as unique_killers,
    COUNT(DISTINCT victim_id) as unique_victims,
    AVG(timestamp) as avg_time
FROM combat_events
WHERE timestamp <= 840
GROUP BY match_id, grid_x, grid_y;

-- Add comments for documentation
COMMENT ON TABLE position_history IS 'Stores player position data from match timelines for heatmap generation';
COMMENT ON TABLE ward_events IS 'Stores ward placement events for vision analysis';
COMMENT ON TABLE combat_events IS 'Stores combat events (kills/deaths) for combat heatmap analysis';
COMMENT ON TABLE heatmap_cache IS 'Caches pre-calculated heatmap grids to improve performance';
COMMENT ON VIEW position_density IS 'Aggregated view of position density for quick heatmap queries';
COMMENT ON VIEW ward_patterns IS 'Aggregated view of ward placement patterns';
COMMENT ON VIEW combat_hotspots IS 'Aggregated view of combat activity by map region';