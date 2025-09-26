-- Karl Fish Database Schema for Supabase
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  initials TEXT NOT NULL CHECK (length(initials) = 3),
  display_name TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create friendships table
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users NOT NULL,
  addressee_id UUID REFERENCES auth.users NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create friend_permissions table
CREATE TABLE friend_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  friend_id UUID REFERENCES auth.users NOT NULL,
  can_view_sessions BOOLEAN DEFAULT true,
  can_view_catches BOOLEAN DEFAULT true,
  can_view_location BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create shared_sessions table
CREATE TABLE shared_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_data JSONB NOT NULL,
  privacy_level TEXT CHECK (privacy_level IN ('public', 'friends', 'private')) DEFAULT 'friends',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_shared_sessions_user ON shared_sessions(user_id);
CREATE INDEX idx_shared_sessions_privacy ON shared_sessions(privacy_level);
CREATE INDEX idx_shared_sessions_created ON shared_sessions(created_at);

-- Row Level Security Policies

-- Profiles policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Friendships policies
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friendship requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update own friendship requests" ON friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Friend permissions policies
ALTER TABLE friend_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions" ON friend_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own permissions" ON friend_permissions
  FOR ALL USING (auth.uid() = user_id);

-- Shared sessions policies
ALTER TABLE shared_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public sessions" ON shared_sessions
  FOR SELECT USING (privacy_level = 'public');

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

CREATE POLICY "Users can view own sessions" ON shared_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON shared_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON shared_sessions
  FOR UPDATE USING (auth.uid() = user_id);

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

-- Trigger to create profile on user signup
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

-- Trigger to create permissions when friendship is accepted
CREATE TRIGGER on_friendship_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION public.create_friend_permissions();
