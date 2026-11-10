import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { bouquetInputSchema, fieldErrors } from '$lib/validation';
import { createBouquetId, saveBouquet } from '$lib/server/bouquet-store';
import type { Bouquet } from '$lib/types';

const MAX_BODY_BYTES = 8 * 1024;

export const POST: RequestHandler = async ({ request, url }) => {
	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) {
		return json({ message: 'Format permintaan tidak didukung.' }, { status: 415 });
	}

	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) {
		return json({ message: 'Data buket terlalu besar.' }, { status: 413 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(raw);
	} catch {
		return json({ message: 'Data buket tidak bisa dibaca.' }, { status: 400 });
	}

	const parsed = bouquetInputSchema.safeParse(payload);
	if (!parsed.success) {
		return json(
			{ message: 'Ada isian yang perlu diperbaiki.', errors: fieldErrors(parsed.error) },
			{ status: 400 }
		);
	}

	const bouquet: Bouquet = {
		id: createBouquetId(),
		sender: parsed.data.sender,
		recipient: parsed.data.recipient,
		message: parsed.data.message,
		flowers: parsed.data.flowers,
		createdAt: new Date().toISOString()
	};

	try {
		await saveBouquet(bouquet);
	} catch (error) {
		console.error('[petalbit] failed to store bouquet', error);
		return json(
			{ message: 'Buketmu belum bisa disimpan. Coba lagi sebentar lagi ya.' },
			{ status: 503 }
		);
	}

	return json(
		{
			id: bouquet.id,
			url: `${url.origin}/b/${bouquet.id}`,
			expiresIn: 604_800,
			bouquet
		},
		{ status: 201 }
	);
};
