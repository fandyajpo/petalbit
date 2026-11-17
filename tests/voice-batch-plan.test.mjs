import test from 'node:test';
import assert from 'node:assert/strict';
import {
	QSTASH_MAX_DELAY_SECONDS,
	TTL_BUFFER_SECONDS,
	nextBatchAction,
	rearmDelaySeconds
} from '../src/lib/server/voice-batch-plan.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Regression: the bucket message is published at the first upload of an hour
 * and fires exactly 7 days later. A clip uploaded five minutes after that
 * first one still has five minutes of its own TTL left, so a fixed five
 * one-minute nudges would run out and strand its file in Pinata.
 */
test('a clip created five minutes later in the same hour is re-armed past its own expiry', () => {
	const firstUpload = Date.UTC(2026, 10, 17, 10, 0, 0);
	const secondUpload = firstUpload + 5 * 60 * 1000;
	const bucketMessageAt = firstUpload + 7 * DAY_MS;

	const ttlFirst = firstUpload + 7 * DAY_MS - bucketMessageAt;
	const ttlSecond = secondUpload + 7 * DAY_MS - bucketMessageAt;

	// The first clip is already expired when the message lands, so only the
	// later clip is still live and needs a re-arm (mirrors the route).
	const liveTtls = [ttlFirst, ttlSecond].filter((ttl) => ttl > 0);
	const delay = rearmDelaySeconds(liveTtls);

	assert.equal(delay, 5 * 60 + TTL_BUFFER_SECONDS);
	// The wait must cover the whole remaining lifetime, not just one minute.
	assert.ok(delay * 1000 >= ttlSecond);
	assert.ok(delay > 5 * 60);
});

test('a clip uploaded 59 minutes later is still covered by one re-arm', () => {
	const firstUpload = Date.UTC(2026, 10, 17, 10, 0, 0);
	const lateUpload = firstUpload + 59 * 60 * 1000;
	const ttlAtMessage = lateUpload + 7 * DAY_MS - (firstUpload + 7 * DAY_MS);

	const delay = rearmDelaySeconds([ttlAtMessage]);

	assert.equal(delay, 59 * 60 + TTL_BUFFER_SECONDS);
	assert.ok(delay <= QSTASH_MAX_DELAY_SECONDS);
});

test('the delay never exceeds QStash\'s seven-day free-plan maximum', () => {
	assert.equal(rearmDelaySeconds([7 * DAY_MS]), QSTASH_MAX_DELAY_SECONDS);
	assert.equal(rearmDelaySeconds([30 * DAY_MS]), QSTASH_MAX_DELAY_SECONDS);
});

test('nothing live means no re-arm', () => {
	assert.equal(rearmDelaySeconds([]), null);
	assert.equal(rearmDelaySeconds([-1000]), null);
});

test('a key that vanished between the MGET and the TTL read is retried quickly', () => {
	assert.equal(rearmDelaySeconds([0]), TTL_BUFFER_SECONDS);
});

/**
 * Regression: `remaining` includes entries kept because their bouquet is still
 * alive. Treating that as "more to read" published immediate bucket messages in
 * a loop, burning QStash quota until the clip's TTL happened to elapse.
 */
test('a live-only bucket re-arms instead of looping immediate continuations', () => {
	assert.equal(nextBatchAction({ remaining: 1, live: 1, deleted: 1, failed: 0 }), 'rearm');
	assert.equal(nextBatchAction({ remaining: 50, live: 50, deleted: 0, failed: 0 }), 'rearm');
});

test('a chunked bucket continues only when it actually made progress', () => {
	assert.equal(nextBatchAction({ remaining: 10, live: 0, deleted: 50, failed: 0 }), 'continue');
	// Nothing deleted and unread entries behind a live head: do not spin.
	assert.equal(nextBatchAction({ remaining: 60, live: 50, deleted: 0, failed: 0 }), 'rearm');
});

test('failures retry and an empty queue is done', () => {
	assert.equal(nextBatchAction({ remaining: 0, live: 0, deleted: 9, failed: 1 }), 'retry');
	assert.equal(nextBatchAction({ remaining: 0, live: 0, deleted: 9, failed: 0 }), 'done');
});
