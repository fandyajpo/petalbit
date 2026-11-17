import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isPinataConfigured } from '$lib/server/pinata';
import { isExpirySchedulerConfigured, isLoopbackOrigin } from '$lib/server/voice-expiry';
import { dev } from '$app/environment';
import { VOICE_MAX_SECONDS } from '$lib/voice';

/**
 * Capability probe for the recorder. Audio is uploaded as part of the bouquet
 * itself (POST /api/bouquets with multipart form data), so it is pinned with
 * the bouquet id and can be cleaned up when that bouquet disappears.
 */
export const GET: RequestHandler = ({ request }) => {
	const origin = new URL(request.url).origin;
	return json(
		{
			// Production needs both storage and the expiry scheduler, otherwise
			// audio would be pinned with no way to remove it. Local dev skips the
			// scheduler because QStash cannot call localhost.
			enabled: isPinataConfigured() && (dev || isExpirySchedulerConfigured()),
			/** False locally: QStash cannot call localhost, so clips are not auto-removed. */
			cleanup: isExpirySchedulerConfigured() && !(dev && isLoopbackOrigin(origin)),
			maxSeconds: VOICE_MAX_SECONDS
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
