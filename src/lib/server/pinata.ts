import { env } from '$env/dynamic/private';

/**
 * Pinata (IPFS) storage for voice notes. The JWT never reaches the browser:
 * the audio arrives on our own API, which forwards it here.
 *
 * Every upload is tagged with `app=petalbit` and its `bouquetId`, which is what
 * lets the cleanup cron find audio whose bouquet has expired or vanished.
 */

const UPLOAD_ENDPOINT = 'https://uploads.pinata.cloud/v3/files';
const API_ENDPOINT = 'https://api.pinata.cloud/v3/files/public';

export class PinataError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'PinataError';
		this.status = status;
	}
}

export type PinataFile = {
	id: string;
	cid: string;
	name?: string;
	keyvalues?: Record<string, string>;
	created_at?: string;
};

export function isPinataConfigured(): boolean {
	return Boolean(env.PINATA_JWT?.trim());
}

/** Public gateway link for a CID. Set PINATA_GATEWAY to a dedicated gateway. */
export function voiceUrl(cid: string): string {
	const gateway = (env.PINATA_GATEWAY ?? '')
		.trim()
		.replace(/^https?:\/\//, '')
		.replace(/\/+$/, '');
	if (gateway) return `https://${gateway}/ipfs/${cid}`;
	return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

function authHeaders(): HeadersInit {
	const jwt = env.PINATA_JWT?.trim();
	if (!jwt) throw new Error('PINATA_JWT is not configured');
	return { Authorization: `Bearer ${jwt}` };
}

export async function uploadVoiceNote(
	file: File,
	bouquetId: string
): Promise<{ id: string; cid: string; url: string }> {
	const headers = authHeaders();

	const body = new FormData();
	body.append('file', file);
	body.append('network', 'public');
	body.append('name', file.name);
	body.append('keyvalues', JSON.stringify({ app: 'petalbit', bouquetId }));

	const response = await fetch(UPLOAD_ENDPOINT, { method: 'POST', headers, body });

	if (!response.ok) {
		const detail = (await response.text().catch(() => '')).slice(0, 300);
		throw new PinataError(
			`Pinata upload failed (${response.status})${detail ? `: ${detail}` : ''}`,
			response.status
		);
	}

	const payload = (await response.json().catch(() => null)) as
		| { data?: { id?: unknown; cid?: unknown } }
		| null;
	const cid = payload?.data?.cid;
	const id = payload?.data?.id;
	if (typeof cid !== 'string' || !cid) throw new Error('Pinata response did not include a cid');
	// Without the file id the expiry webhook could never unpin this upload, so
	// treat it as a failed upload rather than silently leaking storage.
	if (typeof id !== 'string' || !id) throw new Error('Pinata response did not include a file id');

	return { id, cid, url: voiceUrl(cid) };
}

export async function deletePinataFile(id: string): Promise<void> {
	if (!id) throw new Error('Cannot delete a Pinata file without an id');
	const response = await fetch(`${API_ENDPOINT}/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!response.ok && response.status !== 404) {
		const detail = (await response.text().catch(() => '')).slice(0, 300);
		throw new PinataError(
			`Pinata delete failed (${response.status})${detail ? `: ${detail}` : ''}`,
			response.status
		);
	}
}
