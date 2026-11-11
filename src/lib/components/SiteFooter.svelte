<script lang="ts">
	import Brand from './Brand.svelte';

	const year = new Date().getFullYear();
</script>

<footer class="site-footer">
	<div class="shell inner">
		<div class="brand-col">
			<Brand inverted showTagline />
			<p class="desc">
				Free pixel bouquet maker. Pick the blooms, drop the feels, send it with one link. No
				account, no cost, all vibes.
			</p>
			<a class="top-link mono" href="#top">Back to top ↑</a>
		</div>

		<nav class="links" aria-label="Footer navigation">
			<h2 class="mono col-title">Explore</h2>
			<a href="/create">Make a bouquet</a>
			<a href="/#cara-kerja">How it works</a>
			<a href="/#bunga">Flower lineup</a>
			<a href="/#dukung">Support Petalbit</a>
		</nav>

		<div class="links">
			<h2 class="mono col-title">About</h2>
			<a
				class="support-link"
				href="https://saweria.co/fandy11"
				target="_blank"
				rel="noopener noreferrer"
			>
				<img src="/brand/saweria.png" alt="" width="15" height="15" loading="lazy" />
				Saweria
				<span class="sr-only">(opens in a new tab)</span>
			</a>
			<a
				class="support-link"
				href="https://sociabuzz.com/fandybuzz/tribe"
				target="_blank"
				rel="noopener noreferrer"
			>
				<img src="/brand/sociabuzz.png" alt="" width="15" height="15" loading="lazy" />
				Sociabuzz
				<span class="sr-only">(opens in a new tab)</span>
			</a>
			<p class="note">
				Every bouquet is temporary: the link and message ghost after 7 days.
			</p>
		</div>
	</div>

	<div class="shell wordmark-wrap" aria-hidden="true">
		<span class="wordmark">Petalbit</span>
	</div>

	<div class="shell base">
		<p class="mono">© {year} Petalbit · Made with pixels and petals</p>
		<p class="mono foot-tag">Little pixels, lovely flowers.</p>
	</div>
</footer>

<style>
	.site-footer {
		position: relative;
		margin-top: clamp(4rem, 8vw, 6rem);
		background: var(--color-ink);
		color: var(--color-paper);
		overflow: hidden;
	}

	.inner {
		position: relative;
		z-index: 2;
		padding-block: clamp(2.6rem, 5vw, 3.6rem) 1.6rem;
		display: grid;
		gap: 2rem;
	}

	.desc {
		margin-top: 1rem;
		max-width: 32ch;
		font-size: 0.85rem;
		line-height: 1.75;
		color: rgb(251 246 236 / 0.62);
	}

	.top-link {
		display: inline-block;
		margin-top: 1.2rem;
		color: var(--color-rose-light);
		text-decoration: none;
		border-bottom: 1px solid rgb(223 154 166 / 0.35);
		padding-bottom: 0.15rem;
	}

	.top-link:hover {
		color: var(--color-paper);
		border-bottom-color: var(--color-paper);
	}

	.col-title {
		color: rgb(251 246 236 / 0.42);
		margin-bottom: 0.9rem;
	}

	.links {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.56rem;
	}

	.links a {
		color: rgb(251 246 236 / 0.84);
		text-decoration: none;
		font-size: 0.88rem;
		position: relative;
	}

	.support-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.support-link img {
		display: block;
		width: 15px;
		height: 15px;
		border-radius: 3px;
		opacity: 0.9;
	}

	.support-link:hover img {
		opacity: 1;
	}

	.links a::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -2px;
		height: 1px;
		background: var(--color-rose-light);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 360ms var(--ease-out);
	}

	.links a:hover::after {
		transform: scaleX(1);
	}

	.note {
		max-width: 28ch;
		font-size: 0.76rem;
		line-height: 1.7;
		color: rgb(251 246 236 / 0.4);
	}

	.wordmark-wrap {
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: center;
		overflow: hidden;
		padding-block: 0.2rem 0.4rem;
	}

	.wordmark {
		font-family: var(--font-display);
		font-weight: 500;
		font-size: clamp(4rem, 13vw, 11rem);
		line-height: 0.82;
		letter-spacing: -0.055em;
		color: transparent;
		-webkit-text-stroke: 1px rgb(251 246 236 / 0.24);
		user-select: none;
		white-space: nowrap;
	}

	.base {
		position: relative;
		z-index: 2;
		padding-block: 1.1rem 1.6rem;
		border-top: 1px solid rgb(251 246 236 / 0.1);
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.4rem;
		justify-content: space-between;
		color: rgb(251 246 236 / 0.38);
		font-size: 0.58rem;
	}

	.foot-tag {
		font-family: var(--font-display);
		font-style: italic;
		text-transform: none;
		letter-spacing: 0;
		font-size: 0.72rem;
		color: rgb(251 246 236 / 0.5);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	@media (min-width: 760px) {
		.inner {
			grid-template-columns: 1.6fr 0.8fr 0.9fr;
			gap: 2.6rem;
		}
	}
</style>
