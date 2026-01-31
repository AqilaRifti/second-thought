-- Migration: Fix user_id type from UUID to TEXT
-- This allows using custom string IDs (like browser fingerprints) instead of auto-generated UUIDs

-- Step 1: Drop foreign key constraints
ALTER TABLE cooldowns DROP CONSTRAINT IF EXISTS cooldowns_user_id_fkey;
ALTER TABLE interventions DROP CONSTRAINT IF EXISTS interventions_user_id_fkey;

-- Step 2: Alter column types
ALTER TABLE user_profiles ALTER COLUMN id TYPE TEXT;
ALTER TABLE user_profiles ALTER COLUMN id DROP DEFAULT;

ALTER TABLE cooldowns ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE interventions ALTER COLUMN user_id TYPE TEXT;

-- Step 3: Re-add foreign key constraints
ALTER TABLE cooldowns 
  ADD CONSTRAINT cooldowns_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE interventions 
  ADD CONSTRAINT interventions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Step 4: Drop the uuid-ossp extension if no longer needed
-- (Comment this out if you're using UUIDs elsewhere)
-- DROP EXTENSION IF EXISTS "uuid-ossp";
