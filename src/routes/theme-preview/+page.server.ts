import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// This route exists only to inspect the palettes while developing.
export const load = () => {
	if (!dev) error(404, 'Not found');
	return {};
};
