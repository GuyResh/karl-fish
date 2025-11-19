import { createClient } from '@supabase/supabase-js';

// Use service role key for admin access (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration: require VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseAdmin();
    
    // Get all sessions (bypassing RLS with service role)
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, user_id, session_data, privacy_level')
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return res.status(503).json({ error: 'Database query failed', details: sessionsError.message });
    }

    // Get all profiles for username lookup
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Continue without profiles - usernames will be 'Unknown'
    }

    // Create a map of user_id to username
    const userIdToUsername = new Map<string, string>();
    if (profiles) {
      profiles.forEach(profile => {
        userIdToUsername.set(profile.id, profile.username);
      });
    }

    if (!sessions || sessions.length === 0) {
      return res.status(200).json({
        totalAnglers: 0,
        totalSessions: 0,
        totalCatches: 0,
        averageCatchPerSession: 0,
        totalFishingTime: 0,
        totalSpecies: 0,
        mostCommonSpecies: 'None',
        mostCommonSpeciesCount: 0,
        anglerStats: []
      });
    }

    // Process all sessions
    const uniqueAnglers = new Set<string>();
    let totalCatches = 0;
    let totalFishingTime = 0;
    const speciesCounts: { [species: string]: number } = {};
    const allSpecies = new Set<string>();
    const userSessionsMap = new Map<string, {
      username: string;
      sessions: any[];
      catches: number;
      fishingTime: number;
      species: Set<string>;
      speciesCounts: { [species: string]: number };
    }>();

    sessions.forEach((session: any) => {
      const sessionData = session.session_data;
      if (!sessionData) return;

      const userId = session.user_id;
      const username = userIdToUsername.get(userId) || 'Unknown';
      uniqueAnglers.add(userId);

      // Initialize user stats if not exists
      if (!userSessionsMap.has(userId)) {
        userSessionsMap.set(userId, {
          username,
          sessions: [],
          catches: 0,
          fishingTime: 0,
          species: new Set(),
          speciesCounts: {}
        });
      }

      const userStats = userSessionsMap.get(userId)!;
      userStats.sessions.push(session);

      // Count catches
      const catches = sessionData.catches || [];
      totalCatches += catches.length;
      userStats.catches += catches.length;

      // Calculate fishing time
      if (sessionData.startTime && sessionData.endTime) {
        const start = new Date(sessionData.startTime);
        const end = new Date(sessionData.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalFishingTime += hours;
        userStats.fishingTime += hours;
      }

      // Count species
      catches.forEach((catch_: any) => {
        const species = catch_.species?.replace('Custom:', '') || 'Unknown';
        allSpecies.add(species);
        userStats.species.add(species);
        speciesCounts[species] = (speciesCounts[species] || 0) + 1;
        userStats.speciesCounts[species] = (userStats.speciesCounts[species] || 0) + 1;
      });
    });

    // Find most common species
    let mostCommonSpecies = 'None';
    let mostCommonSpeciesCount = 0;
    Object.entries(speciesCounts).forEach(([species, count]) => {
      if (count > mostCommonSpeciesCount) {
        mostCommonSpecies = species;
        mostCommonSpeciesCount = count;
      }
    });

    const totalSessions = sessions.length;
    const averageCatchPerSession = totalSessions > 0 ? totalCatches / totalSessions : 0;

    // Build angler stats
    const anglerStats = Array.from(userSessionsMap.values()).map(userStats => {
      let mostCommonSpeciesForUser = 'None';
      let mostCommonCountForUser = 0;
      Object.entries(userStats.speciesCounts).forEach(([species, count]) => {
        if (count > mostCommonCountForUser) {
          mostCommonSpeciesForUser = species;
          mostCommonCountForUser = count;
        }
      });

      return {
        angler: userStats.username,
        sessions: userStats.sessions.length,
        fishingTime: userStats.fishingTime,
        catches: userStats.catches,
        speciesCaught: userStats.species.size,
        mostCommonSpecies: mostCommonCountForUser > 0 ? mostCommonSpeciesForUser : 'None'
      };
    }).sort((a, b) => b.catches - a.catches);

    return res.status(200).json({
      totalAnglers: uniqueAnglers.size,
      totalSessions,
      totalCatches,
      averageCatchPerSession: Math.round(averageCatchPerSession * 10) / 10,
      totalFishingTime,
      totalSpecies: allSpecies.size,
      mostCommonSpecies,
      mostCommonSpeciesCount,
      anglerStats
    });

  } catch (error: any) {
    console.error('Stats API error:', error);
    return res.status(503).json({ 
      error: 'Failed to fetch statistics', 
      details: error.message 
    });
  }
}

