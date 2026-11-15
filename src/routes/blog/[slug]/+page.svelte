<script lang="ts">
	import type { PageData } from './$types';
	import '$lib/blog/article.css';
	import ArticleToc from '$lib/components/blog/ArticleToc.svelte';
	import BlogCard from '$lib/components/blog/BlogCard.svelte';
	import BlogCta from '$lib/components/blog/BlogCta.svelte';
	import BlogShare from '$lib/components/blog/BlogShare.svelte';
	import JsonLd from '$lib/components/blog/JsonLd.svelte';
	import {
		blogPostingSchema,
		breadcrumbSchema,
		canonical
	} from '$lib/blog/seo';

	let { data }: { data: PageData } = $props();

	const post = $derived(data.post);
	const articleUrl = $derived(canonical(`/blog/${post.slug}`));
	const showToc = $derived(post.toc.length >= 3);
</script>

<svelte:head>
	<title>{post.seoTitle} · Petalbit Journal</title>
	<meta name="description" content={post.seoDescription} />
	<link rel="canonical" href={articleUrl} />
	<meta name="robots" content="index, follow, max-image-preview:large" />
	<meta name="author" content={post.author} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="Petalbit" />
	<meta property="og:title" content={post.title} />
	<meta property="og:description" content={post.seoDescription} />
	<meta property="og:url" content={articleUrl} />
	<meta property="og:image" content={canonical(post.socialImage)} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={post.coverImageAlt} />
	<meta property="article:published_time" content={post.publishedAt} />
	<meta property="article:section" content={post.category.title} />
	<meta property="article:author" content={post.author} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={post.title} />
	<meta name="twitter:description" content={post.seoDescription} />
	<meta name="twitter:image" content={canonical(post.socialImage)} />
	<meta name="twitter:image:alt" content={post.coverImageAlt} />
	<link
		rel="alternate"
		type="application/rss+xml"
		title="The Petalbit Journal"
		href={canonical('/blog/rss.xml')}
	/>
</svelte:head>

<JsonLd data={blogPostingSchema(post)} />
<JsonLd
	data={breadcrumbSchema([
		{ name: 'Home', path: '/' },
		{ name: 'Journal', path: '/blog' },
		{ name: post.title, path: `/blog/${post.slug}` }
	])}
/>

<div class="article-page">
	<div class="shell">
		<nav class="breadcrumbs" aria-label="Breadcrumb">
			<a href="/">Home</a>
			<span aria-hidden="true">/</span>
			<a href="/blog">Journal</a>
			<span aria-hidden="true">/</span>
			<span aria-current="page">{post.title}</span>
		</nav>

		<header class="article-head">
			<a class="eyebrow article-category" href={`/blog?category=${post.category.id}`}>
				{post.category.title}
			</a>
			<h1>{post.title}</h1>
			<p class="dek">{post.description}</p>
			<p class="article-meta mono">
				<time datetime={post.publishedAt}>{post.displayDate}</time>
				<span aria-hidden="true">·</span>
				<span>{post.readingTime} min read</span>
				<span aria-hidden="true">·</span>
				<span>{post.author}</span>
			</p>
			<div class="head-share">
				<BlogShare url={articleUrl} title={post.title} />
			</div>
		</header>

		<figure class="hero-figure">
			<img
				src={post.coverImage}
				srcset={post.coverSrcset}
				sizes="(min-width: 1120px) 1040px, 92vw"
				alt={post.coverImageAlt}
				width="1200"
				height="630"
				loading="eager"
				fetchpriority="high"
				decoding="async"
			/>
			<figcaption>
				<span>{post.category.title}</span>
				<span>Petalbit Journal · Issue 01</span>
			</figcaption>
		</figure>

		<div class="article-layout">
			{#if showToc}
				<aside class="toc-desktop" aria-label="Table of contents">
					<nav class="toc">
						<p class="toc-title mono">In this essay</p>
						<ArticleToc items={post.toc} />
					</nav>
				</aside>
			{/if}

			<div class="article-column">
				{#if showToc}
					<details class="toc-mobile">
						<summary>Contents · {post.readingTime} min read</summary>
						<ArticleToc items={post.toc} />
					</details>
				{/if}

				<article class="prose">
					{@html post.html}
				</article>

				<footer class="article-foot">
					<div>
						<a class="category" href={`/blog?category=${post.category.id}`}>
							More in {post.category.title}
						</a>
						<br />
						<a class="back" href="/blog">← Back to the journal</a>
					</div>
					<BlogShare url={articleUrl} title={post.title} />
				</footer>
			</div>
		</div>
	</div>

	{#if data.related.length}
		<section class="related shell" aria-labelledby="related-title">
			<div class="related-head">
				<div>
					<p class="eyebrow">Keep reading</p>
					<h2 id="related-title">More from the journal</h2>
				</div>
				<a class="link-arrow" href="/blog">All essays</a>
			</div>
			<div class="related-grid">
				{#each data.related as related (related.slug)}
					<BlogCard post={related} />
				{/each}
			</div>
		</section>
	{/if}

	<div class="article-cta shell">
		<BlogCta
			eyebrow="Make the gesture"
			title="Send a little bouquet of your own."
			text="Build a pixel bouquet, add the note you have been carrying around, and share it with one link. It stays for seven days, then disappears quietly."
		/>
	</div>
</div>
