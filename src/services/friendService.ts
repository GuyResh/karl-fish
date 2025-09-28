import { supabase, Friendship, Profile, FriendPermission } from '../lib/supabase';
import { AuthService } from './authService';

export class FriendService {
  static async sendFriendRequest(friendId: string) {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: friendId,
        status: 'pending'
      });

    if (error) throw error;
  }

  // Alias for sendFriendRequest for easier use
  static async addFriend(friendId: string) {
    return this.sendFriendRequest(friendId);
  }

  static async acceptFriendRequest(requestId: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) throw error;

    // Create default permissions
    await this.createDefaultPermissions(requestId);
  }

  static async declineFriendRequest(requestId: string) {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  }

  static async removeFriend(friendId: string) {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`);

    if (error) throw error;
  }

  static async blockUser(userId: string) {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // First remove any existing friendship
    await this.removeFriend(userId);

    // Then create blocked relationship
    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: userId,
        status: 'blocked'
      });

    if (error) throw error;
  }

  static async unblockUser(userId: string) {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', user.id)
      .eq('addressee_id', userId)
      .eq('status', 'blocked');

    if (error) throw error;
  }

  static async getFriends(): Promise<Profile[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        requester_id,
        addressee_id,
        requester:profiles!requester_id(*),
        addressee:profiles!addressee_id(*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error) throw error;

    const friends: Profile[] = [];
    data?.forEach(friendship => {
      if (friendship.requester_id === user.id) {
        friends.push(friendship.addressee as unknown as Profile);
      } else {
        friends.push(friendship.requester as unknown as Profile);
      }
    });

    return friends;
  }

  static async getPendingRequests(): Promise<Friendship[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:profiles!requester_id(*)
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  }

  static async getSentRequests(): Promise<Friendship[]> {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        addressee:profiles!addressee_id(*)
      `)
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  }

  static async getFriendPermissions(friendId: string): Promise<FriendPermission | null> {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friend_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async updateFriendPermissions(friendId: string, permissions: Partial<FriendPermission>) {
    const user = await AuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friend_permissions')
      .upsert({
        user_id: user.id,
        friend_id: friendId,
        ...permissions
      });

    if (error) throw error;
  }

  private static async createDefaultPermissions(requestId: string) {
    const { data: friendship } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('id', requestId)
      .single();

    if (friendship) {
      // Create permissions for both users
      await supabase
        .from('friend_permissions')
        .insert([
          {
            user_id: friendship.requester_id,
            friend_id: friendship.addressee_id,
            can_view_sessions: true,
            can_view_catches: true,
            can_view_location: true
          },
          {
            user_id: friendship.addressee_id,
            friend_id: friendship.requester_id,
            can_view_sessions: true,
            can_view_catches: true,
            can_view_location: true
          }
        ]);
    }
  }
}
