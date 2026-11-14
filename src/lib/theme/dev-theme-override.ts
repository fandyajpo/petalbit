import { dev } from '$app/environment';
import {
	THEME_OVERRIDE_EVENT,
	THEME_OVERRIDE_KEY,
	timeThemeConfig,
	type TimeTheme,
	type TimeThemeId
} from './time-theme';

export { THEME_OVERRIDE_EVENT, THEME_OVERRIDE_KEY };

/** Only development builds may pin a phase. */
export function readThemeOverride(): TimeTheme | null {
	if (!dev || typeof window === 'undefined') return null;
	try {
		const id = localStorage.getItem(THEME_OVERRIDE_KEY);
		return timeThemeConfig.find((theme) => theme.id === id) ?? null;
	} catch {
		return null;
	}
}

export function writeThemeOverride(id: TimeThemeId | null): void {
	if (!dev || typeof window === 'undefined') return;
	try {
		if (id) localStorage.setItem(THEME_OVERRIDE_KEY, id);
		else localStorage.removeItem(THEME_OVERRIDE_KEY);
	} catch {
		// Private mode or blocked storage: the in-page event still works.
	}
	window.dispatchEvent(new CustomEvent(THEME_OVERRIDE_EVENT, { detail: id }));
}

/** Other tabs receive the shared pin through a storage event. */
export function isThemeOverrideStorageEvent(event: StorageEvent): boolean {
	return event.key === THEME_OVERRIDE_KEY || event.key === null;
}
