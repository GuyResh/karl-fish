import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  username: string;
  name: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface Session {
  id: string;
  user_id: string;
  session_data: any;
  privacy_level: 'public' | 'friends' | 'private';
  created_at: string;
  updated_at: string;
  user?: Profile;
}

// Keep SharedSession for backward compatibility
export type SharedSession = Session;

export interface FriendPermission {
  id: string;
  user_id: string;
  friend_id: string;
  can_view_sessions: boolean;
  can_view_catches: boolean;
  can_view_location: boolean;
  created_at: string;
}
