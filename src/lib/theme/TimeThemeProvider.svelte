<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getCurrentTimeTheme,
		getNextThemeStart,
		getTimezone,
		type TimeTheme
	} from './time-theme';
	import { provideTimeTheme } from './time-theme-context';
	import {
		isThemeOverrideStorageEvent,
		readThemeOverride,
		THEME_OVERRIDE_EVENT
	} from './dev-theme-override';

	let { children } = $props();
	let current = $state<TimeTheme | null>(null);
	let timezone = $state('local');

	provideTimeTheme({
		get current() {
			return current;
		},
		get timezone() {
			return timezone;
		}
	});

	let boundaryTimer: ReturnType<typeof setTimeout> | undefined;
	let zoneTimer: ReturnType<typeof setInterval> | undefined;
	let transitionTimer: ReturnType<typeof setTimeout> | undefined;

	function applyTheme(theme: TimeTheme, zone: string) {
		const root = document.documentElement;
		const changed = root.dataset.timeTheme !== theme.id;

		if (changed && root.dataset.timeThemeReady === 'true') {
			root.classList.add('theme-transition');
			if (transitionTimer) clearTimeout(transitionTimer);
			transitionTimer = setTimeout(() => {
				root.classList.remove('theme-transition');
			}, 1_100);
		}

		root.dataset.timeTheme = theme.id;
		root.dataset.timeScheme = theme.scheme;
		root.style.colorScheme = theme.scheme;

		const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
		meta?.setAttribute('content', theme.themeColor);

		current = theme;
		timezone = zone;
		if (changed) root.dataset.timeThemeChanged = String(Date.now());
	}

	function sync() {
		// A developer pin wins over the clock, but only in a dev build.
		const theme = readThemeOverride() ?? getCurrentTimeTheme();
		const zone = getTimezone();
		if (theme.id !== current?.id || zone !== timezone) applyTheme(theme, zone);
	}

	function scheduleBoundary() {
		if (boundaryTimer) clearTimeout(boundaryTimer);
		const now = new Date();
		const delay = Math.max(1_000, getNextThemeStart(now).getTime() - now.getTime() + 250);
		boundaryTimer = setTimeout(() => {
			sync();
			scheduleBoundary();
		}, delay);
	}

	function onVisibility() {
		if (document.visibilityState !== 'visible') return;
		// Returning from a suspended tab can skip several phase boundaries.
		sync();
		scheduleBoundary();
	}

	function onFocus() {
		sync();
		scheduleBoundary();
	}

	function onOverride() {
		sync();
		scheduleBoundary();
	}

	function onStorage(event: StorageEvent) {
		if (!isThemeOverrideStorageEvent(event)) return;
		sync();
		scheduleBoundary();
	}

	onMount(() => {
		// The pre-paint inline script already picked the right palette; hydrate
		// state from that same local clock (or dev pin) and only touch the DOM
		// when it differs.
		sync();
		scheduleBoundary();

		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('focus', onFocus);
		window.addEventListener(THEME_OVERRIDE_EVENT, onOverride);
		window.addEventListener('storage', onStorage);

		// Timezone changes do not have a reliable event across browsers. A
		// once-a-minute comparison is cheap and only writes when it changes.
		zoneTimer = setInterval(() => {
			const zone = getTimezone();
			if (zone !== timezone) {
				sync();
				scheduleBoundary();
			}
		}, 60_000);

		return () => {
			if (boundaryTimer) clearTimeout(boundaryTimer);
			if (zoneTimer) clearInterval(zoneTimer);
			if (transitionTimer) clearTimeout(transitionTimer);
			document.documentElement.classList.remove('theme-transition');
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('focus', onFocus);
			window.removeEventListener(THEME_OVERRIDE_EVENT, onOverride);
			window.removeEventListener('storage', onStorage);
		};
	});
</script>

{@render children()}
