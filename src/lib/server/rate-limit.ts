import { ipAddress } from '@vercel/functions';

/**
 * Process-local fixed-window limiter. Serverless instances are ephemeral, so
 * this is a burst guard rather than a global quota: it stops one client from
 * hammering a warm function and firing Upstash on every request. The CDN cache
 * on bouquet pages and share images handles the rest.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult =
	| { allowed: true }
	| { allowed: false; retryAfter: number };

export const RATE_LIMITS = {
	create: { limit: 10, windowMs: 10 * 60_000 },
	read: { limit: 120, windowMs: 60_000 },
	shareImage: { limit: 60, windowMs: 60_000 }
} as const;

function prune(now: number) {
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) buckets.delete(key);
	}
	// Still oversized after dropping expired windows: evict the oldest keys.
	while (buckets.size > MAX_KEYS) {
		const oldest = buckets.keys().next().value;
		if (oldest === undefined) break;
		buckets.delete(oldest);
	}
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	const existing = buckets.get(key);

	if (!existing || existing.resetAt <= now) {
		if (buckets.size >= MAX_KEYS) prune(now);
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true };
	}

	if (existing.count >= limit) {
		return {
			allowed: false,
			retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
		};
	}

	existing.count += 1;
	return { allowed: true };
}

/** Best-effort client IP. Vercel sets trusted forwarding headers. */
export function requestIp(request: Request): string {
	try {
		const ip = ipAddress(request);
		if (ip) return ip;
	} catch {
		/* fall through to headers for local/non-Vercel hosts */
	}
	const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	return forwarded || request.headers.get('x-real-ip') || 'local';
}
