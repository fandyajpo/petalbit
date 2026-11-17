import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { deletePinataFile, isPinataConfigured, PinataError } from '$lib/server/pinata';
import { bouquetTtlMs, existingBouquetIds } from '$lib/server/bouquet-store';
import {
	bumpVoiceAttempts,
	bumpVoiceWaits,
	clearVoiceQueue,
	queueLength,
	readVoiceBatch,
	removeVoiceEntries,
	type VoiceEntry
} from '$lib/server/voice-queue';
import { safeSecretEqual, scheduleVoiceBatch } from '$lib/server/voice-expiry';
import { nextBatchAction, rearmDelaySeconds } from '$lib/server/voice-batch-plan';

const BUCKET = /^\d{10}$/;
/** Pinata allows bursts, but pace deletes so a big bucket stays under its limit. */
const DELETE_CONCURRENCY = 4;
/** Bounded nudges for clips whose delete keeps failing. */
const MAX_ATTEMPTS = 5;
const RETRY_DELAY = '60s';
/** A bucket should need one re-arm, at most a few if a TTL keeps moving. */
const MAX_TTL_WAITS = 3;

type DeleteResult = { deleted: VoiceEntry[]; failed: VoiceEntry[]; rateLimited: boolean };

async function deleteFiles(entries: VoiceEntry[]): Promise<DeleteResult> {
	const deleted: VoiceEntry[] = [];
	const failed: VoiceEntry[] = [];
	let rateLimited = false;
	let cursor = 0;

	const worker = async () => {
		while (cursor < entries.length) {
			const entry = entries[cursor++];
			if (rateLimited) {
				// Keep it queued for the next run instead of hammering a 429.
				failed.push(entry);
				continue;
			}
			try {
				await deletePinataFile(entry.fileId);
				deleted.push(entry);
			} catch (error) {
				if (error instanceof PinataError && (error.status === 429 || error.status >= 500)) {
					rateLimited = true;
				}
				console.error('[petalbit] voice batch could not delete file', entry.fileId, error);
				failed.push(entry);
			}
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(DELETE_CONCURRENCY, entries.length) }, () => worker())
	);

	return { deleted, failed, rateLimited };
}

/**
 * One QStash message per upload-hour bucket. Everything here is idempotent:
 * deletes tolerate 404, entries leave the queue only after their file is gone,
 * and a Redis failure keeps every file rather than guessing.
 *
 * The message fires at the first upload of the hour + 7d, so clips uploaded
 * later are still alive at that moment. Those entries are not dropped or
 * retried on a fixed minute: the bucket is re-armed at the earliest real
 * remaining TTL, which is at most an hour and therefore publishable.
 */
