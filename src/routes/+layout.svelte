<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	let { children } = $props();

	const isBouquetPage = $derived(page.url.pathname.startsWith('/b/'));
</script>

{#if !isBouquetPage}
	<SiteHeader />
{/if}
<main id="top">
	{@render children()}
</main>
{#if !isBouquetPage}
	<SiteFooter />
{/if}
