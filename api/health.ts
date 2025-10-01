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
	if (!url || !serviceKey) {
		throw new Error('Missing Supabase configuration: require VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
	}
	return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export default async function handler(req: any, res: any) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const format = req.query.format || 'json';
	const windowMinutesEnv = process.env.HEALTH_WINDOW_MINUTES;
	const windowMinutes = Number.isFinite(Number(windowMinutesEnv)) && Number(windowMinutesEnv) > 0
		? Number(windowMinutesEnv)
		: 5;

	try {
		// Rate limit: allow only one expensive query per window per instance
		if (shouldSkipQuery(windowMinutes)) {
			res.setHeader('Retry-After', String(windowMinutes * 60));
			if (format === 'prometheus') {
				return res.status(429).type('text/plain').send(`# HELP karlfish_health_status Health check status\n# TYPE karlfish_health_status gauge\nkarlfish_health_status{status="rate_limited"} 0\n`);
			} else if (format === 'text') {
				return res.status(429).type('text/plain').send(`Rate limit exceeded. Try again in up to ${windowMinutes} minute(s).\n`);
			} else {
				return res.status(429).json({
					status: 'rate_limited',
					message: `Rate limit exceeded. Try again in up to ${windowMinutes} minute(s).`
				});
			}
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

		// Return response based on format parameter
		if (format === 'prometheus') {
			let prometheusOutput = '# HELP karlfish_user_sessions_total Total sessions per user\n# TYPE karlfish_user_sessions_total gauge\n';
			prometheusOutput += `karlfish_health_status{status="ok"} 1\n`;
			for (const user of result) {
				prometheusOutput += `karlfish_user_sessions_total{username="${user.username}",type="private"} ${user.privateSessions}\n`;
				prometheusOutput += `karlfish_user_sessions_total{username="${user.username}",type="shared"} ${user.sharedSessions}\n`;
			}
			return res.status(200).type('text/plain').send(prometheusOutput);
		} else if (format === 'text') {
			let textOutput = `Karl Fish Health Check - ${new Date().toISOString()}\n`;
			textOutput += `Status: OK\n\n`;
			textOutput += `Users and Session Counts:\n`;
			for (const user of result) {
				textOutput += `  ${user.username}: ${user.privateSessions} private, ${user.sharedSessions} shared\n`;
			}
			return res.status(200).type('text/plain').send(textOutput);
		} else {
			return res.status(200).json({ status: 'ok', data: result });
		}
	} catch (error: any) {
		console.error('Health check error:', error?.message || error);
		if (format === 'prometheus') {
			return res.status(503).type('text/plain').send(`# HELP karlfish_health_status Health check status\n# TYPE karlfish_health_status gauge\nkarlfish_health_status{status="error"} 0\n`);
		} else if (format === 'text') {
			return res.status(503).type('text/plain').send(`Karl Fish Health Check - ${new Date().toISOString()}\nStatus: ERROR\nService Unavailable\n`);
		} else {
			return res.status(503).json({ status: 'error', error: 'Service Unavailable' });
		}
	}
}


