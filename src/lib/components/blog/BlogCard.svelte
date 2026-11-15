<script lang="ts">
	import type { BlogSummary } from '$lib/blog/types';

	type Props = {
		post: BlogSummary;
		eager?: boolean;
	};

	let { post, eager = false }: Props = $props();
</script>

<article class="card">
	<a class="media" href={`/blog/${post.slug}`} tabindex="-1" aria-hidden="true">
								<img
				src={post.cardImage}
				srcset={post.coverSrcset}
				sizes="(min-width: 980px) 345px, (min-width: 700px) 45vw, 92vw"
				alt={post.coverImageAlt}
				width="600"
				height="315"
				loading={eager ? 'eager' : 'lazy'}
				fetchpriority={eager ? 'high' : 'auto'}
				decoding="async"
			/>
	</a>

	<div class="copy">
		<a class="category mono" href={`/blog?category=${post.category.id}`}>{post.category.title}</a>
		<h3><a href={`/blog/${post.slug}`}>{post.title}</a></h3>
		<p class="excerpt">{post.description}</p>
		<p class="meta mono">
			<time datetime={post.publishedAt}>{post.displayDate}</time>
			<span aria-hidden="true">·</span>
			<span>{post.readingTime} min read</span>
		</p>
	</div>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-width: 0;
		border-top: 1px solid var(--color-rule);
		padding-top: 0.85rem;
	}

	.media {
		position: relative;
		display: block;
		aspect-ratio: 1200 / 630;
		overflow: hidden;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: var(--color-paper-warm);
	}

	.media::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(
			color-mix(in srgb, var(--color-ink) 9%, transparent) 0.7px,
			transparent 0.8px
		);
		background-size: 3px 3px;
		opacity: 0.28;
		pointer-events: none;
	}

	.media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition:
			transform 700ms var(--ease-out),
			filter 500ms ease;
	}

	.card:hover .media img {
		transform: scale(1.025);
		filter: saturate(1.04);
	}

	.copy {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding-top: 0.9rem;
	}

	.category {
		align-self: flex-start;
		color: var(--color-rose-deep);
		text-decoration: none;
		font-size: 0.54rem;
		line-height: 1.4;
	}

	.category:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	h3 {
		margin-top: 0.45rem;
		font-size: clamp(1.25rem, 2.2vw, 1.52rem);
		line-height: 1.05;
		letter-spacing: -0.035em;
	}

	h3 a {
		color: var(--color-ink);
		text-decoration: none;
	}

	h3 a:hover {
		color: var(--color-rose-deep);
	}

	.excerpt {
		margin-top: 0.55rem;
		font-size: 0.83rem;
		line-height: 1.62;
		color: var(--color-ink-soft);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: auto;
		padding-top: 0.9rem;
		font-size: 0.5rem;
		letter-spacing: 0.09em;
		color: var(--color-ink-faint);
	}
</style>
