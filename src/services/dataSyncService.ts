import { OfflineService } from './offlineService';
import { FriendService } from './friendService';
import { SharingService } from './sharingService';
import { SyncTrackingService } from './syncTrackingService';
import { Profile, Session, supabase } from '../lib/supabase';
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
        console.log('No local sessions found - downloading from cloud instead');
        await this.downloadSessionsFromCloud();
        return;
      }

      // Use bulk upload method
      await SharingService.uploadSessions(localSessions);
      // console.log(`Successfully synced ${localSessions.length} sessions to cloud`);
    } catch (error) {
      console.error('Error syncing local data to cloud:', error);
    }
  }

  static async downloadSessionsFromCloud(): Promise<void> {
    try {
      const profile = await AuthService.getCurrentProfile();
      if (!profile) {
        console.log('No user logged in, cannot download sessions');
        return;
      }

      console.log('Downloading sessions from cloud...');
      
      // Get all sessions from Supabase for this user
      const { data: cloudSessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!cloudSessions || cloudSessions.length === 0) {
        console.log('No sessions found in cloud');
        return;
      }

      console.log(`Found ${cloudSessions.length} sessions in cloud`);

      // Convert cloud sessions to local format and save to IndexedDB
      for (const cloudSession of cloudSessions) {
        const sessionData = cloudSession.session_data;
        if (sessionData) {
          // Add the shared flag based on privacy level
          sessionData.shared = cloudSession.privacy_level === 'friends' || cloudSession.privacy_level === 'public';
          
          // Save to local storage
          await FishingDataService.createSession(sessionData);
        }
      }

      console.log(`Successfully downloaded ${cloudSessions.length} sessions from cloud`);
    } catch (error) {
      console.error('Error downloading sessions from cloud:', error);
      throw error;
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

  static async forceDownloadFromCloud(): Promise<void> {
    try {
      console.log('Force downloading all data from cloud...');
      await this.downloadSessionsFromCloud();
      
      // Dispatch event to refresh UI
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      
      console.log('Force download completed');
    } catch (error) {
      console.error('Error during force download:', error);
      throw error;
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      console.log('Clearing all data...');
      
      // Clear local data
      await FishingDataService.clearAllData();
      
      // Clear cloud data if user is logged in
      const profile = await AuthService.getCurrentProfile();
      if (profile) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', profile.id);
        
        if (sessions && sessions.length > 0) {
          await supabase
            .from('sessions')
            .delete()
            .eq('user_id', profile.id);
        }
      }
      
      // Dispatch event to refresh UI
      window.dispatchEvent(new CustomEvent('dataCleared'));
      
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  static async clearLocalData(): Promise<void> {
    try {
      console.log('Clearing local data...');
      
      // Clear local data only
      await FishingDataService.clearAllData();
      
      // Dispatch event to refresh UI
      window.dispatchEvent(new CustomEvent('dataCleared'));
      
      console.log('Local data cleared successfully');
    } catch (error) {
      console.error('Error clearing local data:', error);
      throw error;
    }
  }
}
