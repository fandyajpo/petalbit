import { z } from 'zod';
import { FLOWER_IDS, MAX_BOUQUET_FLOWERS } from '$lib/data/flowers';
import { BACKGROUND_IDS, DEFAULT_BOUQUET_BACKGROUND } from '$lib/data/backgrounds';
import { DEFAULT_BOUQUET_PAPER, PAPER_IDS } from '$lib/data/papers';
import { fieldLimits } from '$lib/types';

export const bouquetInputSchema = z.object({
	sender: z
		.string({ required_error: 'Your name is required.' })
		.trim()
		.min(fieldLimits.sender.min, 'Name needs at least 2 characters.')
		.max(fieldLimits.sender.max, 'Name can be max 32 characters.'),
	recipient: z
		.string({ required_error: 'Recipient name is required.' })
		.trim()
		.min(fieldLimits.recipient.min, 'Recipient name needs at least 2 characters.')
		.max(fieldLimits.recipient.max, 'Recipient name can be max 32 characters.'),
	message: z
		.string({ required_error: 'A message is required.' })
		.trim()
		.min(fieldLimits.message.min, 'Write at least 3 characters.')
		.max(fieldLimits.message.max, 'Message can be max 280 characters.'),
	flowers: z
		.array(z.enum(FLOWER_IDS as [string, ...string[]]), {
			required_error: 'Pick at least one flower.'
		})
		.min(1, 'Pick at least one flower.')
		.max(MAX_BOUQUET_FLOWERS, `Max ${MAX_BOUQUET_FLOWERS} flowers per bouquet.`)
		.refine((ids) => new Set(ids).size === ids.length, 'Each flower can only be picked once.'),
	paper: z
		.preprocess(
			(value) => (value === '' || value === null || value === undefined ? undefined : value),
			z.enum(PAPER_IDS as [string, ...string[]]).optional()
		)
		.default(DEFAULT_BOUQUET_PAPER),
	background: z
		.preprocess(
			(value) => (value === '' || value === null || value === undefined ? undefined : value),
			z.enum(BACKGROUND_IDS as [string, ...string[]]).optional()
		)
		.default(DEFAULT_BOUQUET_BACKGROUND)
});

export type BouquetInput = z.infer<typeof bouquetInputSchema>;

export const bouquetIdSchema = z.string().regex(/^[a-z0-9]{8,24}$/, 'Invalid bouquet ID.');

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
	paper?: string;
	background?: string;
}) {
	const parsed = bouquetInputSchema.safeParse(input);
	return {
		success: parsed.success as boolean,
		errors: parsed.success ? {} : fieldErrors(parsed.error)
	};
}
