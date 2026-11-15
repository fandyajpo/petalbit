<script lang="ts">
	import { serializeJsonLd } from '$lib/blog/seo';

	let { data }: { data: unknown } = $props();
	const json = $derived(serializeJsonLd(data));
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${json}</script>`}
</svelte:head>
