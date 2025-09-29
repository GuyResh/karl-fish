import { OfflineService } from './offlineService';
import { FriendService } from './friendService';
import { SharingService } from './sharingService';
import { SyncTrackingService } from './syncTrackingService';
import { Profile, Session, supabase } from '../lib/supabase';
import { AuthService } from './authService';
import { FishingDataService } from '../database';

export class DataSyncService {
  private static isSyncing = false;

  static async syncAllData(): Promise<void> {
    // Prevent multiple simultaneous syncs
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    if (!(await OfflineService.shouldSync())) {
      console.log('Skipping sync - offline mode or no internet');
      return;
    }

    this.isSyncing = true;

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
    } finally {
      this.isSyncing = false;
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

      // Perform bidirectional sync
      await this.performBidirectionalSync(localSessions);
    } catch (error) {
      console.error('Error syncing local data to cloud:', error);
    }
  }

  private static async performBidirectionalSync(localSessions: any[]): Promise<void> {
    const profile = await AuthService.getCurrentProfile();
    if (!profile) return;

    // Get cloud sessions with timestamps
    const { data: cloudSessions, error } = await supabase
      .from('sessions')
      .select('id, session_data, updated_at')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Error fetching cloud sessions:', error);
      // Fallback to upload-only sync
      await SharingService.uploadSessions(localSessions);
      return;
    }

      console.log(`Found ${cloudSessions?.length || 0} cloud sessions`);
      console.log('Cloud sessions sample:', cloudSessions?.slice(0, 3).map(s => ({ id: s.id, user_id: s.user_id, session_id: s.session_data?.id })));

    // Create maps for efficient lookup
    const localMap = new Map();
    const cloudMap = new Map();

    localSessions.forEach(session => {
      localMap.set(session.id, {
        ...session,
        lastModified: new Date(session.updatedAt || session.date).getTime()
      });
    });

    cloudSessions?.forEach(session => {
      const sessionData = session.session_data;
      if (sessionData?.id) {
        cloudMap.set(sessionData.id, {
          ...sessionData,
          lastModified: new Date(session.updated_at).getTime(),
          cloudId: session.id
        });
      }
    });

    // Determine what needs to be synced
    const sessionsToUpload = [];
    const sessionsToDownload = [];

    // Check each local session
    for (const [sessionId, localSession] of localMap) {
      const cloudSession = cloudMap.get(sessionId);
      
      if (!cloudSession) {
        // Local session doesn't exist in cloud - upload it
        sessionsToUpload.push(localSession);
      } else if (localSession.lastModified > cloudSession.lastModified) {
        // Local session is newer - update cloud
        sessionsToUpload.push(localSession);
      }
    }

    // Check each cloud session
    for (const [sessionId, cloudSession] of cloudMap) {
      const localSession = localMap.get(sessionId);
      
      if (!localSession) {
        // Cloud session doesn't exist locally - download it
        sessionsToDownload.push(cloudSession);
      } else if (cloudSession.lastModified > localSession.lastModified) {
        // Cloud session is newer - update local
        sessionsToDownload.push(cloudSession);
      }
    }

    console.log(`Sync plan: Upload ${sessionsToUpload.length}, Download ${sessionsToDownload.length}`);

    // Execute sync operations
    if (sessionsToUpload.length > 0) {
      await SharingService.uploadSessions(sessionsToUpload);
      console.log(`Uploaded ${sessionsToUpload.length} new sessions`);
    }

    if (sessionsToDownload.length > 0) {
      // Download newer sessions to local storage
      for (const cloudSession of sessionsToDownload) {
        try {
          // Remove cloudId before saving locally
          const { cloudId, ...sessionData } = cloudSession;
          await FishingDataService.createSession(sessionData);
        } catch (error) {
          console.error(`Error downloading session ${cloudSession.id}:`, error);
        }
      }
      console.log(`Downloaded ${sessionsToDownload.length} sessions from cloud`);
    }

    console.log('Bidirectional sync completed');
  }

  static async downloadSessionsFromCloud(): Promise<void> {
    try {
      const profile = await AuthService.getCurrentProfile();
      if (!profile) {
        console.log('No user logged in, cannot download sessions');
        return;
      }

      console.log('Downloading sessions from cloud...');
      console.log('Current user profile ID:', profile.id);
      
      // Get all sessions from Supabase for this user
      const { data: cloudSessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10000); // Explicitly set a high limit to get all sessions

      if (error) {
        throw error;
      }

      if (!cloudSessions || cloudSessions.length === 0) {
        console.log('No sessions found in cloud');
        return;
      }

      console.log(`Found ${cloudSessions.length} sessions in cloud`);
      console.log('Cloud sessions sample:', cloudSessions.slice(0, 3).map(s => ({ id: s.id, user_id: s.user_id, session_id: s.session_data?.id })));

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
