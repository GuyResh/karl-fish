-- Karl Fish Database Schema for Supabase
-- This schema is idempotent - safe to run multiple times without affecting existing data
-- 
-- IDEMPOTENT FEATURES:
-- - Uses CREATE TABLE IF NOT EXISTS
-- - Uses CREATE INDEX IF NOT EXISTS  
-- - Uses DROP POLICY IF EXISTS before CREATE POLICY
-- - Uses DROP TRIGGER IF EXISTS before CREATE TRIGGER
-- - Uses CREATE OR REPLACE for functions
-- - Preserves existing data and settings
--
-- Run this in your Supabase SQL editor

-- Enable Row Level Security (idempotent)
-- Note: This setting may require superuser privileges
-- DO $$
-- BEGIN
--   -- Only set if not already configured
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_settings 
--     WHERE name = 'app.jwt_secret' 
--     AND setting IS NOT NULL 
--     AND setting != ''
--   ) THEN
--     ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';
--   END IF;
-- EXCEPTION
--   WHEN insufficient_privilege THEN
--     RAISE NOTICE 'Insufficient privileges to set app.jwt_secret. This may need to be set manually.';
--   WHEN OTHERS THEN
--     RAISE NOTICE 'Could not set app.jwt_secret: %', SQLERRM;
-- END $$;

-- Create profiles table (extends auth.users) - idempotent
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  initials TEXT NOT NULL CHECK (length(initials) = 3),
  display_name TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create friendships table - idempotent
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) NOT NULL,
  addressee_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create friend_permissions table - idempotent
CREATE TABLE IF NOT EXISTS friend_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  friend_id UUID REFERENCES profiles(id) NOT NULL,
  can_view_sessions BOOLEAN DEFAULT true,
  can_view_catches BOOLEAN DEFAULT true,
  can_view_location BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create shared_sessions table - idempotent
CREATE TABLE IF NOT EXISTS shared_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  session_data JSONB NOT NULL,
  privacy_level TEXT CHECK (privacy_level IN ('public', 'friends', 'private')) DEFAULT 'friends',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance - idempotent
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_user ON shared_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_privacy ON shared_sessions(privacy_level);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_created ON shared_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_updated ON shared_sessions(updated_at);

-- Create function to update updated_at timestamp - idempotent
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for shared_sessions updated_at - idempotent
DROP TRIGGER IF EXISTS update_shared_sessions_updated_at ON shared_sessions;
CREATE TRIGGER update_shared_sessions_updated_at
    BEFORE UPDATE ON shared_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies - idempotent

-- Profiles policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Friendships policies
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can create friendship requests" ON friendships;
CREATE POLICY "Users can create friendship requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update own friendship requests" ON friendships;
CREATE POLICY "Users can update own friendship requests" ON friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Friend permissions policies
ALTER TABLE friend_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own permissions" ON friend_permissions;
CREATE POLICY "Users can view own permissions" ON friend_permissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own permissions" ON friend_permissions;
CREATE POLICY "Users can manage own permissions" ON friend_permissions
  FOR ALL USING (auth.uid() = user_id);

-- Shared sessions policies
ALTER TABLE shared_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public sessions" ON shared_sessions;
CREATE POLICY "Users can view public sessions" ON shared_sessions
  FOR SELECT USING (privacy_level = 'public');

DROP POLICY IF EXISTS "Users can view friends' sessions" ON shared_sessions;
CREATE POLICY "Users can view friends' sessions" ON shared_sessions
  FOR SELECT USING (
    privacy_level = 'friends' AND
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
      AND status = 'accepted'
      AND (requester_id = user_id OR addressee_id = user_id)
    )
  );

DROP POLICY IF EXISTS "Users can view own sessions" ON shared_sessions;
CREATE POLICY "Users can view own sessions" ON shared_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON shared_sessions;
CREATE POLICY "Users can insert own sessions" ON shared_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON shared_sessions;
CREATE POLICY "Users can update own sessions" ON shared_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON shared_sessions;
CREATE POLICY "Users can delete own sessions" ON shared_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Functions

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, initials, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'initials', 'USR'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup - idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create default friend permissions
CREATE OR REPLACE FUNCTION public.create_friend_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Create permissions for both users when friendship is accepted
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO friend_permissions (user_id, friend_id, can_view_sessions, can_view_catches, can_view_location)
    VALUES 
      (NEW.requester_id, NEW.addressee_id, true, true, true),
      (NEW.addressee_id, NEW.requester_id, true, true, true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create permissions when friendship is accepted - idempotent
DROP TRIGGER IF EXISTS on_friendship_accepted ON friendships;
CREATE TRIGGER on_friendship_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION public.create_friend_permissions();

-- Function to get user email by username
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(username_param TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT au.email INTO user_email
  FROM auth.users au
  JOIN profiles p ON au.id = p.id
  WHERE p.username = username_param;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get profile with email
CREATE OR REPLACE FUNCTION public.get_profile_with_email(profile_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  initials TEXT,
  display_name TEXT,
  email TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.initials,
    p.display_name,
    au.email,
    p.bio,
    p.location,
    p.created_at,
    p.updated_at
  FROM profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;