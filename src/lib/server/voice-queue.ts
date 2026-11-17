import { dev } from '$app/environment';
import { sharedRedis } from '$lib/server/bouquet-store';
import { isLoopbackOrigin, scheduleVoiceBatch } from '$lib/server/voice-expiry';

/**
 * Hour-bucketed queue of voice notes waiting to be unpinned.
 *
 * `voice:queue:<YYYYMMDDHH>` is a Redis list of `bouquetId|fileId|cid` entries,
 * `voice:scheduled:<bucket>` marks that a QStash message exists for the bucket.
 * Buckets are written only during their creation hour, then sealed, so the
 * processor never races new writes.
 */

export const VOICE_QUEUE_TTL_SECONDS = 8 * 24 * 60 * 60;
/** Deletes per invocation, sized for a serverless function's time budget. */
export const VOICE_BATCH_LIMIT = 50;
const SEPARATOR = '|';

export type VoiceEntry = { bouquetId: string; fileId: string; cid: string };

export function bucketFor(date = new Date()): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	const hour = String(date.getUTCHours()).padStart(2, '0');
	return `${year}${month}${day}${hour}`;
}

const queueKey = (bucket: string) => `voice:queue:${bucket}`;
const markerKey = (bucket: string) => `voice:scheduled:${bucket}`;
const attemptsKey = (bucket: string) => `voice:attempts:${bucket}`;
const waitsKey = (bucket: string) => `voice:waits:${bucket}`;

function serialize(entry: VoiceEntry): string {
	return `${entry.bouquetId}${SEPARATOR}${entry.fileId}${SEPARATOR}${entry.cid}`;
}

function parse(raw: string): VoiceEntry | null {
	const [bouquetId, fileId, cid] = raw.split(SEPARATOR);
	if (!bouquetId || !fileId) return null;
	return { bouquetId, fileId, cid: cid ?? '' };
}

/**
 * Queue a freshly pinned clip and make sure its bucket has a QStash message.
 * Entries are only appended after a message is known to exist, so a failed
 * publish can never leave audio that nothing will ever clean up.
 */
export async function enqueueVoiceEntry(input: {
	origin: string;
	bouquetId: string;
	fileId: string;
	cid: string;
}): Promise<void> {
	if (dev && isLoopbackOrigin(input.origin)) {
		console.warn(
			'[petalbit] voice queue skipped for a localhost origin; pinned audio needs manual cleanup.'
		);
		return;
	}

	const db = sharedRedis();
	if (!db) throw new Error('Redis is not configured for the voice queue');

	const bucket = bucketFor();
	const scheduled = await db.get(markerKey(bucket));

	if (!scheduled) {
		await scheduleVoiceBatch({ origin: input.origin, bucket });
		// Two requests can both publish during this window; duplicate bucket
		// messages are harmless, a missing one is not.
		await db.set(markerKey(bucket), '1', { ex: VOICE_QUEUE_TTL_SECONDS });
	}

	await db.rpush(queueKey(bucket), serialize(input));
	await db.expire(queueKey(bucket), VOICE_QUEUE_TTL_SECONDS);
}

export async function readVoiceBatch(bucket: string): Promise<VoiceEntry[]> {
	const db = sharedRedis();
	if (!db) throw new Error('Redis is not configured for the voice queue');
	const raw = await db.lrange<string>(queueKey(bucket), 0, VOICE_BATCH_LIMIT - 1);
	return raw.map(parse).filter((entry): entry is VoiceEntry => entry !== null);
}

export async function queueLength(bucket: string): Promise<number> {
	const db = sharedRedis();
	if (!db) return 0;
	return db.llen(queueKey(bucket));
}

export async function removeVoiceEntries(bucket: string, entries: VoiceEntry[]): Promise<void> {
	if (entries.length === 0) return;
	const db = sharedRedis();
	if (!db) return;
	for (const entry of entries) {
		await db.lrem(queueKey(bucket), 1, serialize(entry));
	}
}

export async function bumpVoiceAttempts(bucket: string): Promise<number> {
	const db = sharedRedis();
	if (!db) return 0;
	const attempts = await db.incr(attemptsKey(bucket));
	await db.expire(attemptsKey(bucket), VOICE_QUEUE_TTL_SECONDS);
	return attempts;
}

/** Counts boundary re-arms separately from failures, so neither starves the other. */
export async function bumpVoiceWaits(bucket: string): Promise<number> {
	const db = sharedRedis();
	if (!db) return 0;
	const waits = await db.incr(waitsKey(bucket));
	await db.expire(waitsKey(bucket), VOICE_QUEUE_TTL_SECONDS);
	return waits;
}

export async function clearVoiceQueue(bucket: string): Promise<void> {
	const db = sharedRedis();
	if (!db) return;
	await db.del(queueKey(bucket), markerKey(bucket), attemptsKey(bucket), waitsKey(bucket));
}
