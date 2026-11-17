import { json } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import type { RequestHandler } from './$types';
import { bouquetInputSchema, fieldErrors } from '$lib/validation';
import { createBouquetId, saveBouquet } from '$lib/server/bouquet-store';
import { notifyNewBouquet } from '$lib/server/discord';
import { deletePinataFile, uploadVoiceNote, voiceUrl } from '$lib/server/pinata';
import { validateVoiceFile } from '$lib/server/voice-upload';
import { enqueueVoiceEntry } from '$lib/server/voice-queue';
import type { Bouquet } from '$lib/types';
import { RATE_LIMITS, rateLimit, requestIp } from '$lib/server/rate-limit';

const MAX_JSON_BYTES = 8 * 1024;
/** 10s of 128 kbps MP3 is ~160 kB; leave room for multipart framing. */
const MAX_FORM_BYTES = 1_200_000;

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
	let payload: unknown;
	let voiceFile: File | null = null;

	if (contentType.includes('multipart/form-data')) {
		// Enforce the limit on the actual body, not just the declared
		// content-length, which a client can omit or misreport.
		const body = await request.arrayBuffer();
		if (body.byteLength > MAX_FORM_BYTES) {
			return json({ message: 'That voice note is too big.' }, { status: 413 });
		}

		let form: FormData;
		try {
			form = await new Response(body, {
				headers: { 'content-type': contentType }
			}).formData();
		} catch {
			return json({ message: 'Could not read the bouquet.' }, { status: 400 });
		}

		const raw = form.get('data');
		if (typeof raw !== 'string') {
			return json({ message: 'Could not read bouquet data.' }, { status: 400 });
		}
		if (raw.length > MAX_JSON_BYTES) {
			return json({ message: 'Bouquet data is too big.' }, { status: 413 });
		}

		try {
			payload = JSON.parse(raw);
		} catch {
			return json({ message: 'Could not read bouquet data.' }, { status: 400 });
		}

		const file = form.get('voice');
		if (file instanceof File && file.size > 0) voiceFile = file;
	} else if (contentType.includes('application/json')) {
		const raw = await request.text();
		if (raw.length > MAX_JSON_BYTES) {
			return json({ message: 'Bouquet data is too big.' }, { status: 413 });
		}
		try {
			payload = JSON.parse(raw);
		} catch {
			return json({ message: 'Could not read bouquet data.' }, { status: 400 });
		}
	} else {
		return json({ message: 'Unsupported request format.' }, { status: 415 });
	}

	const parsed = bouquetInputSchema.safeParse(payload);
	if (!parsed.success) {
		return json(
			{ message: 'Some fields need fixing.', errors: fieldErrors(parsed.error) },
			{ status: 400 }
		);
	}

	// The bouquet id is minted first so the audio can be tagged with it and
	// queued for cleanup under that id.
	const id = createBouquetId();
	let voice: Bouquet['voice'];
	let pinnedFileId = '';

	if (voiceFile) {
		const checked = await validateVoiceFile(voiceFile);
		if (!checked.ok) {
			return json(
				{ message: checked.message, errors: { voice: checked.message } },
				{ status: checked.status }
			);
		}

		try {
			const uploaded = await uploadVoiceNote(voiceFile, id);
			pinnedFileId = uploaded.id;
			// Queue the matching unpin before the bouquet is saved: if this fails we
			// can still remove the file and fail the request cleanly.
			try {
				await enqueueVoiceEntry({
					origin: url.origin,
					bouquetId: id,
					fileId: uploaded.id,
					cid: uploaded.cid
				});
			} catch (scheduleError) {
				console.error('[petalbit] failed to schedule voice expiry', scheduleError);
				try {
					await deletePinataFile(uploaded.id);
				} catch (cleanupError) {
					console.error('[petalbit] failed to unpin unscheduled voice note', cleanupError);
				}
				return json(
					{
						message:
							'Could not schedule the voice note for cleanup. Try again, or send without it.'
					},
					{ status: 503 }
				);
			}

			voice = {
				cid: uploaded.cid,
				url: uploaded.url || voiceUrl(uploaded.cid),
				duration: checked.voice.duration,
				peaks: Array.isArray(parsed.data.voicePeaks) ? parsed.data.voicePeaks : undefined
			};
		} catch (error) {
			console.error('[petalbit] failed to pin voice note', error);
			return json(
				{ message: 'Could not save the voice note. Try again, or send without it.' },
				{ status: 503 }
			);
		}
	}

	const bouquet: Bouquet = {
		id,
		sender: parsed.data.sender,
		recipient: parsed.data.recipient,
		message: parsed.data.message,
		flowers: parsed.data.flowers,
		layers: parsed.data.layers,
		paper: parsed.data.paper,
		background: parsed.data.background,
		voice,
		createdAt: new Date().toISOString()
	};

	try {
		await saveBouquet(bouquet);
	} catch (error) {
		console.error('[petalbit] failed to store bouquet', error);
		// Do not leave audio pinned for a bouquet that was never saved.
		if (pinnedFileId) {
			try {
				await deletePinataFile(pinnedFileId);
			} catch (cleanupError) {
				console.error('[petalbit] failed to unpin orphaned voice note', cleanupError);
			}
		}
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
