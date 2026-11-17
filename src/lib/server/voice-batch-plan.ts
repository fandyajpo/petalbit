/**
 * Pure scheduling math for the voice queue, kept free of runtime imports so it
 * can be tested directly.
 *
 * A bucket message is published when the first clip of an hour is uploaded, so
 * it fires at first-upload + 7d. A clip uploaded later in that same hour is
 * still inside its own 7-day TTL at that moment. Instead of nudging by a fixed
 * minute (five of those cannot cover a 59-minute gap), the bucket is re-armed
 * at the earliest real remaining TTL.
 */

/** QStash's free plan refuses anything longer than exactly seven days. */
export const QSTASH_MAX_DELAY_SECONDS = 7 * 24 * 60 * 60;

/** Small cushion so the re-armed message lands after Redis considers the key gone. */
export const TTL_BUFFER_SECONDS = 15;

/**
 * What a finished run should do next. Kept pure so the loop hazard below is
 * covered by tests: entries kept because their bouquet is still alive are part
 * of `remaining`, so a naive `remaining > 0` means "continue" and publishes
 * immediate messages forever. Progress must be actual deleted files, and a
 * live-only queue must wait for its TTL instead.
 */
export type BatchAction = 'done' | 'retry' | 'continue' | 'rearm';

export function nextBatchAction(input: {
	remaining: number;
	live: number;
	deleted: number;
	failed: number;
}): BatchAction {
	if (input.failed > 0) return 'retry';
	const unread = Math.max(0, input.remaining - input.live);
	if (unread > 0 && input.deleted > 0) return 'continue';
	if (input.live > 0) return 'rearm';
	if (unread > 0) return 'retry';
	return 'done';
}

/**
 * Seconds to wait before checking a bucket again, from the remaining TTLs of
 * the clips that are still alive. A zero TTL means "due now" (the key vanished
 * between the existence check and the TTL read). Null means nothing is queued.
 */
export function rearmDelaySeconds(liveTtlsMs: number[]): number | null {
	let shortest = Number.POSITIVE_INFINITY;
	for (const ttl of liveTtlsMs) {
		if (Number.isFinite(ttl) && ttl >= 0) shortest = Math.min(shortest, ttl);
	}
	if (!Number.isFinite(shortest)) return null;

	const seconds = Math.ceil(shortest / 1000) + TTL_BUFFER_SECONDS;
	return Math.min(QSTASH_MAX_DELAY_SECONDS, Math.max(1, seconds));
}
