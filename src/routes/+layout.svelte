<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import RoundLines from '$lib/components/RoundLines.svelte';
	import PixelButterfly from '$lib/components/PixelButterfly.svelte';
	import IntroLoader from '$lib/components/IntroLoader.svelte';
	import PetalFX from '$lib/components/PetalFX.svelte';

	let { children } = $props();

	const isBouquetPage = $derived(page.url.pathname.startsWith('/b/'));

	type ViewTransitionDocument = Document & {
		startViewTransition?: (callback: () => Promise<void> | void) => { finished: Promise<void> };
	};

	type Direction = 'forward' | 'back';
	const FALLBACK_SHIFT = 44;

	let direction: Direction = 'forward';
	let hasNavigated = false;

	function canViewTransition(): boolean {
		return typeof document !== 'undefined' && 'startViewTransition' in document;
	}

	function prefersReducedMotion(): boolean {
		return (
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		);
	}

	function shiftFor(dir: Direction): string {
		return `translateX(${dir === 'back' ? FALLBACK_SHIFT : -FALLBACK_SHIFT}px)`;
	}

	onNavigate((navigation) => {
		if (!navigation.to) return;
		// In-page anchors and query tweaks keep the current page in place.
		if (navigation.from?.url.pathname === navigation.to.url.pathname) return;
		hasNavigated = true;
		direction = navigation.type === 'popstate' ? 'back' : 'forward';

		if (!canViewTransition() || prefersReducedMotion()) return;

		const doc = document as ViewTransitionDocument;
		document.documentElement.dataset.nav = direction;

		return new Promise<void>((resolve) => {
			doc.startViewTransition?.(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Browsers without the View Transitions API still get a gentle slide-in.
	afterNavigate((navigation) => {
		if (!hasNavigated) return;
		if (canViewTransition() || prefersReducedMotion()) return;

		const main = document.getElementById('top');
		main?.animate(
			[
				{ opacity: 0, transform: shiftFor(direction) },
				{ opacity: 1, transform: 'none' }
			],
			{ duration: 340, easing: 'cubic-bezier(0.19, 1, 0.22, 1)' }
		);
	});
</script>

<IntroLoader />
<PetalFX />

{#if !isBouquetPage}
	<RoundLines />
	<PixelButterfly />
	<SiteHeader />
{/if}
<main id="top">
	{@render children()}
</main>
{#if !isBouquetPage}
	<SiteFooter />
{/if}
