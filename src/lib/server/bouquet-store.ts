import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { BOUQUET_TTL_SECONDS, type Bouquet } from '$lib/types';

/**
 * Bouquets live in Upstash Redis under `bouquet:{id}` with a seven day TTL.
 *
 * When the Upstash environment variables are missing during local development
 * we fall back to a process-local store so the flow can be tested end to end.
 * That fallback is never used in production.
 */
type MemoryEntry = { raw: string; expiresAt: number };

const MEMORY_KEY = Symbol.for('petalbit.memory-store');

function memoryStore(): Map<string, MemoryEntry> {
	const globalWithStore = globalThis as typeof globalThis & {
		[MEMORY_KEY]?: Map<string, MemoryEntry>;
	};
	if (!globalWithStore[MEMORY_KEY]) globalWithStore[MEMORY_KEY] = new Map();
	return globalWithStore[MEMORY_KEY];
}

let client: Redis | null | undefined;

function redis(): Redis | null {
	if (client !== undefined) return client;
	const url = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;

	if (url && token) {
		client = new Redis({ url, token });
	} else {
		client = null;
		if (!dev) {
			console.error('[petalbit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set.');
		} else {
			console.warn('[petalbit] Upstash not configured — using in-memory bouquet store for dev.');
		}
	}
	return client;
}

/** Shared client for the voice queue; null in the local in-memory fallback. */
export function sharedRedis(): Redis | null {
	return redis();
}

/**
 * In production a process-local store would hand out bouquet links that break
 * on the next serverless invocation, so refuse to pretend the write worked.
 */
function requireRedis(): Redis | null {
	const db = redis();
	if (!db && !dev) {
		throw new Error('Bouquet storage is not configured (missing Upstash credentials).');
	}
	return db;
}

const key = (id: string) => `bouquet:${id}`;

/**
 * Bouquets never change after creation, so a process-local cache removes
 * repeat Upstash round trips for the same link (a burst of opens, the share
 * page plus its image). Entries never outlive the bouquet itself.
 */
type CacheEntry = { bouquet: Bouquet; cachedUntil: number };

const CACHE_KEY = Symbol.for('petalbit.read-cache');
const READ_CACHE_TTL_MS = 5 * 60_000;
const READ_CACHE_MAX = 250;

function readCache(): Map<string, CacheEntry> {
	const globalWithCache = globalThis as typeof globalThis & {
		[CACHE_KEY]?: Map<string, CacheEntry>;
	};
	if (!globalWithCache[CACHE_KEY]) globalWithCache[CACHE_KEY] = new Map();
	return globalWithCache[CACHE_KEY];
}

function cacheGet(id: string): Bouquet | null {
	const entry = readCache().get(id);
	if (!entry) return null;
	if (entry.cachedUntil <= Date.now()) {
		readCache().delete(id);
		return null;
	}
	return entry.bouquet;
}

/* Expired or unknown links repeat just as often as real ones. A short negative
 * cache keeps crawlers and refreshes from turning misses into Redis reads. */
const MISS_KEY = Symbol.for('petalbit.miss-cache');
const MISS_TTL_MS = 30_000;
const MISS_MAX = 500;

function missCache(): Map<string, number> {
	const globalWithMisses = globalThis as typeof globalThis & {
		[MISS_KEY]?: Map<string, number>;
	};
	if (!globalWithMisses[MISS_KEY]) globalWithMisses[MISS_KEY] = new Map();
	return globalWithMisses[MISS_KEY];
}

function isMiss(id: string): boolean {
	const until = missCache().get(id);
	if (!until) return false;
	if (until <= Date.now()) {
		missCache().delete(id);
		return false;
	}
	return true;
}

function noteMiss(id: string): void {
	const cache = missCache();
	if (cache.size >= MISS_MAX) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(id, Date.now() + MISS_TTL_MS);
}

function clearMiss(id: string): void {
	missCache().delete(id);
}

