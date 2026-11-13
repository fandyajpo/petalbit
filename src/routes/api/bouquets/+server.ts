import { json } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import type { RequestHandler } from './$types';
import { bouquetInputSchema, fieldErrors } from '$lib/validation';
import { createBouquetId, saveBouquet } from '$lib/server/bouquet-store';
import { notifyNewBouquet } from '$lib/server/discord';
import type { Bouquet } from '$lib/types';
import { RATE_LIMITS, rateLimit, requestIp } from '$lib/server/rate-limit';

const MAX_BODY_BYTES = 8 * 1024;

export const POST: RequestHandler = async ({ request, url }) => {
	const limited = rateLimit(
		`create:${requestIp(request)}`,
		RATE_LIMITS.create.limit,
		RATE_LIMITS.create.windowMs
	);
	if (!limited.allowed) {
		return json(
			{ message: 'Too many bouquets from here. Take a breather and try again later.' },
			{ status: 429, headers: { 'retry-after': String(limited.retryAfter) } }
		);
	}

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
		layers: parsed.data.layers,
		paper: parsed.data.paper,
		background: parsed.data.background,
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

	// The bouquet is already saved, so a failed notification must never slow
	// down or fail the response. waitUntil keeps this Vercel function alive
	// after the response is sent, otherwise the runtime can freeze the fetch
	// before it reaches Discord.
	waitUntil(notifyNewBouquet(bouquet, url.origin));

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
