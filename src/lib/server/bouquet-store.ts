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

export function isStorageConfigured(): boolean {
	const db = redis();
	return db !== null;
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
 * Bouquets never change after creation, so a short-lived process-local cache
 * removes repeat Upstash round trips for the same link (a burst of opens, the
 * share page plus its prefetches). Entries expire after 60s and never outlive
 * the bouquet itself.
 */
type CacheEntry = { bouquet: Bouquet; cachedUntil: number };

const CACHE_KEY = Symbol.for('petalbit.read-cache');
const READ_CACHE_TTL_MS = 60_000;
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

function cacheSet(id: string, bouquet: Bouquet): void {
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

export async function getBouquet(id: string): Promise<Bouquet | null> {
	const cached = cacheGet(id);
	if (cached) return cached;

	const db = requireRedis();

	if (db) {
		// Upstash may return the parsed object or a raw string depending on client.
		const stored = await db.get<Bouquet | string>(key(id));
		if (!stored) return null;
		if (typeof stored === 'string') {
			try {
				const parsed = JSON.parse(stored) as Bouquet;
				cacheSet(id, parsed);
				return parsed;
			} catch {
				return null;
			}
		}
		cacheSet(id, stored);
		return stored;
	}

	const entry = memoryStore().get(key(id));
	if (!entry) return null;
	if (entry.expiresAt <= Date.now()) {
		memoryStore().delete(key(id));
		return null;
	}
	try {
		const parsed = JSON.parse(entry.raw) as Bouquet;
		cacheSet(id, parsed);
		return parsed;
	} catch {
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
