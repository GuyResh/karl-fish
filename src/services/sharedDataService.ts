import { db } from '../database';
import { Profile, Session, Friendship, FriendPermission } from '../lib/supabase';

export class SharedDataService {
  // Profile operations
  static async saveProfiles(profiles: Profile[]): Promise<void> {
    await db.transaction('rw', [db.sharedProfiles], async () => {
      // Clear existing profiles and save new ones
      await db.sharedProfiles.clear();
      if (profiles.length > 0) {
        await db.sharedProfiles.bulkAdd(profiles);
      }
    });
  }

  static async getProfiles(): Promise<Profile[]> {
    return await db.sharedProfiles.toArray();
  }

  static async getProfileById(id: string): Promise<Profile | undefined> {
    return await db.sharedProfiles.get(id);
  }

  // Session operations
  static async saveSessions(sessions: Session[]): Promise<void> {
    await db.transaction('rw', [db.sharedSessions], async () => {
      // Clear existing sessions and save new ones
      await db.sharedSessions.clear();
      if (sessions.length > 0) {
        await db.sharedSessions.bulkAdd(sessions);
      }
    });
  }

  static async getSessions(): Promise<Session[]> {
    return await db.sharedSessions.toArray();
  }

  static async getSessionsByUserId(userId: string): Promise<Session[]> {
    return await db.sharedSessions.where('user_id').equals(userId).toArray();
  }

  static async getSessionById(id: string): Promise<Session | undefined> {
    return await db.sharedSessions.get(id);
  }

  // Friendship operations
  static async saveFriendships(friendships: Friendship[]): Promise<void> {
    await db.transaction('rw', [db.friendships], async () => {
      // Clear existing friendships and save new ones
      await db.friendships.clear();
      if (friendships.length > 0) {
        await db.friendships.bulkAdd(friendships);
      }
    });
  }

  static async getFriendships(): Promise<Friendship[]> {
    return await db.friendships.toArray();
  }

  static async getFriendshipsByUserId(userId: string): Promise<Friendship[]> {
    return await db.friendships
      .where('requester_id')
      .equals(userId)
      .or('addressee_id')
      .equals(userId)
      .toArray();
  }

  // Friend permission operations
  static async saveFriendPermissions(permissions: FriendPermission[]): Promise<void> {
    await db.transaction('rw', [db.friendPermissions], async () => {
      // Clear existing permissions and save new ones
      await db.friendPermissions.clear();
      if (permissions.length > 0) {
        await db.friendPermissions.bulkAdd(permissions);
      }
    });
  }

  static async getFriendPermissions(): Promise<FriendPermission[]> {
    return await db.friendPermissions.toArray();
  }

  static async getFriendPermissionsByUserId(userId: string): Promise<FriendPermission[]> {
    return await db.friendPermissions.where('user_id').equals(userId).toArray();
  }

  // Clear all shared data
  static async clearAllSharedData(): Promise<void> {
    await db.transaction('rw', [db.sharedProfiles, db.sharedSessions, db.friendships, db.friendPermissions], async () => {
      await db.sharedProfiles.clear();
      await db.sharedSessions.clear();
      await db.friendships.clear();
      await db.friendPermissions.clear();
    });
  }

  // Clear specific user's shared data
  static async clearUserSharedData(userId: string): Promise<void> {
    await db.transaction('rw', [db.sharedSessions, db.friendships, db.friendPermissions], async () => {
      await db.sharedSessions.where('user_id').equals(userId).delete();
      await db.friendships
        .where('requester_id')
        .equals(userId)
        .or('addressee_id')
        .equals(userId)
        .delete();
      await db.friendPermissions.where('user_id').equals(userId).delete();
    });
  }

  // Get all shared data for offline mode
  static async getAllSharedData(): Promise<{
    profiles: Profile[];
    sessions: Session[];
    friendships: Friendship[];
    friendPermissions: FriendPermission[];
  }> {
    const [profiles, sessions, friendships, friendPermissions] = await Promise.all([
      this.getProfiles(),
      this.getSessions(),
      this.getFriendships(),
      this.getFriendPermissions()
    ]);

    return {
      profiles,
      sessions,
      friendships,
      friendPermissions
    };
  }
}
