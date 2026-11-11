import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBouquet } from '$lib/server/bouquet-store';
import { bouquetIdSchema } from '$lib/validation';
import { BOUQUET_TTL_SECONDS } from '$lib/types';

const timeFormat = new Intl.DateTimeFormat('en-US', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'UTC'
});

export const load: PageServerLoad = async ({ params, url }) => {
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

	return {
		bouquet,
		url: `${url.origin}/b/${bouquet.id}`,
		ogImage: new URL('/og.png', url.origin).href,
		createdLabel: `${timeFormat.format(created)} UTC`,
		expiresLabel: `${timeFormat.format(expires)} UTC`,
		expiresAt: expires.toISOString()
	};
};