function cacheSet(id: string, bouquet: Bouquet): void {
	clearMiss(id);
	const expiresAt = Date.parse(bouquet.createdAt) + BOUQUET_TTL_SECONDS * 1000;
	const cachedUntil = Number.isFinite(expiresAt)
		? Math.min(Date.now() + READ_CACHE_TTL_MS, expiresAt)
		: Date.now() + READ_CACHE_TTL_MS;
	if (cachedUntil <= Date.now()) return;

	const cache = readCache();
	if (cache.size >= READ_CACHE_MAX) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(id, { bouquet, cachedUntil });
}

export async function saveBouquet(bouquet: Bouquet): Promise<void> {
	const raw = JSON.stringify(bouquet);
	const db = requireRedis();

	if (db) {
		await db.set(key(bouquet.id), raw, { ex: BOUQUET_TTL_SECONDS });
		cacheSet(bouquet.id, bouquet);
		return;
	}

	memoryStore().set(key(bouquet.id), {
		raw,
		expiresAt: Date.now() + BOUQUET_TTL_SECONDS * 1000
	});
	cacheSet(bouquet.id, bouquet);
}

/**
 * Batch existence check for the voice queue. One MGET instead of N round trips;
 * keys are uncached so an expired bouquet is never reported as alive.
 */
export async function existingBouquetIds(ids: string[]): Promise<Set<string>> {
	const alive = new Set<string>();
	if (ids.length === 0) return alive;

	const db = requireRedis();
	if (db) {
		const values: unknown = await db.mget(...ids.map((id) => key(id)));
		// A null/non-array result means the command did not run as expected; fail
		// closed so the caller never treats unknown bouquets as expired.
		if (!Array.isArray(values)) throw new Error('Redis MGET returned no result');
		ids.forEach((id, index) => {
			if (values[index]) alive.add(id);
		});
		return alive;
	}

	const store = memoryStore();
	const now = Date.now();
	for (const id of ids) {
		const entry = store.get(key(id));
		if (entry && entry.expiresAt > now) alive.add(id);
	}
	return alive;
}

/**
 * Remaining lifetime of a bouquet in ms, or null when it is already gone.
 * Used to re-arm a voice bucket at the last clip's real expiry.
 */
export async function bouquetTtlMs(id: string): Promise<number | null> {
	const db = requireRedis();
	if (db) {
		const ttl = await db.pttl(key(id));
		return typeof ttl === 'number' && ttl > 0 ? ttl : null;
	}

	const entry = memoryStore().get(key(id));
	if (!entry) return null;
	const remaining = entry.expiresAt - Date.now();
	return remaining > 0 ? remaining : null;
}

/** Uncached existence check, used by the single-bouquet expiry webhook. */
export async function bouquetExists(id: string): Promise<boolean> {
	const db = requireRedis();
	if (db) {
		const count = await db.exists(key(id));
		return count === 1;
	}
	const entry = memoryStore().get(key(id));
	return Boolean(entry && entry.expiresAt > Date.now());
}

export async function getBouquet(id: string): Promise<Bouquet | null> {
	const cached = cacheGet(id);
	if (cached) return cached;
	if (isMiss(id)) return null;

	const db = requireRedis();

	if (db) {
		// Upstash may return the parsed object or a raw string depending on client.
		const stored = await db.get<Bouquet | string>(key(id));
		if (!stored) {
			noteMiss(id);
			return null;
		}
		if (typeof stored === 'string') {
			try {
				const parsed = JSON.parse(stored) as Bouquet;
				cacheSet(id, parsed);
				return parsed;
			} catch {
				noteMiss(id);
				return null;
			}
		}
		cacheSet(id, stored);
		return stored;
	}

	const entry = memoryStore().get(key(id));
	if (!entry) {
		noteMiss(id);
		return null;
	}
	if (entry.expiresAt <= Date.now()) {
		memoryStore().delete(key(id));
		noteMiss(id);
		return null;
	}
	try {
		const parsed = JSON.parse(entry.raw) as Bouquet;
		cacheSet(id, parsed);
		return parsed;
	} catch {
		noteMiss(id);
		return null;
	}
}

/** Cryptographically random, URL-friendly id (no ambiguous characters). */
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export function createBouquetId(length = 12): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let id = '';
	for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
	return id;
}
