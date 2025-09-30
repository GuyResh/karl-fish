import Dexie, { Table } from 'dexie';
import { FishingSession, FishCatch, AppSettings, NMEAData } from '../types';
import { Profile, Session, Friendship, FriendPermission } from '../lib/supabase';
import { SyncTrackingService } from '../services/syncTrackingService';

export class FishingDatabase extends Dexie {
  sessions!: Table<FishingSession>;
  catches!: Table<FishCatch>;
  settings!: Table<AppSettings>;
  nmeaData!: Table<NMEAData>;
  
  // Shared data tables
  sharedProfiles!: Table<Profile>;
  sharedSessions!: Table<Session>;
  friendships!: Table<Friendship>;
  friendPermissions!: Table<FriendPermission>;

  constructor() {
    super('FishingDatabase');
    this.version(3).stores({
      // Existing stores (unchanged)
      sessions: 'id, userId, date, startTime, endTime, location.latitude, location.longitude',
      catches: 'id, userId, species, length, weight, condition, sessionId',
      settings: 'id, userId',
      nmeaData: 'id, userId, timestamp, latitude, longitude',
      
      // New shared data stores
      sharedProfiles: 'id, username, name, created_at',
      sharedSessions: 'id, user_id, privacy_level, created_at',
      friendships: 'id, requester_id, addressee_id, status, created_at',
      friendPermissions: 'id, user_id, friend_id, created_at'
    });
  }
}

export const db = new FishingDatabase();

// Database helper functions
export class FishingDataService {
  // Helper to get current user ID (normalized username)
  private static getCurrentUserId(): string | null {
    // This will be set by the auth context
    const userId = localStorage.getItem('currentUserId');
    return userId ? userId.toLowerCase() : null;
  }

  // Helper to get current user ID or default for offline mode
  private static getCurrentUserIdOrDefault(): string {
    const userId = this.getCurrentUserId();
    return userId || 'offline-user'; // Default userId for offline mode
  }
  // Session management
  static async createSession(session: Omit<FishingSession, 'id'>): Promise<string> {
    const userId = this.getCurrentUserIdOrDefault();
    const id = crypto.randomUUID();
    const catches = session.catches || [];
    
    // Create session without catches first
    const newSession: FishingSession = {
      ...session,
      id,
      userId,
      catches: []
    };
    
    await db.sessions.add(newSession);
    
    // Add catches separately with sessionId
    for (const catch_ of catches) {
      const catchWithSessionId = {
        ...catch_,
        id: catch_.id || crypto.randomUUID(),
        userId,
        sessionId: id
      };
      await db.catches.add(catchWithSessionId);
    }
    
    // Track local update
    await SyncTrackingService.setLastLocalUpdate();
    
    return id;
  }

  static async getSession(id: string): Promise<FishingSession | undefined> {
    const userId = this.getCurrentUserIdOrDefault();
    
    // Get session (with or without userId filter)
    let session;
    if (this.getCurrentUserId()) {
      // Logged in user - only their session
      session = await db.sessions.where('id').equals(id).and(s => s.userId === userId).first();
    } else {
      // Offline mode - get any session with this ID
      session = await db.sessions.where('id').equals(id).first();
    }
    
    if (session) {
      // Convert date strings back to Date objects
      const convertedSession = {
        ...session,
        date: new Date(session.date),
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined
      };
      
      // Load catches
      if (this.getCurrentUserId()) {
        // Logged in user - only their catches
        convertedSession.catches = await db.catches.where('sessionId').equals(id).and(c => c.userId === userId).toArray();
      } else {
        // Offline mode - get all catches for this session
        convertedSession.catches = await db.catches.where('sessionId').equals(id).toArray();
      }
      
      return convertedSession;
    }
    return undefined;
  }

