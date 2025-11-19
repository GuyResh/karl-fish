export interface PublicStats {
  totalAnglers: number;
  totalSessions: number;
  totalCatches: number;
  averageCatchPerSession: number;
  totalFishingTime: number;
  totalSpecies: number;
  mostCommonSpecies: string;
  mostCommonSpeciesCount: number;
}

export interface AnglerStats {
  angler: string;
  sessions: number;
  fishingTime: number;
  catches: number;
  speciesCaught: number;
  mostCommonSpecies: string;
}

interface StatsApiResponse {
  totalAnglers: number;
  totalSessions: number;
  totalCatches: number;
  averageCatchPerSession: number;
  totalFishingTime: number;
  totalSpecies: number;
  mostCommonSpecies: string;
  mostCommonSpeciesCount: number;
  anglerStats: AnglerStats[];
}

export class StatsService {
  // Get stats from API endpoint (queries all sessions regardless of privacy)
  static async getStats(): Promise<{ stats: PublicStats; anglerStats: AnglerStats[] }> {
    try {
      // Determine API base URL - use production API for local dev (Vite doesn't run API routes)
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 
                        (typeof window !== 'undefined' && window.location.pathname.includes('/karl-fish/')
                          ? 'https://karlfish.net'
                          : typeof window !== 'undefined' 
                            ? 'https://karlfish.net'  // Use production API for local dev
                            : '');
      
      const response = await fetch(`${apiBaseUrl}/api/stats`);
      
      if (!response.ok) {
        throw new Error(`Stats API returned ${response.status}: ${response.statusText}`);
      }

      const data: StatsApiResponse = await response.json();
      
      const stats: PublicStats = {
        totalAnglers: data.totalAnglers,
        totalSessions: data.totalSessions,
        totalCatches: data.totalCatches,
        averageCatchPerSession: data.averageCatchPerSession,
        totalFishingTime: data.totalFishingTime,
        totalSpecies: data.totalSpecies,
        mostCommonSpecies: data.mostCommonSpecies,
        mostCommonSpeciesCount: data.mostCommonSpeciesCount
      };

      return {
        stats,
        anglerStats: data.anglerStats || []
      };
    } catch (error) {
      console.error('Error fetching stats from API:', error);
      // Return empty stats on error
      return {
        stats: {
          totalAnglers: 0,
          totalSessions: 0,
          totalCatches: 0,
          averageCatchPerSession: 0,
          totalFishingTime: 0,
          totalSpecies: 0,
          mostCommonSpecies: 'None',
          mostCommonSpeciesCount: 0
        },
        anglerStats: []
      };
    }
  }

  // Legacy methods for backwards compatibility
  static async getPublicStats(): Promise<PublicStats> {
    const { stats } = await this.getStats();
    return stats;
  }

  static async getAnglerStats(): Promise<AnglerStats[]> {
    const { anglerStats } = await this.getStats();
    return anglerStats;
  }
}