export const POST: RequestHandler = async ({ request }) => {
	const secret = env.VOICE_EXPIRY_SECRET?.trim();
	if (!secret) {
		return json(
			{ message: 'Voice expiry is not configured (missing VOICE_EXPIRY_SECRET).' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
	if (!safeSecretEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
		return json({ message: 'Unauthorized.' }, { status: 401 });
	}

	if (!isPinataConfigured()) {
		return json({ ok: true, skipped: 'pinata is not configured' });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ message: 'Invalid payload.' }, { status: 400 });
	}

	const body = payload as { bucket?: unknown };
	const bucket = typeof body.bucket === 'string' ? body.bucket : '';
	if (!BUCKET.test(bucket)) {
		return json({ message: 'Invalid payload.' }, { status: 400 });
	}

	let entries: VoiceEntry[];
	let live: Set<string>;
	try {
		entries = await readVoiceBatch(bucket);
		if (entries.length === 0) {
			await clearVoiceQueue(bucket);
			return json({ ok: true, emptied: true });
		}
		live = await existingBouquetIds(entries.map((entry) => entry.bouquetId));
	} catch (error) {
		console.error('[petalbit] voice batch could not read its queue', bucket, error);
		// Fail closed: without a queue read, deleting anything would be a guess.
		return json({ message: 'Could not read the voice queue.' }, { status: 503 });
	}

	const expired = entries.filter((entry) => !live.has(entry.bouquetId));
	const result = await deleteFiles(expired);

	try {
		await removeVoiceEntries(bucket, result.deleted);
	} catch (error) {
		console.error('[petalbit] voice batch could not update its queue', bucket, error);
		// The files are already gone; QStash retries and deletes 404 harmlessly.
		return json({ message: 'Could not update the voice queue.' }, { status: 503 });
	}

	let remaining: number;
	try {
		remaining = await queueLength(bucket);
	} catch (error) {
		console.error('[petalbit] voice batch could not measure its queue', bucket, error);
		return json({ message: 'Could not read the voice queue.' }, { status: 503 });
	}

	const liveEntries = entries.filter((entry) => live.has(entry.bouquetId));
	const action = nextBatchAction({
		remaining,
		live: liveEntries.length,
		deleted: result.deleted.length,
		failed: result.failed.length
	});

	if (action === 'done') {
		await clearVoiceQueue(bucket).catch(() => undefined);
		console.info(
			`[petalbit] voice batch unpinned ${result.deleted.length} clip(s) (bucket ${bucket})`
		);
		return json({ ok: true, bucket, deleted: result.deleted.length });
	}

	// Delete failures and stalled runs: bounded, minute-apart retries.
	if (action === 'retry') {
		let attempts: number;
		try {
			attempts = await bumpVoiceAttempts(bucket);
		} catch (error) {
			// Without the counter we cannot bound retries, so let QStash retry the
			// delivery instead of guessing; the queue is untouched and still safe.
			console.error('[petalbit] voice batch could not count its attempts', bucket, error);
			return json({ message: 'Could not read the voice queue.' }, { status: 503 });
		}

		if (attempts > MAX_ATTEMPTS) {
			console.error(
				`[petalbit] voice batch gave up on bucket ${bucket}: ${result.failed.length} failed, ${live.size} live, ${remaining} queued`
			);
			return json(
				{ ok: false, bucket, deleted: result.deleted.length, gaveUp: true },
				{ status: 200 }
			);
		}

		try {
			await scheduleVoiceBatch({
				origin: new URL(request.url).origin,
				bucket,
				delay: RETRY_DELAY,
				attempt: attempts
			});
		} catch (error) {
			// QStash retries this delivery; the queue is untouched and still safe.
			console.error('[petalbit] voice batch could not reschedule', bucket, error);
			return json({ message: 'Could not reschedule the batch.' }, { status: 503 });
		}

		console.info(
			`[petalbit] voice batch retrying bucket ${bucket}: deleted ${result.deleted.length}, ${remaining} queued, ${live.size} live, ${result.failed.length} failed`
		);
		return json({
			ok: true,
			bucket,
			deleted: result.deleted.length,
			queued: remaining,
			live: live.size,
			failed: result.failed.length,
			retry: true
		});
	}

	// A large bucket is drained in chunks; progress means continuing is safe.
	if (action === 'continue') {
		try {
			await scheduleVoiceBatch({
				origin: new URL(request.url).origin,
				bucket,
				immediate: true
			});
		} catch (error) {
			console.error('[petalbit] voice batch could not continue', bucket, error);
			return json({ message: 'Could not reschedule the batch.' }, { status: 503 });
		}

		console.info(
			`[petalbit] voice batch continued bucket ${bucket}: deleted ${result.deleted.length}, ${remaining} queued`
		);
		return json({
			ok: true,
			bucket,
			deleted: result.deleted.length,
			queued: remaining,
			retry: true
		});
	}

	// Only live clips remain: they were uploaded later in the same hour, so the
	// bucket message arrived before their own TTL ran out.
	const ttls: number[] = [];
	for (const entry of liveEntries) {
		try {
			// A null TTL means the key vanished since the MGET; 0 makes the next
			// run happen shortly, where the delete path will pick it up.
			ttls.push((await bouquetTtlMs(entry.bouquetId)) ?? 0);
		} catch (error) {
			console.error('[petalbit] voice batch could not read a bouquet TTL', entry.bouquetId, error);
			return json({ message: 'Could not verify the bouquet.' }, { status: 503 });
		}
	}

	const delay = rearmDelaySeconds(ttls);
	if (delay === null) {
		console.error(
			`[petalbit] voice batch has ${liveEntries.length} live clip(s) in bucket ${bucket} but no TTL`
		);
		return json({ ok: false, bucket, stranded: true }, { status: 200 });
	}

	let waits: number;
	try {
		waits = await bumpVoiceWaits(bucket);
	} catch (error) {
		console.error('[petalbit] voice batch could not count its re-arms', bucket, error);
		return json({ message: 'Could not read the voice queue.' }, { status: 503 });
	}

	if (waits > MAX_TTL_WAITS) {
		console.error(
			`[petalbit] voice batch stopped re-arming bucket ${bucket}: ${liveEntries.length} clip(s) still inside their TTL after ${waits} waits`
		);
		return json({ ok: false, bucket, stranded: true }, { status: 200 });
	}

	try {
		await scheduleVoiceBatch({
			origin: new URL(request.url).origin,
			bucket,
			delay: `${delay}s`,
			attempt: waits
		});
	} catch (error) {
		console.error('[petalbit] voice batch could not re-arm', bucket, error);
		return json({ message: 'Could not reschedule the batch.' }, { status: 503 });
	}

	console.info(
		`[petalbit] voice batch re-armed bucket ${bucket} in ${delay}s for ${liveEntries.length} live clip(s)`
	);
	return json({
		ok: true,
		bucket,
		deleted: result.deleted.length,
		live: liveEntries.length,
		rearmSeconds: delay,
		retry: true
	});
};
