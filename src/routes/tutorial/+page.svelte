<script lang="ts">
	import { onMount } from 'svelte';
	import Bouquet from '$lib/components/Bouquet.svelte';
	import StepPreview from '$lib/components/StepPreview.svelte';

	const steps = [
		{
			n: '01',
			meta: 'Pick',
			title: 'Pick your flowers',
			text: 'Open the studio and tap any bloom to add it. In a rush? Tap a quick pick and a whole bouquet lands in one go.',
			tips: [
				'Tap the same flower tile again to add another stem (up to 7 total).',
				'Tap the − on a selected tile to take one stem back out.',
				'Choose a soft wrap colour and background mood if you want, or keep the defaults.'
			]
		},
		{
			n: '02',
			meta: 'Write',
			title: 'Write your note',
			text: 'Add who it is from, who it is for, and the message they will read when they open the link. There is a live preview the whole time.',
			tips: [
				'From and To accept 2–32 characters each.',
				'Messages can be 3–500 characters — long enough to say the real thing.',
				'Use Auto · Front · Back on a stem to control which flower sits in front.'
			]
		},
		{
			n: '03',
			meta: 'Send',
			title: 'Review it, then send',
			text: 'Check the flowers, wrap, mood, names and note. Tap Edit on any row to fix something, then hit “Make my bouquet”.',
			tips: [
				'You get one private link — copy it and drop it in a chat, DM or email.',
				'Anyone with the link can open the bouquet. No account needed to view it.',
				'The bouquet and note disappear automatically after 7 days.'
			]
		}
	];

	let activeStep = $state(-1);
	let revealed = $state<boolean[]>([false, false, false]);

	onMount(() => {
		const items = [...document.querySelectorAll<HTMLElement>('[data-guide-step]')];
		if (!items.length) return;

		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) revealed = items.map(() => true);

		const update = () => {
			const revealLine = window.innerHeight * 0.82;
			const midpoint = window.innerHeight * 0.42;
			let current = -1;
			items.forEach((item, index) => {
				const rect = item.getBoundingClientRect();
				if (rect.top <= revealLine && !revealed[index]) {
					revealed = revealed.map((value, i) => (i === index ? true : value));
				}
				if (rect.top <= midpoint) current = index;
			});
			activeStep = current;
		};

		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);

		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});
</script>

<svelte:head>
	<title>How to make a free pixel bouquet · Petalbit tutorial</title>
	<meta
		name="description"
		content="A quick Petalbit walkthrough: pick pixel flowers, write a note, review your bouquet and share the free link. No account needed, live for seven days."
	/>
	<meta property="og:title" content="How to make a free pixel bouquet · Petalbit" />
	<meta
		property="og:description"
		content="Pick flowers, write a note, send one link. The whole Petalbit flow in three steps."
	/>
	<meta property="og:type" content="article" />
</svelte:head>

<section class="tutorial-hero">
	<div class="shell hero-grid">
		<div class="hero-copy">
			<p class="eyebrow">Tutorial</p>
			<h1 class="display-lg">Make a bouquet<br /><em>in about a minute.</em></h1>
			<p class="lede">
				Three quick steps, zero accounts. Here is the whole flow, from picking stems to copying
				the link you send.
			</p>
			<div class="hero-actions">
				<a class="btn btn-primary" href="/create">Start creating</a>
				<a class="link-arrow" href="#walkthrough">See the steps</a>
			</div>
			<ul class="facts">
				<li>Free</li>
				<li>No login</li>
				<li>7-day link</li>
				<li>Phone friendly</li>
			</ul>
		</div>

		<div class="hero-art">
			<div class="art-card">
				<Bouquet
					flowers={['mawar', 'peony', 'tulip', 'daisy', 'lavender']}
					paper="envelope"
					greenery={false}
				/>
			</div>
			<p class="mono art-note">this could be yours in a minute</p>
		</div>
	</div>
