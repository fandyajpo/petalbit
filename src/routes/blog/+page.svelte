<script lang="ts">
	import type { PageData } from './$types';
	import '$lib/blog/journal.css';
	import BlogCard from '$lib/components/blog/BlogCard.svelte';
	import BlogCategoryNav from '$lib/components/blog/BlogCategoryNav.svelte';
	import JsonLd from '$lib/components/blog/JsonLd.svelte';
	import { blogSchema, breadcrumbSchema, canonical, DEFAULT_OG_IMAGE } from '$lib/blog/seo';
	import { JOURNAL_DESCRIPTION, JOURNAL_NAME } from '$lib/blog/site';

	let { data }: { data: PageData } = $props();

	const selected = $derived(data.selectedCategory);
	const featured = $derived(data.featured);
	const gridPosts = $derived(
		featured ? data.posts.filter((post) => post.slug !== featured.slug) : data.posts
	);
	const metaTitle = $derived(
		selected
			? `${selected.title} essays · ${JOURNAL_NAME}`
			: `${JOURNAL_NAME} · Flowers, feelings and digital gifts`
	);
	const metaDescription = $derived(selected ? selected.description : JOURNAL_DESCRIPTION);
	const ogImage = $derived(featured?.socialImage ?? DEFAULT_OG_IMAGE);
</script>

<svelte:head>
	<title>{metaTitle}</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href={canonical('/blog')} />
	<meta name="robots" content="index, follow" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Petalbit" />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonical('/blog')} />
	<meta property="og:image" content={canonical(ogImage)} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Petalbit Journal editorial flower artwork" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={metaTitle} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:image" content={canonical(ogImage)} />
	<link
		rel="alternate"
		type="application/rss+xml"
		title="The Petalbit Journal"
		href={canonical('/blog/rss.xml')}
	/>
</svelte:head>

<JsonLd data={blogSchema(data.posts)} />
<JsonLd
	data={breadcrumbSchema([
		{ name: 'Home', path: '/' },
		{ name: 'Journal', path: '/blog' }
	])}
/>

<div class="journal">
	<section class="journal-hero">
		<div class="shell hero-grid">
			<div class="hero-copy">
				<p class="eyebrow">The Petalbit journal · Issue 01</p>
				<h1>A Little Journal of <em>Feelings &amp; Flowers</em></h1>
				<p class="lede">
					Notes on what flowers have meant, the small ways people say the tender thing, and why a
					gesture can matter even when it does not last forever.
				</p>
				<div class="hero-meta mono">
					<span>{data.totalPosts} essays</span>
					<span aria-hidden="true">/</span>
					<span>4 chapters</span>
					<span aria-hidden="true">/</span>
					<span>Read slowly</span>
					<span aria-hidden="true">/</span>
					<a href="/blog/rss.xml">RSS feed ↗</a>
				</div>
			</div>

			<div class="hero-art" aria-hidden="true">
				<div class="specimen">
					<span class="specimen-label mono">Field note · 01</span>
					<img class="f1" src="/art/flowers/iris.png" alt="" width="450" height="696" />
					<img class="f2" src="/art/flowers/mawar.png" alt="" width="450" height="696" />
					<img class="f3" src="/art/flowers/daisy.png" alt="" width="450" height="696" />
					<span class="specimen-note">pressed pixels,<br />kept feelings</span>
				</div>
			</div>
		</div>
	</section>

	{#if featured}
		<section class="featured-wrap" aria-labelledby="featured-title">
			<div class="shell">
				<div class="featured">
					<a class="featured-media" href={`/blog/${featured.slug}`} tabindex="-1" aria-hidden="true">
						<img
							src={featured.coverImage}
							srcset={featured.coverSrcset}
							sizes="(min-width: 820px) 56vw, 92vw"
							alt={featured.coverImageAlt}
							width="1200"
							height="630"
							loading="eager"
							fetchpriority="high"
							decoding="async"
						/>
						<span class="media-stamp mono">Featured essay</span>
					</a>

					<div class="featured-copy">
						<p class="eyebrow">Start here</p>
						<a class="featured-category mono" href={`/blog?category=${featured.category.id}`}>
							{featured.category.title}
						</a>
						<h2 id="featured-title"><a href={`/blog/${featured.slug}`}>{featured.title}</a></h2>
						<p class="featured-excerpt">{featured.description}</p>
						<p class="meta mono">
							<time datetime={featured.publishedAt}>{featured.displayDate}</time>
							<span aria-hidden="true">·</span>
							<span>{featured.readingTime} min read</span>
						</p>
						<a class="link-arrow" href={`/blog/${featured.slug}`}>
							Read the essay
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" />
							</svg>
						</a>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<section class="index">
		<div class="shell">
			<BlogCategoryNav
				categories={data.categories}
				selected={selected?.id ?? null}
				total={data.totalPosts}
			/>

			<header class="index-head">
				<div>
					<p class="eyebrow">{selected ? 'Chapter' : 'The collection'}</p>
					<h2>{selected ? selected.title : 'Fresh from the journal'}</h2>
				</div>
				<p class="index-sub">
					{selected
						? selected.description
						: 'Eight essays on flowers, feeling, and the strange little life of digital things.'}
				</p>
			</header>

			{#if gridPosts.length}
				<div class="post-grid">
					{#each gridPosts as post, i (post.slug)}
						<BlogCard {post} eager={!featured && i === 0} />
					{/each}
				</div>
			{:else}
				<p class="empty">No essays in this chapter yet. The garden is still waking up.</p>
			{/if}
		</div>
	</section>

	<section class="editorial-wrap">
		<div class="shell">
			<div class="editorial">
				<div class="editorial-copy">
					<p class="eyebrow">From the editor</p>
					<blockquote>“Some things don’t need to last forever to mean something.”</blockquote>
					<p>
						Petalbit began with a small question: what if a bouquet could arrive without a
						delivery address, a vase, or a week of watching petals drop? The answer became a
						place to build pixel flowers and send a note with one link. This journal follows the
						same idea outward — into flower lore, longing, memory, and the tiny choices that make
						a gift feel personal.
					</p>
				</div>
				<div class="editorial-side">
					<p class="mono side-label">A note on the journal</p>
					<p>
						No feeds to keep up with. No hot takes. Just a few carefully made essays, filed under
						the things people send flowers to say.
					</p>
					<a class="btn btn-primary" href="/create">Make a bouquet</a>
					<a class="link-arrow" href="/tutorial">How Petalbit works</a>
				</div>
				<img
					class="editorial-flower"
					src="/art/flowers/peony.png"
					alt=""
					width="450"
					height="696"
					aria-hidden="true"
				/>
			</div>
		</div>
	</section>
</div>
