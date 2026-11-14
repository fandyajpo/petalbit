import { getContext, setContext } from 'svelte';
import type { TimeTheme } from './time-theme';

export type TimeThemeContext = {
	readonly current: TimeTheme | null;
	readonly timezone: string;
};

const KEY = Symbol('petalbit:time-theme');

export function provideTimeTheme(context: TimeThemeContext): void {
	setContext(KEY, context);
}

/** Read the active local-time theme from any descendant component. */
export function useTimeTheme(): TimeThemeContext {
	return (
		getContext<TimeThemeContext>(KEY) ?? {
			current: null,
			timezone: 'local'
		}
	);
}
