import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { deletePinataFile } from '$lib/server/pinata';
import { bouquetExists } from '$lib/server/bouquet-store';
import { safeSecretEqual, scheduleVoiceExpiry } from '$lib/server/voice-expiry';

const BOUQUET_ID = /^[a-z0-9]{8,24}$/;
const FILE_ID = /^[a-zA-Z0-9-]{8,64}$/;
/** A TTL boundary can land the message a moment early; nudge, then give up. */
const MAX_RETRIES = 2;
const RETRY_DELAY = '15m';

/**
 * QStash delivers this ~7 days after a bouquet with a voice note was created.
 * If the bouquet is somehow still alive (TTL boundary), nudge the message once
 * instead of unpinning audio that still belongs to a live page.
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

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ message: 'Invalid payload.' }, { status: 400 });
	}

	const body = payload as { bouquetId?: unknown; fileId?: unknown; cid?: unknown; attempt?: unknown };
	const bouquetId = typeof body.bouquetId === 'string' ? body.bouquetId : '';
	const fileId = typeof body.fileId === 'string' ? body.fileId : '';
	const cid = typeof body.cid === 'string' ? body.cid : '';
	const attempt = typeof body.attempt === 'number' && Number.isFinite(body.attempt) ? body.attempt : 0;

	if (!BOUQUET_ID.test(bouquetId) || !FILE_ID.test(fileId)) {
		return json({ message: 'Invalid payload.' }, { status: 400 });
	}

	let live: boolean;
	try {
		live = await bouquetExists(bouquetId);
	} catch (error) {
		console.error('[petalbit] voice expiry could not read bouquet', error);
		// Fail closed: a Redis hiccup must not unpin audio for a live bouquet.
		return json({ message: 'Could not verify the bouquet.' }, { status: 503 });
	}

	if (live) {
		if (attempt < MAX_RETRIES) {
			try {
				await scheduleVoiceExpiry({
					origin: new URL(request.url).origin,
					bouquetId,
					fileId,
					cid,
					delay: RETRY_DELAY,
					attempt: attempt + 1
				});
			} catch (error) {
				// Keeping the file is the safe failure: QStash will retry this delivery.
				console.error('[petalbit] voice expiry could not reschedule', error);
				return json({ message: 'Could not reschedule the check.' }, { status: 503 });
			}
		}
		return json({ ok: true, skipped: 'bouquet still exists' });
	}

	try {
		await deletePinataFile(fileId);
	} catch (error) {
		console.error('[petalbit] voice expiry could not delete file', fileId, error);
		return json({ message: 'Could not delete the voice note.' }, { status: 502 });
	}

	console.info(`[petalbit] voice expiry unpinned ${fileId} (bouquet ${bouquetId})`);
	return json({ ok: true, deleted: fileId });
};
