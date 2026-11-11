import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { bouquetInputSchema, fieldErrors } from '$lib/validation';
import { createBouquetId, saveBouquet } from '$lib/server/bouquet-store';
import type { Bouquet } from '$lib/types';

const MAX_BODY_BYTES = 8 * 1024;

export const POST: RequestHandler = async ({ request, url }) => {
	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) {
		return json({ message: 'Unsupported request format.' }, { status: 415 });
	}

	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) {
		return json({ message: 'Bouquet data is too big.' }, { status: 413 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(raw);
	} catch {
		return json({ message: 'Could not read bouquet data.' }, { status: 400 });
	}

	const parsed = bouquetInputSchema.safeParse(payload);
	if (!parsed.success) {
		return json(
			{ message: 'Some fields need fixing.', errors: fieldErrors(parsed.error) },
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
			{ message: 'Could not save your bouquet rn. Try again in a sec.' },
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
