import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBouquet } from '$lib/server/bouquet-store';
import { bouquetIdSchema } from '$lib/validation';
import { BOUQUET_TTL_SECONDS } from '$lib/types';

const timeFormat = new Intl.DateTimeFormat('id-ID', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'Asia/Jakarta'
});

export const load: PageServerLoad = async ({ params, url }) => {
	const parsed = bouquetIdSchema.safeParse(params.id);
	if (!parsed.success) {
		throw error(404, 'Buket ini tidak ditemukan.');
	}

	let bouquet;
	try {
		bouquet = await getBouquet(parsed.data);
	} catch (cause) {
		console.error('[petalbit] failed to read bouquet', cause);
		throw error(503, 'Buket ini sedang tidak bisa dibuka. Coba lagi sebentar lagi.');
	}

	if (!bouquet) {
		throw error(404, 'Buket ini sudah tidak ada. Mungkin sudah lewat tujuh hari.');
	}

	const created = new Date(bouquet.createdAt);
	const expires = new Date(created.getTime() + BOUQUET_TTL_SECONDS * 1000);

	return {
		bouquet,
		url: `${url.origin}/b/${bouquet.id}`,
		createdLabel: `${timeFormat.format(created)} WIB`,
		expiresLabel: `${timeFormat.format(expires)} WIB`,
		expiresAt: expires.toISOString()
	};
};
