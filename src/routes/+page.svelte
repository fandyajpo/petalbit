<script lang="ts">
	import FlowerTunnel from '$lib/components/FlowerTunnel.svelte';
	import FloatingPetals from '$lib/components/FloatingPetals.svelte';
	import FlowerTicker from '$lib/components/FlowerTicker.svelte';
	import IntroLoader from '$lib/components/IntroLoader.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { countUp, magnet, splitText, spotlight, tilt } from '$lib/actions/motion';
	import { parallax } from '$lib/actions/parallax';
	import { scrollProgress } from '$lib/actions/scroll-progress';
	import { FLOWERS } from '$lib/data/flowers';

	let railCountEl: HTMLSpanElement;

	const steps = [
		{
			n: '01',
			meta: 'Pilih',
			title: 'Pilih bunga favoritmu',
			text: 'Sembilan bunga pixel menunggu untuk dirangkai. Pilih yang paling cocok dengan perasaanmu hari ini.',
			art: '/art/flowers/mawar.png',
			alt: 'Ilustrasi pixel mawar'
		},
		{
			n: '02',
			meta: 'Tulis',
			title: 'Tambahkan nama dan pesan',
			text: 'Tulis untuk siapa, dari siapa, dan kalimat kecil yang ingin kamu titipkan pada kelopaknya.',
			art: '/art/flowers/tulip.png',
			alt: 'Ilustrasi pixel tulip'
		},
		{
			n: '03',
			meta: 'Kirim',
			title: 'Bagikan buket digitalmu',
			text: 'Satu tautan unik, siap dikirim lewat chat. Buketmu akan mekar selama tujuh hari ke depan.',
			art: '/art/flowers/daisy.png',
			alt: 'Ilustrasi pixel daisy'
		}
	];

	const supportLinks = [
		{
			label: 'Saweria',
			icon: '/brand/saweria.png',
			href: 'https://saweria.co/fandy11'
		},
		{
			label: 'Sociabuzz',
			icon: '/brand/sociabuzz.png',
			href: 'https://sociabuzz.com/fandybuzz/tribe'
		}
	];
</script>

<svelte:head>
	<title>Petalbit: Little pixels, lovely flowers.</title>
	<meta
		name="description"
		content="Petalbit adalah generator buket bunga digital gratis. Pilih bunga pixel, tulis pesan spesial, lalu bagikan buketmu lewat satu tautan. Bertahan 7 hari."
	/>
	<meta property="og:title" content="Petalbit: Little pixels, lovely flowers." />
	<meta
		property="og:description"
		content="Rangkai buket bunga digital untuk seseorang yang spesial. Gratis, tanpa akun, dan bertahan 7 hari."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:image" content="/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<IntroLoader />

<section
	class="hero"
	use:scrollProgress={{
		onProgress: (value) => {
			const visible = Math.max(1, Math.min(9, Math.ceil(value * 9)));
			if (railCountEl) railCountEl.textContent = `${String(visible).padStart(2, '0')} / 09`;
		}
	}}
