export const THEME_OVERRIDE_KEY = 'petalbit:theme-override';
export const THEME_OVERRIDE_EVENT = 'petalbit:theme-override';

export type TimeThemeId =
	| 'midnight'
	| 'dawn'
	| 'morning'
	| 'late-morning'
	| 'midday'
	| 'afternoon'
	| 'golden'
	| 'sunset'
	| 'evening'
	| 'night';

export type TimeTheme = {
	id: TimeThemeId;
	label: string;
	/** Local minutes from midnight when this phase begins. */
	start: number;
	scheme: 'light' | 'dark';
	themeColor: string;
};

/**
 * The single source of truth for the daily theme schedule. CSS palettes live in
 * `time-themes.css` under the matching `data-time-theme` ids.
 */
export const timeThemeConfig: readonly TimeTheme[] = [
	{ id: 'midnight', label: 'Midnight', start: 0, scheme: 'dark', themeColor: '#0c1020' },
	{ id: 'dawn', label: 'Early dawn', start: 5 * 60, scheme: 'dark', themeColor: '#1c2038' },
	{ id: 'morning', label: 'Morning', start: 7 * 60, scheme: 'light', themeColor: '#f1e8da' },
	{
		id: 'late-morning',
		label: 'Late morning',
		start: 10 * 60,
		scheme: 'light',
		themeColor: '#f3f0e8'
	},
	{ id: 'midday', label: 'Midday', start: 11 * 60 + 30, scheme: 'light', themeColor: '#f7f1e3' },
	{
		id: 'afternoon',
		label: 'Afternoon',
		start: 13 * 60 + 30,
		scheme: 'light',
		themeColor: '#f2e7d6'
	},
	{
		id: 'golden',
		label: 'Golden afternoon',
		start: 15 * 60 + 30,
		scheme: 'light',
		themeColor: '#f2e1c8'
	},
	{ id: 'sunset', label: 'Sunset', start: 17 * 60 + 30, scheme: 'dark', themeColor: '#35203c' },
	{ id: 'evening', label: 'Evening', start: 18 * 60 + 30, scheme: 'dark', themeColor: '#161a2e' },
	{ id: 'night', label: 'Night', start: 21 * 60, scheme: 'dark', themeColor: '#0a0f1e' }
] as const;

export function minutesOfDay(date: Date): number {
	return date.getHours() * 60 + date.getMinutes();
}

/** The active phase for a given local Date. */
export function getTimeThemeForDate(date: Date = new Date()): TimeTheme {
	const minutes = minutesOfDay(date);
	let active = timeThemeConfig[0];
	for (const theme of timeThemeConfig) {
		if (minutes >= theme.start) active = theme;
	}
	return active;
}

/** Alias that reads the device clock and timezone through `Date`. */
export function getCurrentTimeTheme(): TimeTheme {
	return getTimeThemeForDate(new Date());
}

/** The exact local moment the next phase begins. */
export function getNextThemeStart(date: Date = new Date()): Date {
	const minutes = minutesOfDay(date);
	const next = timeThemeConfig.find((theme) => theme.start > minutes);
	const target = new Date(date);
	target.setSeconds(0, 0);
	target.setHours(0, next ? next.start : 0, 0, 0);
	if (!next || target.getTime() <= date.getTime()) {
		target.setDate(target.getDate() + 1);
	}
	return target;
}

export function getTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
	} catch {
		return 'local';
	}
}

/**
 * Runs inline before first paint. It only decides which already-authored CSS
 * palette to apply, so no server timezone ever reaches the page. Development
 * builds may also honor a pinned phase from localStorage.
 */
export function themeInitScript(allowOverride = false): string {
	const schedule = timeThemeConfig.map((theme) => [theme.start, theme.id, theme.scheme]);
	const pinned = allowOverride ? `localStorage.getItem('${THEME_OVERRIDE_KEY}')` : 'null';
	return `(function(){try{var s=${JSON.stringify(schedule)};var o=${pinned};var t=null;if(o){for(var j=0;j<s.length;j++){if(s[j][1]===o){t=s[j];break;}}}if(!t){var d=new Date();var m=d.getHours()*60+d.getMinutes();t=s[0];for(var i=0;i<s.length;i++){if(m>=s[i][0])t=s[i];}}var r=document.documentElement;r.dataset.timeTheme=t[1];r.dataset.timeScheme=t[2];r.dataset.timeThemeReady='true';}catch(e){}})();`;
}
