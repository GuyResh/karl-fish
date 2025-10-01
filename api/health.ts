import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Simple in-memory rate limiter for this serverless instance
let lastHits: number[] = [];

function shouldSkipQuery(windowMinutes: number): boolean {
	const now = Date.now();
	const windowMs = windowMinutes * 60 * 1000;
	// Prune old hits
	lastHits = lastHits.filter((t) => now - t < windowMs);
	if (lastHits.length >= 1) {
		return true;
	}
	lastHits.push(now);
	return false;
}

function getSupabaseClient(): SupabaseClient {
	const url = process.env.VITE_SUPABASE_URL as string;
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
	const anonKey = process.env.VITE_SUPABASE_ANON_KEY as string | undefined;
	const key = serviceKey || anonKey;
	if (!url || !key) {
		throw new Error('Missing Supabase configuration');
	}
	return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req: any, res: any) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const windowMinutesEnv = process.env.HEALTH_WINDOW_MINUTES;
	const windowMinutes = Number.isFinite(Number(windowMinutesEnv)) && Number(windowMinutesEnv) > 0
		? Number(windowMinutesEnv)
		: 5;

	try {
		// Rate limit: allow only one expensive query per window per instance
		if (shouldSkipQuery(windowMinutes)) {
			return res.status(200).json({
				status: 'ok',
				message: `Health check skipped to respect rate limit (${windowMinutes}m window).`
			});
		}

		const supabase = getSupabaseClient();

		// Fetch users and sessions; aggregate in memory
		const [profilesResp, sessionsResp] = await Promise.all([
			supabase.from('profiles').select('id, username'),
			supabase.from('sessions').select('user_id, privacy_level')
		]);

		if (profilesResp.error) {
			throw profilesResp.error;
		}
		if (sessionsResp.error) {
			throw sessionsResp.error;
		}

		const profiles = profilesResp.data || [];
		const sessions = sessionsResp.data || [];

		const userIdToCounts = new Map<string, { private: number; shared: number }>();
		for (const s of sessions as Array<{ user_id: string; privacy_level: string }>) {
			const isPrivate = s.privacy_level === 'private';
			const current = userIdToCounts.get(s.user_id) || { private: 0, shared: 0 };
			if (isPrivate) {
				current.private += 1;
			} else {
				current.shared += 1;
			}
			userIdToCounts.set(s.user_id, current);
		}

		const result = profiles.map((p: { id: string; username: string }) => {
			const counts = userIdToCounts.get(p.id) || { private: 0, shared: 0 };
			return {
				username: p.username,
				privateSessions: counts.private,
				sharedSessions: counts.shared
			};
		});

		return res.status(200).json({ status: 'ok', data: result });
	} catch (error: any) {
		console.error('Health check error:', error?.message || error);
		return res.status(503).json({ status: 'error', error: 'Service Unavailable' });
	}
}