>
	<div class="hero-stage">
		<FlowerTunnel />

		<div class="hero-scrim" aria-hidden="true"></div>

		<div class="hero-petals" aria-hidden="true">
			<FloatingPetals count={5} />
		</div>

		<div class="shell hero-inner">
			<div class="hero-copy">
				<p class="sticker hero-badge">
					<span class="emoji" aria-hidden="true">🌷</span>
					buket digital · siap kirim
				</p>

				<h1 class="display-xl" use:splitText={{ delay: 120, step: 62 }}>
					Little pixels,<br /><em>lovely flowers</em><span class="doodle" aria-hidden="true">✿</span>
				</h1>

				<p class="body-lg hero-lede">
					Rangkai buket bunga pixel buat orang yang bikin kamu senyum-senyum sendiri. Pilih
					bunganya, titip pesannya, lalu kirim lewat satu tautan <span aria-hidden="true">💌</span>
				</p>

				<div class="cta-row">
					<a class="btn btn-primary btn-hero" href="/create" use:magnet={{ strength: 9 }}>
						Buat buket
						<span class="btn-emoji" aria-hidden="true">💐</span>
					</a>
					<a class="link-arrow" href="#bunga">Lihat koleksi</a>
				</div>

				<ul class="hero-chips">
					<li><span aria-hidden="true">🌷</span> 9 spesies</li>
					<li><span aria-hidden="true">💐</span> 7 tangkai</li>
					<li><span aria-hidden="true">⏳</span> 7 hari</li>
					<li><span aria-hidden="true">✨</span> gratis, tanpa akun</li>
				</ul>
			</div>
		</div>

		<span class="tunnel-emoji emoji-tulip" aria-hidden="true" use:parallax={{ speed: -0.04, max: 40 }}>
			<span class="bob">🌷</span>
		</span>
		<span class="tunnel-emoji emoji-letter" aria-hidden="true" use:parallax={{ speed: 0.06, max: 40 }}>
			<span class="bob">💌</span>
		</span>

		<p class="hero-end" aria-live="off">
			Sembilan bunga sudah mekar. Waktunya merangkai punyamu.
		</p>

		<div class="hero-rail" aria-hidden="true">
			<span class="mono rail-label">tunnel bunga</span>
			<span class="rail-track"><i></i></span>
			<span class="mono rail-count" bind:this={railCountEl}>01 / 09</span>
		</div>
	</div>
</section>

<FlowerTicker />

