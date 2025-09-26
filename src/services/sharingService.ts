import { supabase, SharedSession, Profile } from '../lib/supabase';
import { AuthService } from './authService';
import { FriendService } from './friendService';
import { FishingSession } from '../types';

export class SharingService {
  static async shareSession(
    session: FishingSession, 
    privacyLevel: 'public' | 'friends' | 'private',
    specificFriendIds?: string[]
  ) {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('shared_sessions')
      .insert({
        user_id: user.id,
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

  static async getSharedSessions(): Promise<SharedSession[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's friends
    const friends = await FriendService.getFriends();
    const friendIds = friends.map(f => f.id);

    // Get public sessions and friend sessions
    const { data, error } = await supabase
      .from('shared_sessions')
      .select(`
        *,
        user:profiles(*)
      `)
      .or(`privacy_level.eq.public,and(privacy_level.eq.friends,user_id.in.(${friendIds.join(',')}))`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getUserSessions(): Promise<SharedSession[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('shared_sessions')
      .select(`
        *,
        user:profiles(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async deleteSharedSession(sessionId: string) {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('shared_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  static async updateSessionPrivacy(sessionId: string, privacyLevel: 'public' | 'friends' | 'private') {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('shared_sessions')
      .update({ privacy_level: privacyLevel })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  static async getFriendsForSharing(): Promise<Profile[]> {
    return await FriendService.getFriends();
  }

  private static async createSpecificFriendPermissions(sessionId: string, friendIds: string[]) {
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

  static async getActivityFeed(): Promise<SharedSession[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get friends
    const friends = await FriendService.getFriends();
    const friendIds = friends.map(f => f.id);

    if (friendIds.length === 0) {
      // If no friends, return public sessions only
      const { data, error } = await supabase
        .from('shared_sessions')
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
      .from('shared_sessions')
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
}
