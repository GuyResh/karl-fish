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

    // Prepare sessions for bulk insert
    const sessionsToInsert = sessions.map(session => ({
      user_id: profile.id,
      session_data: session,
      privacy_level: session.shared ? 'friends' : 'private'
    }));

    // Use upsert to handle both inserts and updates
    const { error } = await supabase
      .from('sessions')
      .upsert(sessionsToInsert, {
        onConflict: 'user_id,session_data->id',
        ignoreDuplicates: false
      });

    if (error) throw error;
  }
}
