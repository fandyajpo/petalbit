import { z } from 'zod';
import { FLOWER_IDS, MAX_BOUQUET_FLOWERS } from '$lib/data/flowers';
import { fieldLimits } from '$lib/types';

export const bouquetInputSchema = z.object({
	sender: z
		.string({ required_error: 'Nama pengirim wajib diisi.' })
		.trim()
		.min(fieldLimits.sender.min, 'Nama pengirim minimal 2 karakter.')
		.max(fieldLimits.sender.max, 'Nama pengirim maksimal 32 karakter.'),
	recipient: z
		.string({ required_error: 'Nama penerima wajib diisi.' })
		.trim()
		.min(fieldLimits.recipient.min, 'Nama penerima minimal 2 karakter.')
		.max(fieldLimits.recipient.max, 'Nama penerima maksimal 32 karakter.'),
	message: z
		.string({ required_error: 'Pesan spesial wajib diisi.' })
		.trim()
		.min(fieldLimits.message.min, 'Tulis pesan setidaknya 3 karakter.')
		.max(fieldLimits.message.max, 'Pesan maksimal 280 karakter.'),
	flowers: z
		.array(z.enum(FLOWER_IDS as [string, ...string[]]), {
			required_error: 'Pilih setidaknya satu bunga.'
		})
		.min(1, 'Pilih setidaknya satu bunga.')
		.max(MAX_BOUQUET_FLOWERS, `Maksimal ${MAX_BOUQUET_FLOWERS} jenis bunga per buket.`)
		.refine((ids) => new Set(ids).size === ids.length, 'Setiap bunga hanya bisa dipilih sekali.')
});

export type BouquetInput = z.infer<typeof bouquetInputSchema>;

export const bouquetIdSchema = z.string().regex(/^[a-z0-9]{8,24}$/, 'ID buket tidak valid.');

/** Flatten Zod issues into `{ field: message }` for the form UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? 'form');
		if (!out[key]) out[key] = issue.message;
	}
	return out;
}

export function validateBouquet(input: {
	sender: string;
	recipient: string;
	message: string;
	flowers: string[];
}) {
	const parsed = bouquetInputSchema.safeParse(input);
	return {
		success: parsed.success as boolean,
		errors: parsed.success ? {} : fieldErrors(parsed.error)
	};
}
