import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { themeInitScript } from '$lib/theme/time-theme';

// Generated from the same schedule the client uses, so ranges live in one file.
// The dev pin is deliberately excluded from production HTML.
const THEME_INIT = `<script>${themeInitScript(dev)}</script>`;

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%petalbit.theme%', THEME_INIT)
	});
};