<section class="section steps" id="cara-kerja">
	<div class="shell">
		<header class="section-head reveal" use:reveal>
			<p class="eyebrow">Cara kerja</p>
			<h2 class="display-lg" use:splitText={{ step: 50 }}>Tiga langkah, satu buket.</h2>
			<p class="section-sub">
				Prosesnya sesederhana memilih bunga di toko sungguhan. Bedanya, semuanya bisa selesai
				dalam satu menit.
			</p>
		</header>

		<ol class="step-list">
			{#each steps as step, i (step.n)}
				<li
					class="step-row reveal"
					use:reveal={{ delay: i * 90 }}
					use:spotlight
				>
					<span class="step-n">{step.n}</span>
					<div class="step-copy">
						<span class="mono step-meta">{step.meta}</span>
						<h3>{step.title}</h3>
						<p>{step.text}</p>
					</div>
					<div class="step-art" use:tilt={{ max: 8 }}>
						<img src={step.art} alt={step.alt} width="450" height="696" loading="lazy" />
					</div>
				</li>
			{/each}
		</ol>
	</div>
</section>

<section class="notice-wrap">
	<div class="shell">
		<div class="notice reveal reveal-zoom" use:reveal>
			<div class="notice-figure">
				<span class="notice-num" use:countUp={{ to: 7, duration: 1400 }}>0</span>
				<span class="mono">hari</span>
			</div>
			<div class="notice-copy">
				<p class="eyebrow">Sekilas info</p>
				<h2>Indahnya karena sementara.</h2>
				<p>
					Buket ini hanya bertahan selama 7 hari setelah dibuat. Setelah itu, buket dan pesanmu
					akan menghilang secara otomatis, tanpa pengingat dan tanpa sisa.
				</p>
				<p class="notice-small">
					Justru itu yang membuatnya terasa seperti bunga sungguhan: datang, mekar, lalu tenang.
				</p>
			</div>
		</div>
	</div>
</section>

<section class="section collection" id="bunga">
	<div class="shell">
		<header class="section-head collection-head reveal" use:reveal>
			<div>
				<p class="eyebrow">Koleksi</p>
				<h2 class="display-lg" use:splitText={{ step: 45 }}>Sembilan bunga, satu buket.</h2>
			</div>
			<div class="collection-aside">
				<p class="section-sub">
					Pilih hingga tujuh tangkai. Klik salah satu untuk langsung mulai merangkai.
				</p>
				<span class="mono">10 kartu · 9 spesies</span>
			</div>
		</header>

		<ul class="flower-grid">
			{#each FLOWERS as flower, i (flower.id)}
				<li class="flower-item reveal" use:reveal={{ delay: (i % 5) * 60 }}>
					<a
						class="flower-card spot"
						href={`/create?bunga=${flower.id}`}
						aria-label={`Buat buket dengan ${flower.name}`}
						use:spotlight
						use:tilt={{ max: 4 }}
					>
						<span class="card-index mono">{String(i + 1).padStart(2, '0')}</span>
						<div class="card-art">
							<img
								src={flower.image}
								alt={`Ilustrasi pixel ${flower.name}`}
								width="450"
								height="696"
								loading="lazy"
							/>
						</div>
						<div class="card-meta">
							<div class="card-name">
								<h3>{flower.name}</h3>
								<span class="latin">{flower.latin}</span>
							</div>
							<span class="tag">{flower.tone}</span>
						</div>
						<span class="card-go" aria-hidden="true">
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
								<path d="M3 13 13 3M6 3h7v7" stroke="currentColor" stroke-width="1.5" />
							</svg>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

<section class="section support" id="dukung">
	<div class="shell">
		<div class="support-card reveal reveal-zoom" use:reveal>
			<div class="support-art" aria-hidden="true">
				<img src="/art/flowers/peony.png" alt="" width="450" height="696" class="s1" />
				<img src="/art/flowers/lavender.png" alt="" width="450" height="696" class="s2" />
				<img src="/art/flowers/tulip.png" alt="" width="450" height="696" class="s3" />
			</div>

			<div class="support-copy">
				<p class="eyebrow">Dukungan opsional</p>
				<h2 class="display-lg">Suka dengan Petalbit?</h2>
				<p>
					Bantu kami terus menumbuhkan lebih banyak bunga digital. Setiap dukungan dipakai untuk
					ilustrasi baru, server, dan hal-hal kecil yang membuat buketmu tetap gratis.
				</p>
				<div class="support-actions">
					{#each supportLinks as link, i}
						<a
							class="btn"
							class:btn-primary={i === 0}
							href={link.href}
							target="_blank"
							rel="noopener noreferrer"
							use:magnet={{ strength: 7 }}
						>
							<img class="support-icon" src={link.icon} alt="" width="18" height="18" />
							{link.label}
							<span class="sr-only">(terbuka di tab baru)</span>
						</a>
					{/each}
					<span class="mono support-note">Seikhlasnya, tanpa kewajiban</span>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.section {
		padding-block: clamp(3.4rem, 7vw, 6rem);
	}

	.section-head {
		display: grid;
		gap: 0.9rem;
		max-width: 46rem;
		margin-bottom: clamp(2rem, 4vw, 3rem);
	}

	.section-head h2 {
		margin-top: 0.1rem;
	}

	.section-sub {
		max-width: 42ch;
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--color-ink-soft);
	}

	/* ------------------------------------------------------------------ hero */
	.hero {
		--p: 0;
		position: relative;
		height: 235vh;
		height: 235svh;
	}

	.hero-stage {
		position: sticky;
		top: 0;
		display: grid;
		place-items: center;
		height: 100vh;
		height: 100svh;
		min-height: 600px;
		overflow: clip;
		isolation: isolate;
		padding-block: clamp(4.2rem, 9vh, 6rem) clamp(4rem, 10vh, 5.6rem);
	}

	/* A soft paper window in the middle of the tunnel, so the headline always
	   sits on calm ground no matter which blooms are passing behind it. */
	.hero-scrim {
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		background: radial-gradient(
			ellipse 34% 38% at 50% 50%,
			rgb(241 232 218 / 0.6) 0%,
			rgb(241 232 218 / 0.46) 55%,
			rgb(241 232 218 / 0.14) 82%,
			transparent 100%
		);
	}

	.hero-petals {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}

	.hero-inner {
		position: relative;
		z-index: 3;
		display: grid;
		place-items: center;
		width: 100%;
	}

	.hero-copy {
		display: grid;
		justify-items: center;
		text-align: center;
		max-width: 41rem;
		opacity: calc(1 - var(--p, 0) * 0.16);
		transform: translate3d(0, calc(var(--p, 0) * -16px), 0);
	}

	/* ------------------------------------------------------------- stickers */
	.sticker {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border-radius: 999px;
		background: rgb(255 253 247 / 0.95);
		border: 1px solid rgb(25 17 16 / 0.1);
		box-shadow:
			0 10px 22px -16px rgb(25 17 16 / 0.7),
			inset 0 0 0 2px rgb(255 255 255 / 0.9);
		padding: 0.38rem 0.72rem 0.34rem;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		font-weight: 500;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: var(--color-rose-deep);
		white-space: nowrap;
	}

	.hero-badge {
		transform: rotate(-2.4deg);
	}

	.hero-badge .emoji {
		font-size: 0.85rem;
		line-height: 1;
	}

	/* ---------------------------------------------------------------- copy */
	h1 {
		margin: 1.05rem 0 0;
		font-weight: 500;
	}

	h1 em {
		position: relative;
		font-style: italic;
		font-weight: 400;
		color: var(--color-rose);
		isolation: isolate;
	}

	/* Marker stroke behind the italic line, so the serif keeps the romance and
	   the page stops reading like a spec sheet. */
	h1 em::after {
		content: '';
		position: absolute;
		left: 1%;
		right: -1%;
		bottom: 0.02em;
		height: 0.1em;
		z-index: -1;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			rgb(236 207 202 / 0.2),
			rgb(223 154 166 / 0.85) 12%,
			rgb(236 207 202 / 0.8) 88%,
			rgb(236 207 202 / 0.15)
		);
		transform: rotate(-0.8deg);
	}

	.doodle {
		display: inline-block;
		margin-left: 0.14em;
		font-size: 0.34em;
		line-height: 1;
		color: var(--color-rose-light);
		vertical-align: super;
		animation: doodle-twinkle 4.6s var(--ease-soft) infinite;
	}

	@keyframes doodle-twinkle {
		0%,
		100% {
			transform: rotate(-6deg) scale(1);
			opacity: 0.75;
		}
		50% {
			transform: rotate(10deg) scale(1.12);
			opacity: 1;
		}
	}

	.hero-lede {
		margin-top: 1.25rem;
		max-width: 33ch;
	}

	.cta-row {
		margin-top: 1.8rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.9rem 1.5rem;
	}

	.btn-hero {
		padding: 0.95rem 1.45rem 0.92rem;
		font-size: 0.9rem;
	}

	.btn-emoji {
		font-size: 1rem;
		line-height: 1;
		transform: translateY(-1px);
		transition: transform 420ms var(--ease-spring);
	}

	.btn-hero:hover .btn-emoji {
		transform: translateY(-3px) rotate(-12deg) scale(1.1);
	}

	.hero-chips {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.42rem;
		margin: 1.8rem 0 0;
		padding: 0;
		list-style: none;
	}

	.hero-chips li {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.34rem 0.66rem 0.32rem;
		border: 1px solid var(--color-rule-soft);
		border-radius: 999px;
		background: rgb(251 246 236 / 0.72);
		font-family: var(--font-mono);
		font-size: 0.57rem;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--color-ink-soft);
	}

	.hero-chips li span {
		font-size: 0.8rem;
		line-height: 1;
	}

	/* --------------------------------------------------------- tunnel extras */
	.tunnel-emoji {
		position: absolute;
		z-index: 3;
		font-size: clamp(1.1rem, 2.2vw, 1.45rem);
		line-height: 1;
		pointer-events: none;
	}

	.tunnel-emoji .bob {
		display: block;
		animation: emoji-bob 7s var(--ease-soft) infinite;
	}

	.emoji-tulip {
		top: 22%;
		left: clamp(1rem, 9vw, 9rem);
	}

	.emoji-letter {
		right: clamp(1rem, 8vw, 8rem);
		bottom: 26%;
		opacity: 0.9;
	}

	.emoji-letter .bob {
		animation-duration: 8.4s;
		animation-delay: -2.4s;
	}

	@keyframes emoji-bob {
		0%,
		100% {
			transform: translate3d(0, 0, 0) rotate(-4deg);
		}
		50% {
			transform: translate3d(0, -9px, 0) rotate(5deg);
		}
	}

	/* ------------------------------------------------------------- payoff */
	.hero-end {
		position: absolute;
		left: 50%;
		bottom: clamp(3.4rem, 7vh, 4.6rem);
		z-index: 4;
		width: max-content;
		max-width: min(90vw, 34rem);
		transform: translateX(-50%) translateY(calc((1 - clamp(0, calc((var(--p, 0) - 0.68) / 0.16), 1)) * 10px));
		opacity: clamp(0, calc((var(--p, 0) - 0.68) / 0.16), 1);
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(0.9rem, 1.6vw, 1.05rem);
		color: var(--color-rose-deep);
		text-align: center;
	}

	/* ---------------------------------------------------------- progress rail */
	.hero-rail {
		position: absolute;
		left: 50%;
		bottom: clamp(1rem, 2.6vh, 1.8rem);
		z-index: 4;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		transform: translateX(-50%);
		color: var(--color-ink-faint);
	}

	.rail-label,
	.rail-count {
		font-size: 0.54rem;
		letter-spacing: 0.16em;
		white-space: nowrap;
	}

	.rail-count {
		color: var(--color-rose-deep);
	}

	.rail-track {
		position: relative;
		width: clamp(64px, 11vw, 132px);
		height: 1px;
		background: var(--color-rule);
		overflow: hidden;
	}

	.rail-track i {
		position: absolute;
		inset: 0;
		background: var(--color-rose);
		transform-origin: left;
		transform: scaleX(var(--p, 0));
	}

	@media (max-width: 900px) {
		/* Longer scroll runway on phones/tablets so the tunnel unfolds slowly
		   and feels smoother on mobile GPUs. */
		.hero {
			height: 360vh;
			height: 360svh;
		}

		.hero-stage {
			padding-block: clamp(3.6rem, 8vh, 5rem) 4.6rem;
		}

		.emoji-tulip {
			top: 16%;
		}

		.emoji-letter {
			bottom: 30%;
		}
	}

	@media (max-width: 620px) {
		.hero-copy {
			max-width: 24rem;
		}

		.hero-lede {
			font-size: 0.95rem;
			line-height: 1.65;
		}

		.hero-chips li {
			font-size: 0.52rem;
			padding: 0.3rem 0.55rem 0.28rem;
		}

		/* The copy runs wider than the flowers on phones, so the paper window
		   behind it gets wider too. */
		.hero-scrim {
			background: radial-gradient(
				ellipse 68% 42% at 50% 52%,
				rgb(241 232 218 / 0.9) 0%,
				rgb(241 232 218 / 0.72) 58%,
				rgb(241 232 218 / 0.2) 88%,
				transparent 100%
			);
		}

		.tunnel-emoji {
			display: none;
		}
	}

	@media (hover: none) and (pointer: coarse) {
		.hero {
			height: 420vh;
			height: 420svh;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero {
			height: auto;
		}

		.hero-stage {
			position: relative;
			height: auto;
			min-height: 92svh;
			padding-block: clamp(5rem, 10vh, 7rem) 5rem;
		}

		.hero-end {
			display: none;
		}

		.doodle,
		.tunnel-emoji .bob {
			animation: none;
		}
	}

	/* Lightweight hero on touch devices: keep the scroll-linked tunnel, drop
	   extra infinite motion and decorative layers for smoother scrolling. */
	@media (hover: none) and (pointer: coarse) {
		.hero-petals,
		.tunnel-emoji {
			display: none;
		}

		.doodle {
			animation: none;
		}
	}

	/* ----------------------------------------------------------------- steps */
	.steps {
		border-top: 1px solid var(--color-rule);
	}

	.step-list {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--color-rule);
	}

	.step-row {
		position: relative;
		display: grid;
		grid-template-columns: 2.6rem 1fr 5.4rem;
		gap: 1rem;
		align-items: start;
		padding: 1.5rem 0.4rem;
		border-bottom: 1px solid var(--color-rule);
		transition: background-color 320ms ease;
	}

	.step-row:hover {
		background: rgb(251 246 236 / 0.7);
	}

	.step-n {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		color: var(--color-rose);
		padding-top: 0.35rem;
	}

	.step-meta {
		color: var(--color-ink-faint);
	}

	.step-copy h3 {
		margin-top: 0.45rem;
		font-size: clamp(1.35rem, 2.6vw, 1.85rem);
		letter-spacing: -0.03em;
	}

	.step-copy p {
		margin-top: 0.55rem;
		max-width: 46ch;
		font-size: 0.93rem;
		line-height: 1.7;
		color: var(--color-ink-soft);
	}

	.step-art {
		align-self: center;
		justify-self: end;
		width: 100%;
		transition: transform 620ms var(--ease-out);
	}

	.step-row:hover .step-art {
		transform: translateY(-6px) rotate(-2deg);
	}

	.step-art img {
		width: 100%;
		height: auto;
		max-height: 7.4rem;
		object-fit: contain;
	}

	/* ---------------------------------------------------------------- notice */
	.notice-wrap {
		padding-block: clamp(2rem, 4vw, 3rem);
	}

	.notice {
		display: grid;
		gap: 1.6rem;
		background: var(--color-ink);
		color: var(--color-paper);
		border-radius: var(--radius);
		padding: clamp(1.6rem, 4vw, 3rem);
		position: relative;
		overflow: hidden;
	}

	.notice::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(rgb(251 246 236 / 0.09) 0.7px, transparent 0.8px);
		background-size: 3px 3px;
		pointer-events: none;
	}

	.notice-figure {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.notice-num {
		font-family: var(--font-display);
		font-size: clamp(4.5rem, 12vw, 8rem);
		line-height: 1;
		padding-top: 0.06em;
		letter-spacing: -0.05em;
		color: var(--color-rose-light);
		font-variant-numeric: tabular-nums;
	}

	.notice-figure .mono {
		color: rgb(251 246 236 / 0.55);
	}

	.notice-copy h2 {
		margin: 0.7rem 0 0.8rem;
		color: var(--color-paper);
		font-size: clamp(1.7rem, 3.4vw, 2.5rem);
	}

	.notice-copy p {
		max-width: 48ch;
		font-size: 0.94rem;
		line-height: 1.75;
		color: rgb(251 246 236 / 0.72);
	}

	.notice-small {
		margin-top: 0.9rem;
		font-family: var(--font-display);
		font-style: italic;
		color: rgb(251 246 236 / 0.55) !important;
	}

	.notice .eyebrow {
		color: var(--color-rose-light);
	}

	/* ------------------------------------------------------------ collection */
	.collection {
		border-top: 1px solid var(--color-rule);
	}

	.collection-head {
		grid-template-columns: 1fr;
		max-width: none;
		align-items: end;
	}

	.collection-aside {
		display: grid;
		gap: 0.5rem;
		justify-items: start;
	}

	.collection-aside .mono {
		color: var(--color-rose-deep);
	}

	.flower-grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.flower-item {
		min-width: 0;
	}

	.flower-card {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: var(--color-paper);
		text-decoration: none;
		color: inherit;
		overflow: hidden;
		transition:
			border-color 260ms ease,
			box-shadow 420ms var(--ease-out);
	}

	.flower-card:hover {
		border-color: rgb(25 17 16 / 0.42);
		box-shadow: 0 20px 34px -30px rgb(25 17 16 / 0.8);
	}

	.card-index {
		position: absolute;
		top: 0.55rem;
		left: 0.62rem;
		z-index: 3;
		color: var(--color-ink-faint);
		font-size: 0.55rem;
	}

	.card-art {
		position: relative;
		display: grid;
		place-items: center;
		padding: 1.1rem 0.7rem 0.3rem;
		background: linear-gradient(180deg, var(--color-paper-warm), transparent 70%);
		overflow: hidden;
	}

	.card-art img {
		width: 100%;
		height: auto;
		max-height: 11.5rem;
		object-fit: contain;
		transform-origin: 50% 78%;
		transition:
			transform 700ms var(--ease-out),
			filter 400ms ease;
	}

	.flower-card:hover .card-art img {
		transform: translateY(-4px) scale(1.035);
		filter: saturate(1.03);
	}

	.card-meta {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.6rem 0.7rem 0.72rem;
		border-top: 1px solid var(--color-rule-soft);
		margin-top: auto;
	}

	.card-name h3 {
		font-size: 1.08rem;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.latin {
		display: block;
		margin-top: 0.18rem;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.72rem;
		color: var(--color-ink-faint);
	}

	.card-go {
		position: absolute;
		right: 0.6rem;
		top: 0.55rem;
		z-index: 3;
		display: grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: var(--color-paper);
		color: var(--color-ink-soft);
		opacity: 0;
		transform: translateY(-3px);
		transition:
			opacity 260ms ease,
			transform 360ms var(--ease-out);
	}

	.flower-card:hover .card-go {
		opacity: 1;
		transform: none;
	}

	/* --------------------------------------------------------------- support */
	.support {
		border-top: 1px solid var(--color-rule);
	}

	.support-card {
		display: grid;
		gap: 1.6rem;
		align-items: center;
		border: 1px solid var(--color-rule);
		background: var(--color-paper-warm);
		border-radius: var(--radius);
		padding: clamp(1.2rem, 3vw, 2.2rem);
	}

	.support-art {
		position: relative;
		height: clamp(10rem, 22vw, 13rem);
	}

	.support-art img {
		position: absolute;
		bottom: 0;
		height: 118%;
		width: auto;
		transition: transform 700ms var(--ease-out);
	}

	.support-art .s1 {
		left: 4%;
		transform: rotate(-8deg);
	}

	.support-art .s2 {
		left: 34%;
		height: 96%;
		transform: rotate(4deg);
	}

	.support-art .s3 {
		left: 62%;
		height: 88%;
		transform: rotate(12deg);
	}

	.support-card:hover .s1 {
		transform: rotate(-11deg) translateY(-4px);
	}

	.support-card:hover .s2 {
		transform: rotate(2deg) translateY(-6px);
	}

	.support-card:hover .s3 {
		transform: rotate(15deg) translateY(-3px);
	}

	.support-copy h2 {
		margin-top: 0.6rem;
	}

	.support-copy > p {
		margin-top: 0.8rem;
		max-width: 44ch;
		font-size: 0.92rem;
		line-height: 1.72;
		color: var(--color-ink-soft);
	}

	.support-actions {
		margin-top: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.8rem 1.2rem;
	}

	.support-icon {
		display: block;
		width: 18px;
		height: 18px;
		border-radius: 4px;
		object-fit: contain;
	}

	.support-note {
		color: var(--color-ink-faint);
	}

	@media (min-width: 720px) {
		.step-row {
			grid-template-columns: 3.4rem 1fr 8rem;
			gap: 1.5rem;
			padding: 1.9rem 0.5rem;
			align-items: center;
		}

		.step-art img {
			max-height: 8.6rem;
		}

		.notice {
			grid-template-columns: 0.42fr 1fr;
			align-items: center;
			gap: 2.4rem;
		}

		.collection-head {
			grid-template-columns: 1fr auto;
		}

		.flower-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.9rem;
		}

		.support-card {
			grid-template-columns: 0.9fr 1.1fr;
			gap: 2rem;
			padding: 2.2rem;
		}
	}

	@media (min-width: 980px) {
		.flower-grid {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}

		.card-art {
			padding-top: 1.35rem;
		}
	}
</style>
