import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBouquet } from '$lib/server/bouquet-store';
import { bouquetIdSchema } from '$lib/validation';
import { BOUQUET_TTL_SECONDS } from '$lib/types';
import { RATE_LIMITS, rateLimit, requestIp } from '$lib/server/rate-limit';

const timeFormat = new Intl.DateTimeFormat('en-US', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'UTC'
});

export const load: PageServerLoad = async ({ params, url, setHeaders, request }) => {
	const limited = rateLimit(
		`read:${requestIp(request)}`,
		RATE_LIMITS.read.limit,
		RATE_LIMITS.read.windowMs
	);
	if (!limited.allowed) {
		setHeaders({ 'retry-after': String(limited.retryAfter) });
		throw error(429, 'Too many bouquet opens from here. Give it a minute and try again.');
	}

	const parsed = bouquetIdSchema.safeParse(params.id);
	if (!parsed.success) {
		throw error(404, 'This bouquet was not found.');
	}

	let bouquet;
	try {
		bouquet = await getBouquet(parsed.data);
	} catch (cause) {
		console.error('[petalbit] failed to read bouquet', cause);
		throw error(503, 'This bouquet cannot be opened right now. Try again in a sec.');
	}

	if (!bouquet) {
		throw error(404, 'This bouquet is gone. It probably expired after seven days.');
	}

	const created = new Date(bouquet.createdAt);
	const expires = new Date(created.getTime() + BOUQUET_TTL_SECONDS * 1000);
	const secondsLeft = Math.floor((expires.getTime() - Date.now()) / 1000);

	if (secondsLeft > 0) {
		// A bouquet is immutable once saved, so the rendered page can sit in the
		// CDN for a few minutes. The stale window never outlives the bouquet.
		setHeaders({
			'cache-control': `public, max-age=0, s-maxage=${Math.min(secondsLeft, 3600)}, stale-while-revalidate=${Math.min(secondsLeft, 86_400)}`
		});
	}

	return {
		bouquet,
		url: `${url.origin}/b/${bouquet.id}`,
		ogImage: new URL(`/b/${bouquet.id}/og.png`, url.origin).href,
		cardImage: new URL(`/b/${bouquet.id}/card.png`, url.origin).href,
		createdLabel: `${timeFormat.format(created)} UTC`,
		expiresLabel: `${timeFormat.format(expires)} UTC`,
		expiresAt: expires.toISOString()
	};
};
