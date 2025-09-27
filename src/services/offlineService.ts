import { FishingSession, FishCatch, NMEAData, AppSettings } from '../types';
import { Profile, Session } from '../lib/supabase';

export interface OfflineData {
  sessions: FishingSession[];
  catches: FishCatch[];
  nmeaData: NMEAData[];
  settings: AppSettings | null;
  userProfile: Profile | null;
  friendsData: Profile[];
  sharedSessions: Session[];
  lastSync: string | null;
  isOfflineMode: boolean;
}

export class OfflineService {
  private static readonly STORAGE_KEY = 'karl-fish-offline-data';
  private static readonly USER_KEY = 'karl-fish-user';

  static async saveOfflineData(data: Partial<OfflineData>): Promise<void> {
    try {
      const existingData = await this.getOfflineData();
      const updatedData = { ...existingData, ...data, lastSync: new Date().toISOString() };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  static async getOfflineData(): Promise<OfflineData> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }

    // Return default empty data structure
    return {
      sessions: [],
      catches: [],
      nmeaData: [],
      settings: null,
      userProfile: null,
      friendsData: [],
      sharedSessions: [],
      lastSync: null,
      isOfflineMode: false
    };
  }

  static async saveUserProfile(profile: Profile): Promise<void> {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }

  static async getUserProfile(): Promise<Profile | null> {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  static async setOfflineMode(isOffline: boolean): Promise<void> {
    const data = await this.getOfflineData();
    data.isOfflineMode = isOffline;
    await this.saveOfflineData(data);
  }

  static async isOfflineMode(): Promise<boolean> {
    const data = await this.getOfflineData();
    return data.isOfflineMode;
  }

  static async clearOfflineData(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  static async syncFriendsData(friends: Profile[]): Promise<void> {
    const data = await this.getOfflineData();
    data.friendsData = friends;
    data.lastSync = new Date().toISOString();
    await this.saveOfflineData(data);
  }

  static async getFriendsData(): Promise<Profile[]> {
    const data = await this.getOfflineData();
    return data.friendsData || [];
  }

  static async syncSharedSessions(sessions: Session[]): Promise<void> {
    const data = await this.getOfflineData();
    data.sharedSessions = sessions;
    data.lastSync = new Date().toISOString();
    await this.saveOfflineData(data);
  }

  static async getSharedSessions(): Promise<Session[]> {
    const data = await this.getOfflineData();
    return data.sharedSessions || [];
  }

  static async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  static async shouldSync(): Promise<boolean> {
    const isOnline = await this.isOnline();
    const isOfflineMode = await this.isOfflineMode();
    return isOnline && !isOfflineMode;
  }

  static async getLastSyncTime(): Promise<Date | null> {
    const data = await this.getOfflineData();
    return data.lastSync ? new Date(data.lastSync) : null;
  }
}
