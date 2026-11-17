import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

/** Constant-time string comparison for secrets (avoids timing side-channels). */
export function safeSecretEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	const encoder = new TextEncoder();
	try {
		return timingSafeEqual(encoder.encode(a), encoder.encode(b));
	} catch {
		return false;
	}
}
import { dev } from '$app/environment';

/**
 * Upstash Redis cannot call a webhook when a key expires: keyspace
 * notifications only exist over a persistent pub/sub connection, which a
 * serverless function cannot hold. QStash schedules the HTTP call instead.
 *
 * Voice notes are batched by creation hour, so one QStash message covers every
 * clip made in that hour instead of one message per bouquet.
 */

const QSTASH_ENDPOINT = 'https://qstash.upstash.io/v2/publish';
/** Bouquets live for exactly seven days; QStash's free plan allows 7d max. */
export const VOICE_EXPIRY_DELAY = '7d';

function qstashToken(): string | null {
	return env.QSTASH_TOKEN?.trim() || null;
}

export function isExpirySchedulerConfigured(): boolean {
	return Boolean(qstashToken() && env.VOICE_EXPIRY_SECRET?.trim());
}

/** Testing knob: set VOICE_EXPIRY_DELAY=45s to exercise the whole loop quickly. */
export function configuredDelay(): string {
	return env.VOICE_EXPIRY_DELAY?.trim() || VOICE_EXPIRY_DELAY;
}

export function isLoopbackOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
	} catch {
		return false;
	}
}

type PublishInput = {
	origin: string;
	path: string;
	body: unknown;
	/** Omit for immediate delivery. */
	delay?: string;
};

async function publish(input: PublishInput): Promise<void> {
	const token = qstashToken();
	const secret = env.VOICE_EXPIRY_SECRET?.trim();
	if (!token || !secret) throw new Error('QSTASH_TOKEN / VOICE_EXPIRY_SECRET are not configured');

	const destination = `${input.origin.replace(/\/+$/, '')}${input.path}`;
	const headers: Record<string, string> = {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
		'Upstash-Retries': '5',
		'Upstash-Forward-Authorization': `Bearer ${secret}`
	};
	if (input.delay) headers['Upstash-Delay'] = input.delay;

	const response = await fetch(`${QSTASH_ENDPOINT}/${destination}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(input.body)
	});

	if (!response.ok) {
		if (response.status === 401) {
			console.error(
				'[petalbit] QStash rejected QSTASH_TOKEN. Copy the token from console.upstash.com/qstash (a Redis REST token will not work).'
			);
		}
		const detail = (await response.text().catch(() => '')).slice(0, 300);
		throw new Error(`QStash publish failed (${response.status})${detail ? `: ${detail}` : ''}`);
	}
}

/**
 * Legacy single-bouquet schedule. Kept because messages published before the
 * batching change are still in flight; new bouquets use the queue instead.
 */
export async function scheduleVoiceExpiry(input: {
	origin: string;
	bouquetId: string;
	fileId: string;
	cid: string;
	delay?: string;
	attempt?: number;
}): Promise<{ scheduled: boolean }> {
	if (dev && isLoopbackOrigin(input.origin)) {
		console.warn('[petalbit] voice expiry not scheduled for a localhost origin.');
		return { scheduled: false };
	}

	await publish({
		origin: input.origin,
		path: '/api/voice/expire',
		delay: input.delay ?? configuredDelay(),
		body: {
			bouquetId: input.bouquetId,
			fileId: input.fileId,
			cid: input.cid,
			attempt: input.attempt ?? 0
		}
	});

	return { scheduled: true };
}

/** One message per upload-hour bucket; the body only names the bucket. */
export async function scheduleVoiceBatch(input: {
	origin: string;
	bucket: string;
	delay?: string;
	immediate?: boolean;
	attempt?: number;
}): Promise<{ scheduled: boolean }> {
	if (dev && isLoopbackOrigin(input.origin)) {
		console.warn('[petalbit] voice batch not scheduled for a localhost origin.');
		return { scheduled: false };
	}

	await publish({
		origin: input.origin,
		path: '/api/voice/expire-batch',
		delay: input.immediate ? undefined : (input.delay ?? configuredDelay()),
		body: { bucket: input.bucket, attempt: input.attempt ?? 0 }
	});

	return { scheduled: true };
}
