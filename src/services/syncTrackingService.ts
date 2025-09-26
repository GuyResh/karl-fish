
export interface SyncTimestamp {
  id: string;
  lastSyncTime: Date;
  lastLocalUpdate: Date;
  userId?: string;
}

export class SyncTrackingService {
  private static readonly SYNC_TIMESTAMPS_KEY = 'sync_timestamps';
  private static readonly LOCAL_UPDATE_KEY = 'last_local_update';

  // Get the last sync time for a specific user
  static async getLastSyncTime(userId?: string): Promise<Date | null> {
    try {
      const timestamps = await this.getSyncTimestamps();
      const userTimestamp = timestamps.find(t => t.userId === userId);
      return userTimestamp ? new Date(userTimestamp.lastSyncTime) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  // Set the last sync time for a specific user
  static async setLastSyncTime(userId: string, syncTime: Date = new Date()): Promise<void> {
    try {
      const timestamps = await this.getSyncTimestamps();
      const existingIndex = timestamps.findIndex(t => t.userId === userId);
      
      if (existingIndex >= 0) {
        timestamps[existingIndex].lastSyncTime = syncTime;
      } else {
        timestamps.push({
          id: crypto.randomUUID(),
          lastSyncTime: syncTime,
          lastLocalUpdate: new Date(),
          userId
        });
      }
      
      await this.saveSyncTimestamps(timestamps);
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }

  // Get the last local update time
  static async getLastLocalUpdate(): Promise<Date | null> {
    try {
      const timestamp = localStorage.getItem(this.LOCAL_UPDATE_KEY);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Error getting last local update:', error);
      return null;
    }
  }

  // Set the last local update time
  static async setLastLocalUpdate(updateTime: Date = new Date()): Promise<void> {
    try {
      localStorage.setItem(this.LOCAL_UPDATE_KEY, updateTime.toISOString());
    } catch (error) {
      console.error('Error setting last local update:', error);
    }
  }

  // Check if local data needs to be synced (local is newer than last sync)
  static async needsLocalSync(userId: string): Promise<boolean> {
    try {
      const lastSync = await this.getLastSyncTime(userId);
      const lastLocalUpdate = await this.getLastLocalUpdate();
      
      if (!lastSync || !lastLocalUpdate) return true;
      
      return lastLocalUpdate > lastSync;
    } catch (error) {
      console.error('Error checking if local sync needed:', error);
      return true;
    }
  }

  // Check if remote data needs to be pulled (remote is newer than last sync)
  static async needsRemoteSync(userId: string, remoteUpdatedAt: Date): Promise<boolean> {
    try {
      const lastSync = await this.getLastSyncTime(userId);
      
      if (!lastSync) return true;
      
      return remoteUpdatedAt > lastSync;
    } catch (error) {
      console.error('Error checking if remote sync needed:', error);
      return true;
    }
  }

  // Get all sync timestamps
  private static async getSyncTimestamps(): Promise<SyncTimestamp[]> {
    try {
      const data = localStorage.getItem(this.SYNC_TIMESTAMPS_KEY);
      if (!data) return [];
      
      const timestamps = JSON.parse(data);
      return timestamps.map((t: any) => ({
        ...t,
        lastSyncTime: new Date(t.lastSyncTime),
        lastLocalUpdate: new Date(t.lastLocalUpdate)
      }));
    } catch (error) {
      console.error('Error getting sync timestamps:', error);
      return [];
    }
  }

  // Save sync timestamps
  private static async saveSyncTimestamps(timestamps: SyncTimestamp[]): Promise<void> {
    try {
      localStorage.setItem(this.SYNC_TIMESTAMPS_KEY, JSON.stringify(timestamps));
    } catch (error) {
      console.error('Error saving sync timestamps:', error);
    }
  }

  // Clear sync data for a user (useful for logout)
  static async clearUserSyncData(userId: string): Promise<void> {
    try {
      const timestamps = await this.getSyncTimestamps();
      const filtered = timestamps.filter(t => t.userId !== userId);
      await this.saveSyncTimestamps(filtered);
    } catch (error) {
      console.error('Error clearing user sync data:', error);
    }
  }

  // Clear all sync data
  static async clearAllSyncData(): Promise<void> {
    try {
      localStorage.removeItem(this.SYNC_TIMESTAMPS_KEY);
      localStorage.removeItem(this.LOCAL_UPDATE_KEY);
    } catch (error) {
      console.error('Error clearing all sync data:', error);
    }
  }
}