  static async getAllSessions(): Promise<FishingSession[]> {
    const userId = this.getCurrentUserIdOrDefault();
    
    // Get sessions for current user (or all if no user)
    let sessions;
    if (this.getCurrentUserId()) {
      // Logged in user - only their data
      sessions = await db.sessions
        .where('userId')
        .equals(userId)
        .toArray();
    } else {
      // Offline mode - get all sessions (for backward compatibility)
      sessions = await db.sessions.toArray();
    }
    
    // Sort by date (most recent first)
    const sortedSessions = sessions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Reverse order (newest first)
    });
    
    // Convert date strings back to Date objects
    const convertedSessions = sortedSessions.map((session: FishingSession) => ({
      ...session,
      date: new Date(session.date),
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined
    }));
    
    // Load catches for each session
    for (const session of convertedSessions) {
      if (this.getCurrentUserId()) {
        // Logged in user - only their catches
        session.catches = await db.catches.where('sessionId').equals(session.id).and(c => c.userId === userId).toArray();
      } else {
        // Offline mode - get all catches for this session
        session.catches = await db.catches.where('sessionId').equals(session.id).toArray();
      }
    }
    
    return convertedSessions;
  }

  static async updateSession(id: string, updates: Partial<FishingSession>): Promise<void> {
    // If catches are being updated, handle them separately
    if (updates.catches) {
      // Remove existing catches for this session
      await db.catches.where('sessionId').equals(id).delete();
      
      // Add new catches with sessionId
      for (const catch_ of updates.catches) {
        const catchWithSessionId = {
          ...catch_,
          sessionId: id
        };
        await db.catches.add(catchWithSessionId);
      }
      
      // Remove catches from updates to avoid storing them in sessions table
      const { catches, ...sessionUpdates } = updates;
      await db.sessions.update(id, sessionUpdates);
    } else {
      await db.sessions.update(id, updates);
    }
    
    // Track local update
    await SyncTrackingService.setLastLocalUpdate();
  }

  static async deleteSession(id: string): Promise<void> {
    await db.transaction('rw', [db.sessions, db.catches], async () => {
      await db.catches.where('sessionId').equals(id).delete();
      await db.sessions.delete(id);
    });
    
    // Track local update
    await SyncTrackingService.setLastLocalUpdate();
  }

  // Catch management
  static async addCatch(sessionId: string, fishCatch: Omit<FishCatch, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const newCatch: FishCatch = {
      ...fishCatch,
      id
    };
    
    await db.catches.add(newCatch);
    
    // Update session with the new catch
    const session = await db.sessions.get(sessionId);
    if (session) {
      session.catches.push(newCatch);
      await db.sessions.update(sessionId, { catches: session.catches });
    }
    
    return id;
  }

  static async updateCatch(id: string, updates: Partial<FishCatch>): Promise<void> {
    await db.catches.update(id, updates);
  }

  static async deleteCatch(id: string): Promise<void> {
    await db.catches.delete(id);
  }

  // Clear all sessions and their catches
  static async clearAllSessions(): Promise<void> {
    const userId = this.getCurrentUserIdOrDefault();
    
    await db.transaction('rw', [db.sessions, db.catches], async () => {
      if (this.getCurrentUserId()) {
        // Logged in user - only clear their data
        await db.catches.where('userId').equals(userId).delete();
        await db.sessions.where('userId').equals(userId).delete();
      } else {
        // Offline mode - clear all data
        await db.catches.clear();
        await db.sessions.clear();
      }
    });
    
    // Track local update
    await SyncTrackingService.setLastLocalUpdate();
  }

  // Clear all user data (sessions, catches, and NMEA data)
  static async clearAllUserData(): Promise<void> {
    const userId = this.getCurrentUserIdOrDefault();
    
    await db.transaction('rw', [db.sessions, db.catches, db.nmeaData], async () => {
      if (this.getCurrentUserId()) {
        // Logged in user - only clear their data
        await db.catches.where('userId').equals(userId).delete();
        await db.sessions.where('userId').equals(userId).delete();
        await db.nmeaData.where('userId').equals(userId).delete();
      } else {
        // Offline mode - clear all data
        await db.catches.clear();
        await db.sessions.clear();
        await db.nmeaData.clear();
      }
    });
    
    // Track local update
    await SyncTrackingService.setLastLocalUpdate();
  }

  // Clear only shared data (friends, shared sessions, etc.)
  static async clearSharedData(): Promise<void> {
    await db.transaction('rw', [db.sharedProfiles, db.sharedSessions, db.friendships, db.friendPermissions], async () => {
      await db.sharedProfiles.clear();
      await db.sharedSessions.clear();
      await db.friendships.clear();
      await db.friendPermissions.clear();
    });
  }

  // Danger: clears all app data
  static async clearAllData(): Promise<void> {
    await db.transaction('rw', [db.sessions, db.catches, db.settings, db.nmeaData, db.sharedProfiles, db.sharedSessions, db.friendships, db.friendPermissions], async () => {
      await db.catches.clear();
      await db.sessions.clear();
      await db.nmeaData.clear();
      // Clear shared data
      await db.sharedProfiles.clear();
      await db.sharedSessions.clear();
      await db.friendships.clear();
      await db.friendPermissions.clear();
      // preserve settings table entry; do not clear settings to keep user prefs
    });
  }

  static async getLatestNMEAData(): Promise<NMEAData | null> {
    const latest = await db.nmeaData
      .orderBy('timestamp')
      .reverse()
      .first();
    return latest || null;
  }

  static async clearNMEAData(): Promise<void> {
    await db.nmeaData.clear();
  }

  // Settings management
  static async getSettings(): Promise<AppSettings | null> {
    const settings = await db.settings.get('main');
    return settings || null;
  }

  static async updateSettings(settings: AppSettings): Promise<void> {
    await db.settings.put({ ...settings, id: 'main' } as any);
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    await db.settings.put({ ...settings, id: 'main' } as any);
  }

  // NMEA data management
  static async addNMEAData(data: NMEAData): Promise<void> {
    const nmeaDataWithId = {
      ...data,
      id: data.id || crypto.randomUUID()
    };
    await db.nmeaData.add(nmeaDataWithId);
  }

  static async getNMEAData(startDate?: Date, endDate?: Date): Promise<NMEAData[]> {
    let query = db.nmeaData.orderBy('timestamp');
    
    if (startDate && endDate) {
      query = query.filter(data => 
        data.timestamp >= startDate && data.timestamp <= endDate
      );
    }
    
    return await query.toArray();
  }

  // Statistics and analytics
  static async getSessionStats(): Promise<{
    totalSessions: number;
    totalCatches: number;
    totalSpecies: number;
    averageCatchPerSession: number;
    mostCommonSpecies: string;
    mostCommonSpeciesCount: number;
    speciesCounts: { [species: string]: number };
    totalFishingTime: number; // in hours
  }> {
    const sessions = await this.getAllSessions();
    
    // Count catches from session.catches arrays instead of separate catches table
    const allCatches = sessions.flatMap(session => session.catches || []);
    
    const totalSessions = sessions.length;
    const totalCatches = allCatches.length;
    
    const speciesCount = allCatches.reduce((acc, catch_) => {
      const species = catch_.species?.replace('Custom:', '') || '';
      acc[species] = (acc[species] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedSpecies = Object.entries(speciesCount)
      .sort(([,a], [,b]) => b - a);
    
    const mostCommonSpecies = sortedSpecies[0]?.[0] || 'None';
    const mostCommonSpeciesCount = sortedSpecies[0]?.[1] || 0;
    
    const totalFishingTime = sessions.reduce((total, session) => {
      if (session.endTime) {
        // Create proper datetime by combining date with time
        const startDateTime = new Date(session.date);
        startDateTime.setHours(session.startTime.getHours(), session.startTime.getMinutes(), session.startTime.getSeconds());
        
        const endDateTime = new Date(session.date);
        endDateTime.setHours(session.endTime.getHours(), session.endTime.getMinutes(), session.endTime.getSeconds());
        
        const duration = endDateTime.getTime() - startDateTime.getTime();
        return total + (duration / (1000 * 60 * 60)); // Convert to hours
      }
      return total;
    }, 0);
    
    return {
      totalSessions,
      totalCatches,
      totalSpecies: Object.keys(speciesCount).length,
      averageCatchPerSession: totalSessions > 0 ? totalCatches / totalSessions : 0,
      mostCommonSpecies,
      mostCommonSpeciesCount,
      speciesCounts: speciesCount,
      totalFishingTime
    };
  }

  // Search and filtering
  static async searchSessions(query: string): Promise<FishingSession[]> {
    const sessions = await this.getAllSessions();
    
    return sessions.filter(session => 
      session.notes?.toLowerCase().includes(query.toLowerCase()) ||
      session.catches.some(catch_ => 
        catch_.species.toLowerCase().includes(query.toLowerCase()) ||
        catch_.notes?.toLowerCase().includes(query.toLowerCase())
      )
    );
  }

  static async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<FishingSession[]> {
    return await db.sessions
      .where('date')
      .between(startDate, endDate)
      .toArray();
  }

  static async getSessionsByLocation(
    minLat: number, 
    maxLat: number, 
    minLon: number, 
    maxLon: number
  ): Promise<FishingSession[]> {
    return await db.sessions
      .where('location.latitude')
      .between(minLat, maxLat)
      .and(session => 
        session.location.longitude >= minLon && 
        session.location.longitude <= maxLon
      )
      .toArray();
  }

  // NMEA data methods
  static async saveNMEAData(data: NMEAData): Promise<void> {
    await db.nmeaData.add(data);
  }

  static async getAllNMEAData(): Promise<NMEAData[]> {
    return await db.nmeaData.toArray();
  }

  static async getNMEADataByDateRange(startDate: Date, endDate: Date): Promise<NMEAData[]> {
    return await db.nmeaData
      .where('timestamp')
      .between(startDate, endDate)
      .toArray();
  }
}
