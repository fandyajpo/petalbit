<script lang="ts">
	import type { TableOfContentsItem } from '$lib/blog/types';

	let { items }: { items: TableOfContentsItem[] } = $props();
</script>

<ul>
	{#each items as item (item.id)}
		<li class:depth-3={item.depth === 3}>
			<a href={`#${item.id}`}>{item.text}</a>
		</li>
	{/each}
</ul>
