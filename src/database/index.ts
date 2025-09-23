import Dexie, { Table } from 'dexie';
import { FishingSession, FishCatch, AppSettings, NMEAData } from '../types';

export class FishingDatabase extends Dexie {
  sessions!: Table<FishingSession>;
  catches!: Table<FishCatch>;
  settings!: Table<AppSettings>;
  nmeaData!: Table<NMEAData>;

  constructor() {
    super('FishingDatabase');
    this.version(1).stores({
      sessions: 'id, date, startTime, endTime, location.latitude, location.longitude',
      catches: 'id, species, length, weight, condition, sessionId',
      settings: 'id',
      nmeaData: 'id, timestamp, latitude, longitude'
    });
  }
}

export const db = new FishingDatabase();

// Database helper functions
export class FishingDataService {
  // Session management
  static async createSession(session: Omit<FishingSession, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const catches = session.catches || [];
    
    // Create session without catches first
    const newSession: FishingSession = {
      ...session,
      id,
      catches: []
    };
    
    await db.sessions.add(newSession);
    
    // Add catches separately with sessionId
    for (const catch_ of catches) {
      const catchWithSessionId = {
        ...catch_,
        id: catch_.id || crypto.randomUUID(),
        sessionId: id
      };
      await db.catches.add(catchWithSessionId);
    }
    
    return id;
  }

  static async getSession(id: string): Promise<FishingSession | undefined> {
    const session = await db.sessions.get(id);
    if (session) {
      session.catches = await db.catches.where('sessionId').equals(id).toArray();
    }
    return session;
  }

  static async getAllSessions(): Promise<FishingSession[]> {
    const sessions = await db.sessions.orderBy('date').reverse().toArray();
    
    // Load catches for each session
    for (const session of sessions) {
      session.catches = await db.catches.where('sessionId').equals(session.id).toArray();
    }
    
    return sessions;
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
  }

  static async deleteSession(id: string): Promise<void> {
    await db.transaction('rw', [db.sessions, db.catches], async () => {
      await db.catches.where('sessionId').equals(id).delete();
      await db.sessions.delete(id);
    });
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

  // Settings management
  static async getSettings(): Promise<AppSettings | null> {
    const settings = await db.settings.get('main');
    return settings || null;
  }

  static async updateSettings(settings: AppSettings): Promise<void> {
    await db.settings.put({ ...settings, id: 'main' });
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
    totalFishingTime: number; // in hours
  }> {
    const sessions = await this.getAllSessions();
    const allCatches = await db.catches.toArray();
    
    const totalSessions = sessions.length;
    const totalCatches = allCatches.length;
    
    const speciesCount = allCatches.reduce((acc, catch_) => {
      acc[catch_.species] = (acc[catch_.species] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonSpecies = Object.entries(speciesCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
    
    const totalFishingTime = sessions.reduce((total, session) => {
      if (session.endTime) {
        const duration = session.endTime.getTime() - session.startTime.getTime();
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
}
