import { supabase, Session, Profile } from '../lib/supabase';
import { AuthService } from './authService';
import { FriendService } from './friendService';
import { FishingSession } from '../types';

export class SharingService {
  static async shareSession(
    session: FishingSession, 
    privacyLevel: 'public' | 'friends' | 'private',
    specificFriendIds?: string[]
  ) {
    const profile = await AuthService.getCurrentProfile();
    if (!profile) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: profile.id,
        session_data: session,
        privacy_level: privacyLevel
      })
      .select()
      .single();

    if (error) throw error;

    // If specific friends are selected, create friend-specific permissions
    if (specificFriendIds && specificFriendIds.length > 0) {
      await this.createSpecificFriendPermissions(data.id, specificFriendIds);
    }

    return data;
  }

  static async getSharedSessions(): Promise<Session[]> {
    const profile = await AuthService.getCurrentProfile();
    if (!profile) throw new Error('Not authenticated');

    // Get user's friends
    const friends = await FriendService.getFriends();
    const friendIds = friends.map(f => f.id);

    // Get public sessions and friend sessions
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        user:profiles(*)
      `)
      .or(`privacy_level.eq.public,and(privacy_level.eq.friends,user_id.in.(${friendIds.join(',')}))`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getUserSessions(): Promise<Session[]> {
    const profile = await AuthService.getCurrentProfile();
    if (!profile) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        user:profiles(*)
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async deleteSession(sessionId: string) {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  static async updateSessionPrivacy(sessionId: string, privacyLevel: 'public' | 'friends' | 'private') {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('sessions')
      .update({ privacy_level: privacyLevel })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  static async getFriendsForSharing(): Promise<Profile[]> {
    return await FriendService.getFriends();
  }

  private static async createSpecificFriendPermissions(_sessionId: string, friendIds: string[]) {
    // This would be implemented with a separate table for session-specific friend permissions
    // For now, we'll use the general friend permissions
    for (const friendId of friendIds) {
      await FriendService.updateFriendPermissions(friendId, {
        can_view_sessions: true,
        can_view_catches: true,
        can_view_location: true
      });
    }
  }

  static async getActivityFeed(): Promise<Session[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get friends
    const friends = await FriendService.getFriends();
    const friendIds = friends.map(f => f.id);

    if (friendIds.length === 0) {
      // If no friends, return public sessions only
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('privacy_level', 'public')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    }

    // Get sessions from friends and public sessions
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        user:profiles(*)
      `)
      .or(`privacy_level.eq.public,and(privacy_level.eq.friends,user_id.in.(${friendIds.join(',')}))`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  // New method for bulk session upload
  static async uploadSessions(sessions: FishingSession[]): Promise<void> {
    const profile = await AuthService.getCurrentProfile();
    if (!profile) throw new Error('Not authenticated');

    // Ensure we have a valid session for RLS
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('Authentication error:', sessionError);
      throw new Error('No valid authentication session. Please sign in again.');
    }
    
    // console.log('User authenticated:', session.user.email);
    // console.log('Auth UID:', session.user.id);
    // console.log('Profile ID:', profile.id);
    // console.log('UIDs match:', session.user.id === profile.id);

    if (sessions.length === 0) {
      console.log('No sessions to upload');
      return;
    }

    console.log(`Uploading ${sessions.length} sessions in batches...`);

    // Process sessions in batches of 100 to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      await this.uploadSessionBatch(profile.id, batch);
      // console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sessions.length / batchSize)}`);
    }

    // console.log(`Successfully uploaded ${sessions.length} sessions`);
  }

  private static async uploadSessionBatch(userId: string, sessions: FishingSession[]): Promise<void> {
    try {
      // Get all existing sessions for this user in one query
      const sessionIds = sessions.map(s => s.id);
      const { data: existingSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id, session_data')
        .eq('user_id', userId)
        .in('session_data->>id', sessionIds);

      if (fetchError) {
        console.error('Error fetching existing sessions:', fetchError);
        throw fetchError;
      }

      // Create a map of existing sessions for quick lookup
      const existingMap = new Map();
      if (existingSessions) {
        existingSessions.forEach(session => {
          const sessionDataId = session.session_data?.id;
          if (sessionDataId) {
            existingMap.set(sessionDataId, session.id);
          }
        });
      }

      console.log(`Found ${existingMap.size} existing sessions out of ${sessions.length} to process`);

      // Filter out sessions that already exist and haven't changed
      const sessionsToUpsert = sessions
        .filter(session => {
          const existingId = existingMap.get(session.id);
          // Only include if it's new or if we don't have the existing ID
          return !existingId;
        })
        .map(session => ({
          user_id: userId,
          session_data: session,
          privacy_level: session.shared ? 'friends' : 'private'
        }));

      console.log(`Processing ${sessionsToUpsert.length} new sessions (${sessions.length - sessionsToUpsert.length} already exist)`);
      
      // Skip if no new sessions to process
      if (sessionsToUpsert.length === 0) {
        console.log('No new sessions to upload in this batch');
        return;
      }
      
      // Use upsert - Supabase should handle conflicts based on primary key
      const { error: upsertError } = await supabase
        .from('sessions')
        .upsert(sessionsToUpsert);
      
      if (upsertError) {
        console.error('Upsert error:', upsertError);
        throw upsertError;
      }
      
      // console.log(`Upserted ${sessionsToUpsert.length} sessions`);

    } catch (error) {
      console.error('Error uploading session batch:', error);
      throw error;
    }
  }
}