</section>

<section class="section" id="walkthrough">
	<div class="shell">
		<header class="section-head">
			<p class="eyebrow">The walkthrough</p>
			<h2 class="display-lg">Three steps to a finished bouquet.</h2>
			<p class="section-sub">
				Each step shows a little preview of that part of the studio as you scroll. The real
				studio keeps a live bouquet beside the options the whole time.
			</p>
		</header>

		<nav class="walk-rail" aria-label="Tutorial steps">
			{#each steps as item, i (item.n)}
				<a
					href={`#step-${item.n}`}
					class:active={activeStep === i}
					class:done={activeStep > i}
					aria-current={activeStep === i ? 'step' : undefined}
				>
					<span class="rail-n">{item.n}</span>
					{item.meta}
				</a>
			{/each}
		</nav>

		<ol class="guide">
			{#each steps as step, i (step.n)}
				<li
					class="guide-step"
					class:current={activeStep === i}
					class:in={revealed[i]}
					id={`step-${step.n}`}
					data-guide-step
				>
					<span class="step-n">{step.n}</span>
					<div class="step-body">
						<p class="mono step-meta">{step.meta}</p>
						<h3>{step.title}</h3>
						<p class="step-text">{step.text}</p>
						<ul class="step-tips">
							{#each step.tips as tip (tip)}
								<li>{tip}</li>
							{/each}
						</ul>
					</div>
					<div class="step-art" class:live={activeStep === i} aria-hidden="true">
						<StepPreview step={i + 1} active={activeStep === i} />
					</div>
				</li>
			{/each}
		</ol>
	</div>
</section>

<section class="section finish-wrap">
	<div class="shell">
		<div class="finish-card">
			<div class="finish-copy">
				<p class="eyebrow">You are ready</p>
				<h2 class="display-lg">That is the whole thing.</h2>
				<p>
					Start with a quick pick if you want speed, or build stem by stem. Either way you will
					have a shareable bouquet link in under a minute.
				</p>
				<ul class="finish-list">
					<li>Free, with no account to create or open.</li>
					<li>One link for chat, DMs or email.</li>
					<li>Bouquet and note live for seven days.</li>
				</ul>
				<div class="finish-actions">
					<a class="btn btn-primary" href="/create">Make a bouquet</a>
					<a class="link-arrow" href="/#bunga">Browse the flowers</a>
				</div>
			</div>
			<div class="finish-art" aria-hidden="true">
				<img src="/art/flowers/peony.png" alt="" width="450" height="696" />
				<img src="/art/flowers/lavender.png" alt="" width="450" height="696" />
				<img src="/art/flowers/iris.png" alt="" width="450" height="696" />
			</div>
		</div>
	</div>
</section>

<style>
	.tutorial-hero {
		padding-block: clamp(2.4rem, 6vw, 4.2rem) clamp(1rem, 3vw, 1.6rem);
		overflow: clip;
	}

	.hero-grid {
		display: grid;
		gap: clamp(1.6rem, 4vw, 3rem);
		align-items: center;
	}

	.hero-copy h1 {
		margin-top: 0.55rem;
	}

	.hero-copy em {
		font-style: italic;
		font-weight: 400;
		color: var(--color-rose);
	}

	.lede {
		margin-top: 0.9rem;
		max-width: 44ch;
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--color-ink-soft);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.8rem 1.3rem;
		margin-top: 1.4rem;
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		list-style: none;
		padding: 0;
		margin: 1.2rem 0 0;
	}

	.facts li {
		border: 1px solid var(--color-rule);
		border-radius: 999px;
		background: rgb(255 253 247 / 0.7);
		padding: 0.28rem 0.62rem;
		font-family: var(--font-mono);
		font-size: 0.54rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-soft);
	}

	.hero-art {
		max-width: 360px;
		width: 100%;
		margin-inline: auto;
	}

	.art-card {
		border: 1px solid var(--color-rule);
		border-radius: 14px;
		background: linear-gradient(180deg, var(--color-paper), #f7ecdd);
		box-shadow: var(--shadow-soft);
		padding: 0.7rem;
	}

	.art-note {
		margin-top: 0.55rem;
		text-align: center;
		color: var(--color-ink-faint);
		font-size: 0.54rem;
	}

	.section {
		padding-block: clamp(2rem, 4.5vw, 3.6rem);
	}

	.section-head {
		display: grid;
		gap: 0.65rem;
		max-width: 46rem;
		margin-bottom: clamp(1.2rem, 2.6vw, 1.8rem);
	}

	.section-sub {
		max-width: 52ch;
		font-size: 0.88rem;
		line-height: 1.7;
		color: var(--color-ink-soft);
	}

	.walk-rail {
		position: sticky;
		top: 4.5rem;
		z-index: 20;
		display: flex;
		gap: 0.3rem;
		padding: 0.45rem 0;
		margin-bottom: 0.4rem;
		background: transparent;
	}

	.walk-rail a {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid var(--color-rule-soft);
		border-radius: 999px;
		background: rgb(255 253 247 / 0.9);
		padding: 0.24rem 0.6rem 0.24rem 0.24rem;
		font-family: var(--font-mono);
		font-size: 0.5rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--color-ink-faint);
		transition:
			background-color 300ms ease,
			color 300ms ease,
			border-color 300ms ease;
	}

	.walk-rail a.active {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-paper);
	}

	.walk-rail a.done {
		border-color: var(--color-blush);
		background: var(--color-blush-soft);
		color: var(--color-rose-deep);
	}

	.rail-n {
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: rgb(25 17 16 / 0.06);
		font-size: 0.42rem;
	}

	.walk-rail a.active .rail-n {
		background: var(--color-rose);
		color: #fff7ef;
	}

	.guide {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--color-rule);
	}

	.guide-step {
		display: grid;
		grid-template-columns: 40px minmax(0, 1fr);
		gap: 0.9rem;
		padding: 1.3rem 0;
		border-bottom: 1px solid var(--color-rule);
		scroll-margin-top: 7.5rem;
		opacity: 0;
		transform: translateY(26px);
		transition:
			opacity 700ms var(--ease-out),
			transform 700ms var(--ease-out);
	}

	.guide-step.in {
		opacity: 1;
		transform: none;
	}

	.guide-step.current .step-body {
		transform: translateX(2px);
	}

	.step-body {
		transition: transform 500ms var(--ease-out);
	}

	.step-n {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--color-ink);
		border-radius: 50%;
		background: var(--color-blush-soft);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--color-rose-deep);
		transition:
			background-color 400ms ease,
			color 400ms ease,
			border-color 400ms ease,
			transform 500ms var(--ease-spring),
			box-shadow 400ms ease;
	}

	.guide-step.current .step-n {
		background: var(--color-rose);
		border-color: var(--color-rose-deep);
		color: #fff7ef;
		transform: scale(1.08);
		box-shadow: 0 0 0 5px rgb(173 54 72 / 0.12);
	}

	.guide-step.in .step-tips li {
		opacity: 1;
		transform: none;
	}

	.guide-step.in .step-tips li:nth-child(2) {
		transition-delay: 90ms;
	}

	.guide-step.in .step-tips li:nth-child(3) {
		transition-delay: 180ms;
	}

	.step-meta {
		color: var(--color-rose-deep);
	}

	.step-body h3 {
		margin-top: 0.25rem;
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 2.8vw, 1.7rem);
		letter-spacing: -0.03em;
	}

	.step-text {
		margin-top: 0.4rem;
		max-width: 58ch;
		font-size: 0.86rem;
		line-height: 1.65;
		color: var(--color-ink-soft);
	}

	.step-tips {
		list-style: none;
		padding: 0;
		margin: 0.7rem 0 0;
		display: grid;
		gap: 0.35rem;
		max-width: 62ch;
	}

	.step-tips li {
		position: relative;
		padding-left: 1.1rem;
		font-size: 0.8rem;
		line-height: 1.55;
		color: var(--color-ink-soft);
		opacity: 0;
		transform: translateY(8px);
		transition:
			opacity 520ms ease,
			transform 520ms var(--ease-out);
	}

	.step-tips li::before {
		content: '✿';
		position: absolute;
		left: 0;
		top: 0;
		color: var(--color-rose);
		font-size: 0.68rem;
	}

	.step-art {
		display: grid;
		grid-column: 1 / -1;
		place-items: stretch;
		min-height: 150px;
		margin-top: 0.55rem;
		border: 1px solid var(--color-rule-soft);
		border-radius: 10px;
		background: radial-gradient(circle at 50% 85%, rgb(236 207 202 / 0.4), transparent 70%), var(--color-paper-warm);
		padding: 0.4rem;
		overflow: hidden;
		opacity: 0;
		transform: translateY(10px) scale(0.98);
		transition:
			opacity 700ms var(--ease-out),
			transform 700ms var(--ease-out),
			border-color 500ms ease,
			box-shadow 500ms ease;
	}

	.guide-step.in .step-art {
		opacity: 1;
		transform: none;
	}

	.guide-step.current .step-art {
		border-color: var(--color-rose-light);
		box-shadow: 0 10px 22px -18px rgb(25 17 16 / 0.5);
	}

	.finish-wrap {
		padding-bottom: clamp(3rem, 6vw, 5rem);
	}

	.finish-card {
		position: relative;
		display: grid;
		gap: 1rem;
		border: 1px solid var(--color-rule);
		border-radius: 14px;
		background:
			radial-gradient(ellipse at 90% 12%, rgb(236 207 202 / 0.65), transparent 55%),
			var(--color-paper);
		padding: clamp(1.2rem, 3vw, 2rem);
		overflow: hidden;
	}

	.finish-copy p {
		margin-top: 0.55rem;
		max-width: 52ch;
		font-size: 0.86rem;
		line-height: 1.65;
		color: var(--color-ink-soft);
	}

	.finish-list {
		list-style: none;
		padding: 0;
		margin: 0.8rem 0 0;
		display: grid;
		gap: 0.3rem;
	}

	.finish-list li {
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}

	.finish-list li::before {
		content: '✓';
		margin-right: 0.45rem;
		color: var(--color-sage-deep);
		font-weight: 700;
	}

	.finish-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.7rem 1.2rem;
		margin-top: 1.1rem;
	}

	.finish-art {
		display: none;
		position: relative;
		min-height: 190px;
	}

	.finish-art img {
		position: absolute;
		width: 42%;
		height: auto;
	}

	.finish-art img:nth-child(1) {
		left: 4%;
		bottom: -8%;
		transform: rotate(-8deg);
	}

	.finish-art img:nth-child(2) {
		left: 32%;
		bottom: 12%;
		transform: rotate(2deg);
	}

	.finish-art img:nth-child(3) {
		left: 60%;
		bottom: -4%;
		transform: rotate(9deg);
	}

	@media (min-width: 720px) {
		.hero-grid {
			grid-template-columns: minmax(0, 1fr) 340px;
		}

		.guide-step {
			grid-template-columns: 52px minmax(0, 1fr) 220px;
			align-items: start;
			gap: 1.2rem;
			padding: 1.6rem 0;
		}

		.step-art {
			grid-column: auto;
			height: 158px;
			min-height: 0;
			margin-top: 0;
		}

		.finish-card {
			grid-template-columns: minmax(0, 1fr) 300px;
			align-items: center;
			padding: clamp(1.6rem, 3vw, 2.2rem);
		}

		.finish-art {
			display: block;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.guide-step,
		.step-art,
		.step-tips li {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
