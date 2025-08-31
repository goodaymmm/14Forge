-- ===============================
-- Knowledge Base Tables Migration
-- ===============================
-- Created: 2025-08-22
-- Purpose: Support for Riot API Data Dragon and champion build metadata

-- Static data cache for Riot API Data Dragon
CREATE TABLE IF NOT EXISTS static_data_cache (
  id SERIAL PRIMARY KEY,
  data_type VARCHAR(20) NOT NULL, -- 'champions', 'items', 'runes'
  patch_version VARCHAR(20) NOT NULL,
  language VARCHAR(10) DEFAULT 'ja_JP',
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(data_type, patch_version, language)
);

-- Create indexes for static_data_cache
CREATE INDEX IF NOT EXISTS idx_static_data_type ON static_data_cache(data_type);
CREATE INDEX IF NOT EXISTS idx_static_data_patch ON static_data_cache(patch_version);
CREATE INDEX IF NOT EXISTS idx_static_data_language ON static_data_cache(language);

-- Champion build metadata from web scraping
CREATE TABLE IF NOT EXISTS champion_builds (
  id SERIAL PRIMARY KEY,
  champion_id VARCHAR(50) NOT NULL,
  patch_version VARCHAR(20) NOT NULL,
  role VARCHAR(20), -- 'TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'SUPPORT'
  source VARCHAR(20), -- 'opgg', 'ugg', 'mobalytics'
  
  -- Build information
  core_items JSONB, -- [{itemId: string, order: number, winRate: number}]
  situational_items JSONB,
  starting_items JSONB,
  boots JSONB,
  
  -- Rune configuration
  primary_rune_tree VARCHAR(50),
  primary_runes JSONB,
  secondary_rune_tree VARCHAR(50),
  secondary_runes JSONB,
  stat_shards JSONB,
  
  -- Skill order
  skill_order JSONB, -- ['Q', 'W', 'E', 'Q', 'Q', 'R', ...]
  skill_priority VARCHAR(10), -- 'Q>W>E' format
  
  -- Statistics
  win_rate DECIMAL(5,2),
  pick_rate DECIMAL(5,2),
  ban_rate DECIMAL(5,2),
  games_played INTEGER,
  tier VARCHAR(10), -- 'S', 'A', 'B', 'C', 'D'
  
  -- Counter and synergy information
  counters JSONB, -- [{championId: string, winRate: number}]
  synergies JSONB, -- [{championId: string, winRate: number}]
  
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(champion_id, patch_version, role, source)
);

-- Create indexes for champion_builds
CREATE INDEX IF NOT EXISTS idx_builds_champion ON champion_builds(champion_id);
CREATE INDEX IF NOT EXISTS idx_builds_patch ON champion_builds(patch_version);
CREATE INDEX IF NOT EXISTS idx_builds_role ON champion_builds(role);
CREATE INDEX IF NOT EXISTS idx_builds_source ON champion_builds(source);
CREATE INDEX IF NOT EXISTS idx_builds_tier ON champion_builds(tier);

-- Calculated stats at 14 minutes (for caching computed values)
CREATE TABLE IF NOT EXISTS calculated_stats_14min (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(50) NOT NULL,
  participant_id INTEGER NOT NULL,
  champion_id VARCHAR(50),
  
  -- Base stats at level (with items)
  level INTEGER,
  total_ad DECIMAL(10,2),
  total_ap DECIMAL(10,2),
  total_attack_speed DECIMAL(10,4),
  total_crit_chance DECIMAL(5,2),
  total_armor DECIMAL(10,2),
  total_magic_resist DECIMAL(10,2),
  total_health DECIMAL(10,2),
  total_mana DECIMAL(10,2),
  total_movement_speed DECIMAL(10,2),
  
  -- Damage calculations
  estimated_dps DECIMAL(10,2),
  burst_damage DECIMAL(10,2),
  true_damage_potential DECIMAL(10,2),
  
  -- Defensive calculations
  effective_health_physical DECIMAL(10,2),
  effective_health_magical DECIMAL(10,2),
  
  -- Item build at 14 min
  items JSONB, -- Array of item IDs
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, participant_id)
);

-- Create indexes for calculated_stats_14min
CREATE INDEX IF NOT EXISTS idx_calc_stats_match ON calculated_stats_14min(match_id);
CREATE INDEX IF NOT EXISTS idx_calc_stats_champion ON calculated_stats_14min(champion_id);

-- Patch version tracking
CREATE TABLE IF NOT EXISTS patch_versions (
  id SERIAL PRIMARY KEY,
  patch_version VARCHAR(20) UNIQUE NOT NULL,
  release_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  data_dragon_url VARCHAR(255),
  notes_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for current patch lookup
CREATE INDEX IF NOT EXISTS idx_patch_current ON patch_versions(is_current) WHERE is_current = TRUE;

-- Function to update patch version status
CREATE OR REPLACE FUNCTION update_current_patch()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    -- Set all other patches to not current
    UPDATE patch_versions 
    SET is_current = FALSE 
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one current patch
DROP TRIGGER IF EXISTS ensure_single_current_patch ON patch_versions;
CREATE TRIGGER ensure_single_current_patch
  BEFORE INSERT OR UPDATE ON patch_versions
  FOR EACH ROW
  WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION update_current_patch();

-- Comments for documentation
COMMENT ON TABLE static_data_cache IS 'Cache for Riot API Data Dragon static data (champions, items, runes)';
COMMENT ON TABLE champion_builds IS 'Champion build metadata scraped from OP.GG, U.GG, Mobalytics';
COMMENT ON TABLE calculated_stats_14min IS 'Pre-calculated champion stats at 14 minutes including item effects';
COMMENT ON TABLE patch_versions IS 'Track LoL patch versions and current active patch';