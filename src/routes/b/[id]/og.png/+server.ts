import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBouquet } from '$lib/server/bouquet-store';
import { bouquetIdSchema } from '$lib/validation';
import { renderBouquetOg } from '$lib/server/og-image';
import { RATE_LIMITS, rateLimit, requestIp } from '$lib/server/rate-limit';

export const GET: RequestHandler = async ({ params, url, request }) => {
	const limited = rateLimit(
		`share-image:${requestIp(request)}`,
		RATE_LIMITS.shareImage.limit,
		RATE_LIMITS.shareImage.windowMs
	);
	if (!limited.allowed) {
		return new Response('Too many share image requests.', {
			status: 429,
			headers: { 'retry-after': String(limited.retryAfter) }
		});
	}

	const parsed = bouquetIdSchema.safeParse(params.id);
	if (!parsed.success) throw error(404, 'Bouquet not found');

	let bouquet;
	try {
		bouquet = await getBouquet(parsed.data);
	} catch (cause) {
		console.error('[petalbit] failed to read bouquet for og image', cause);
		throw error(503, 'Bouquet unavailable');
	}
	if (!bouquet) throw error(404, 'Bouquet not found');

	let png: Buffer;
	try {
		png = await renderBouquetOg(bouquet, url.origin);
	} catch (cause) {
		console.error('[petalbit] failed to render og image', cause);
		throw error(500, 'Could not render this bouquet preview');
	}

	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400'
		}
	});
};
