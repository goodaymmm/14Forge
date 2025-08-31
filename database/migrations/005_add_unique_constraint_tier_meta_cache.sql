-- Migration: Add unique constraint to tier_meta_cache table
-- Purpose: Enable ON CONFLICT clause for UPSERT operations
-- Created: 2025-08-29

-- Add unique constraint on the combination of champion, tier, role, server, and source
-- This ensures only one record exists for each unique combination
ALTER TABLE tier_meta_cache 
ADD CONSTRAINT unique_tier_meta_cache 
UNIQUE (champion, tier, role, server, source);

-- Comment on constraint for documentation
COMMENT ON CONSTRAINT unique_tier_meta_cache ON tier_meta_cache IS 'Ensures unique combination of champion, tier, role, server, and source for proper UPSERT operations';