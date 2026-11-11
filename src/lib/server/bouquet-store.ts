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

export async function saveBouquet(bouquet: Bouquet): Promise<void> {
	const raw = JSON.stringify(bouquet);
	const db = requireRedis();

	if (db) {
		await db.set(key(bouquet.id), raw, { ex: BOUQUET_TTL_SECONDS });
		return;
	}

	memoryStore().set(key(bouquet.id), {
		raw,
		expiresAt: Date.now() + BOUQUET_TTL_SECONDS * 1000
	});
}

export async function getBouquet(id: string): Promise<Bouquet | null> {
	const db = requireRedis();

	if (db) {
		// Upstash may return the parsed object or a raw string depending on client.
		const stored = await db.get<Bouquet | string>(key(id));
		if (!stored) return null;
		if (typeof stored === 'string') {
			try {
				return JSON.parse(stored) as Bouquet;
			} catch {
				return null;
			}
		}
		return stored;
	}

	const entry = memoryStore().get(key(id));
	if (!entry) return null;
	if (entry.expiresAt <= Date.now()) {
		memoryStore().delete(key(id));
		return null;
	}
	try {
		return JSON.parse(entry.raw) as Bouquet;
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
