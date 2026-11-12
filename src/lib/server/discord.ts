import { env } from '$env/dynamic/private';
import { BOUQUET_TTL_SECONDS, type Bouquet } from '$lib/types';
import { getFlower } from '$lib/data/flowers';

const REQUEST_TIMEOUT_MS = 6_000;
const COLOR_PAPER = 0xf1d3cf;

/**
 * Post a heads-up to the Petalbit Discord channel when a bouquet is created.
 *
 * Implemented as a "wait until" task: the bouquet is already saved when this
 * runs, and the delivery never blocks or fails the API response. The caller is
 * responsible for keeping the function alive (Vercel's waitUntil); otherwise the
 * runtime can freeze it before the request leaves. The endpoint (with its token)
 * stays in a server-only env var.
 */
export async function notifyNewBouquet(bouquet: Bouquet, origin: string): Promise<void> {
	const webhook = env.DISCORD_BOUQUET_WEBHOOK_URL;
	if (!webhook) return;

	try {
		const response = await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload(bouquet, origin)),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});

		if (!response.ok) {
			const detail = await response.text().catch(() => '');
			console.error(
				'[petalbit] discord notification failed',
				response.status,
				detail.slice(0, 200)
			);
			return;
		}

		console.info('[petalbit] discord notification sent');
	} catch (error) {
		console.error(
			'[petalbit] discord notification failed',
			error instanceof Error ? `${error.name}: ${error.message}` : String(error)
		);
	}
}

function payload(bouquet: Bouquet, origin: string) {
	const flowers = bouquet.flowers.flatMap((id) => getFlower(id) ?? []);
	const created = new Date(bouquet.createdAt);
	const expires = new Date(created.getTime() + BOUQUET_TTL_SECONDS * 1000);
	const stamp = (date: Date) => `<t:${Math.floor(date.getTime() / 1000)}:R>`;

	return {
		username: 'Petalbit',
		embeds: [
			{
				title: 'New bouquet made',
				url: `${origin}/b/${bouquet.id}`,
				color: COLOR_PAPER,
				description: truncate(bouquet.message, 320),
				fields: [
					{ name: 'From', value: truncate(bouquet.sender, 80), inline: true },
					{ name: 'To', value: truncate(bouquet.recipient, 80), inline: true },
					{
						name: 'Flowers',
						value: truncate(
							flowers.map((flower) => flower.name).join(', ') || 'None',
							120
						),
						inline: false
					},
					{ name: 'Bouquet', value: `\`${bouquet.id}\``, inline: true },
					{ name: 'Made', value: stamp(created), inline: true },
					{ name: 'Expires', value: stamp(expires), inline: true }
				],
				footer: { text: 'petalbit · 7 day bouquets' },
				timestamp: bouquet.createdAt,
					...(flowers.length > 0
					? {
								thumbnail: { url: `${origin}${flowers[0].image}` }
						}
					: {})
			}
		]
	};
}

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}