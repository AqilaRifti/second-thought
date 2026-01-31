-- Second Thought Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  savings_goal DECIMAL,
  monthly_budget DECIMAL,
  financial_goals TEXT[] DEFAULT '{}',
  spending_threshold DECIMAL DEFAULT 20,
  cooldown_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cool-down records table
CREATE TABLE IF NOT EXISTS cooldowns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
  product_url TEXT NOT NULL,
  product_info JSONB NOT NULL,
  analysis_result JSONB NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intervention history table (for analytics)
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
  product_info JSONB NOT NULL,
  analysis_result JSONB NOT NULL,
  user_action TEXT NOT NULL CHECK (user_action IN ('dismissed', 'cooldown_started', 'proceeded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cooldowns_user_id ON cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_cooldowns_product_url ON cooldowns(product_url);
CREATE INDEX IF NOT EXISTS idx_cooldowns_status ON cooldowns(status);
CREATE INDEX IF NOT EXISTS idx_cooldowns_expires_at ON cooldowns(expires_at);
CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_created_at ON interventions(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (in production, you'd use auth.uid())
-- These policies allow the service role to access all data
CREATE POLICY "Allow all for user_profiles" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Allow all for cooldowns" ON cooldowns FOR ALL USING (true);
CREATE POLICY "Allow all for interventions" ON interventions FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire cooldowns
CREATE OR REPLACE FUNCTION expire_cooldowns()
RETURNS void AS $$
BEGIN
  UPDATE cooldowns
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ language 'plpgsql';
