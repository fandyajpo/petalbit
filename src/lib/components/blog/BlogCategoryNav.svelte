<script lang="ts">
	import type { BlogCategory } from '$lib/blog/categories';

	type Item = BlogCategory & { count: number };
	type Props = {
		categories: Item[];
		selected: string | null;
		total: number;
	};

	let { categories, selected, total }: Props = $props();
</script>

<nav class="categories" aria-label="Journal categories">
	<a class:active={!selected} href="/blog" aria-current={!selected ? 'page' : undefined}>
		All essays
		<span class="count">{total}</span>
	</a>
	{#each categories as category (category.id)}
		<a
			class:active={selected === category.id}
			href={`/blog?category=${category.id}`}
			aria-current={selected === category.id ? 'page' : undefined}
		>
			{category.title}
			<span class="count">{category.count}</span>
		</a>
	{/each}
</nav>

<style>
	.categories {
		display: flex;
		gap: 0.35rem;
		overflow-x: auto;
		padding-bottom: 0.45rem;
		scrollbar-width: none;
		border-bottom: 1px solid var(--color-rule);
	}

	.categories::-webkit-scrollbar {
		display: none;
	}

	a {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		flex-shrink: 0;
		border: 1px solid transparent;
		border-radius: 999px;
		padding: 0.35rem 0.7rem 0.33rem;
		font-family: var(--font-mono);
		font-size: 0.55rem;
		font-weight: 500;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--color-ink-soft);
		transition:
			background-color 200ms ease,
			border-color 200ms ease,
			color 200ms ease;
	}

	a:hover {
		background: color-mix(in srgb, var(--color-paper) 80%, transparent);
		border-color: var(--color-rule-soft);
		color: var(--color-ink);
	}

	a.active {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-paper);
	}

	.count {
		display: grid;
		place-items: center;
		min-width: 1.05rem;
		height: 1.05rem;
		border-radius: 50%;
		background: color-mix(in srgb, currentColor 11%, transparent);
		font-size: 0.47rem;
		letter-spacing: 0;
	}

	@media (max-width: 620px) {
		.categories {
			margin-inline: -1.15rem;
			padding-inline: 1.15rem;
		}
	}
</style>
