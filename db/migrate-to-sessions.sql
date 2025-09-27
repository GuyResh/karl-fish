-- Migration script to rename shared_sessions to sessions
-- Run this AFTER running the main schema.sql file

-- Step 1: Rename the table
ALTER TABLE shared_sessions RENAME TO sessions;

-- Step 2: Update indexes
DROP INDEX IF EXISTS idx_shared_sessions_user;
DROP INDEX IF EXISTS idx_shared_sessions_privacy;
DROP INDEX IF EXISTS idx_shared_sessions_created;
DROP INDEX IF EXISTS idx_shared_sessions_updated;

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_privacy ON sessions(privacy_level);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);

-- Step 3: Update triggers
DROP TRIGGER IF EXISTS update_shared_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Update RLS policies (drop old ones first)
DROP POLICY IF EXISTS "Users can view public sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view friends' sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

-- Create new policies
CREATE POLICY "Users can view public sessions" ON sessions
  FOR SELECT USING (privacy_level = 'public');

CREATE POLICY "Users can view friends' sessions" ON sessions
  FOR SELECT USING (
    privacy_level = 'friends' AND
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
      AND status = 'accepted'
      AND (requester_id = user_id OR addressee_id = user_id)
    )
  );

CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Add unique constraint for upsert functionality
-- This allows the upsert to work properly in the SharingService
ALTER TABLE sessions ADD CONSTRAINT unique_user_session 
  UNIQUE (user_id, (session_data->>'id'));
