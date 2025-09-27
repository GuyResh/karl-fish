import { OfflineService } from './offlineService';
import { FriendService } from './friendService';
import { SharingService } from './sharingService';
import { SyncTrackingService } from './syncTrackingService';
import { Profile, Session } from '../lib/supabase';
import { AuthService } from './authService';
import { FishingDataService } from '../database';

export class DataSyncService {
  static async syncAllData(): Promise<void> {
    if (!(await OfflineService.shouldSync())) {
      console.log('Skipping sync - offline mode or no internet');
      return;
    }

    try {
      console.log('Starting data sync...');
      
      const profile = await AuthService.getCurrentProfile();
      const userId = profile?.id;
      
      // Sync friends data
      await this.syncFriendsData();
      
      // Sync shared sessions
      await this.syncSharedSessions();
      
      // Sync local data to cloud (if user is logged in)
      await this.syncLocalDataToCloud();
      
      // Update sync timestamp
      if (userId) {
        await SyncTrackingService.setLastSyncTime(userId);
      }
      
      console.log('Data sync completed');
    } catch (error) {
      console.error('Error during data sync:', error);
    }
  }

  static async syncFriendsData(): Promise<void> {
    try {
      const friends = await FriendService.getFriends();
      await OfflineService.syncFriendsData(friends);
      console.log(`Synced ${friends.length} friends`);
    } catch (error) {
      console.error('Error syncing friends data:', error);
    }
  }

  static async syncSharedSessions(): Promise<void> {
    try {
      const sharedSessions = await SharingService.getSharedSessions();
      await OfflineService.syncSharedSessions(sharedSessions);
      console.log(`Synced ${sharedSessions.length} shared sessions`);
    } catch (error) {
      console.error('Error syncing shared sessions:', error);
    }
  }

  static async syncLocalDataToCloud(): Promise<void> {
    try {
      const profile = await AuthService.getCurrentProfile();
      if (!profile) {
        console.log('No user logged in, skipping local data sync');
        return;
      }

      // Get all local sessions
      const localSessions = await FishingDataService.getAllSessions();
      console.log(`Found ${localSessions.length} local sessions to sync`);

      if (localSessions.length === 0) {
        console.log('No local sessions to sync');
        return;
      }

      // Use bulk upload method
      await SharingService.uploadSessions(localSessions);
      console.log(`Successfully synced ${localSessions.length} sessions to cloud`);
    } catch (error) {
      console.error('Error syncing local data to cloud:', error);
    }
  }

  static async getOfflineFriendsData(): Promise<Profile[]> {
    return await OfflineService.getFriendsData();
  }

  static async getOfflineSharedSessions(): Promise<Session[]> {
    return await OfflineService.getSharedSessions();
  }

  static async isDataStale(): Promise<boolean> {
    const lastSync = await OfflineService.getLastSyncTime();
    if (!lastSync) return true;
    
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    // Consider data stale after 1 hour
    return hoursSinceSync > 1;
  }

  static async forceSync(): Promise<void> {
    await OfflineService.setOfflineMode(false);
    await this.syncAllData();
  }

  static async enableOfflineMode(): Promise<void> {
    await OfflineService.setOfflineMode(true);
    console.log('Offline mode enabled');
  }

  static async disableOfflineMode(): Promise<void> {
    await OfflineService.setOfflineMode(false);
    await this.syncAllData();
    console.log('Offline mode disabled, data synced');
  }
}
