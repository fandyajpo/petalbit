<script lang="ts">
	type Props = {
		eyebrow?: string;
		title?: string;
		text?: string;
	};

	let {
		eyebrow = 'A small gesture, sent',
		title = 'Some feelings arrive better as flowers.',
		text = 'Pick up to seven pixel blooms, write the note you keep almost saying, and send it with one link. Free, no account, and it stays for seven days.'
	}: Props = $props();
</script>

<aside class="cta">
	<div class="cta-copy">
		<p class="eyebrow">{eyebrow}</p>
		<h2>{title}</h2>
		<p class="text">{text}</p>
		<div class="actions">
			<a class="btn btn-primary" href="/create">
				Make a bouquet
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="1.7" />
				</svg>
			</a>
			<a class="link-arrow" href="/tutorial">See how it works</a>
		</div>
	</div>

	<div class="cta-art" aria-hidden="true">
		<img src="/art/flowers/mawar.png" alt="" width="450" height="696" />
		<img src="/art/flowers/peony.png" alt="" width="450" height="696" />
		<img src="/art/flowers/daisy.png" alt="" width="450" height="696" />
	</div>
</aside>

<style>
	.cta {
		position: relative;
		display: grid;
		gap: 1rem;
		overflow: hidden;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background:
			radial-gradient(
				ellipse at 88% 10%,
				color-mix(in srgb, var(--color-blush) 58%, transparent),
				transparent 55%
			),
			var(--color-paper-warm);
		padding: clamp(1.35rem, 3.5vw, 2.4rem);
	}

	.cta::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(
			color-mix(in srgb, var(--color-ink) 8%, transparent) 0.7px,
			transparent 0.8px
		);
		background-size: 3px 3px;
		opacity: 0.3;
		pointer-events: none;
	}

	.cta-copy {
		position: relative;
		z-index: 2;
	}

	h2 {
		margin-top: 0.65rem;
		max-width: 17ch;
		font-size: clamp(1.8rem, 4vw, 2.7rem);
		line-height: 0.98;
	}

	.text {
		margin-top: 0.8rem;
		max-width: 48ch;
		font-size: 0.86rem;
		line-height: 1.68;
		color: var(--color-ink-soft);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.85rem 1.2rem;
		margin-top: 1.25rem;
	}

	.cta-art {
		position: relative;
		display: none;
		min-height: 180px;
	}

	.cta-art img {
		position: absolute;
		bottom: -18%;
		width: 38%;
		height: auto;
		transform-origin: bottom center;
	}

	.cta-art img:nth-child(1) {
		left: 2%;
		transform: rotate(-8deg);
	}

	.cta-art img:nth-child(2) {
		left: 31%;
		bottom: -8%;
		transform: rotate(2deg);
	}

	.cta-art img:nth-child(3) {
		left: 59%;
		transform: rotate(10deg);
	}

	svg {
		flex-shrink: 0;
	}

	@media (min-width: 780px) {
		.cta {
			grid-template-columns: minmax(0, 1fr) 270px;
			align-items: center;
			padding: clamp(1.8rem, 4vw, 2.8rem);
		}

		.cta-art {
			display: block;
			min-height: 220px;
		}
	}
</style>
