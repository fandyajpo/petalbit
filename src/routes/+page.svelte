<script lang="ts">
	import Bouquet from '$lib/components/Bouquet.svelte';
	import FloatingPetals from '$lib/components/FloatingPetals.svelte';
	import FlowerTicker from '$lib/components/FlowerTicker.svelte';
	import IntroLoader from '$lib/components/IntroLoader.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { countUp, magnet, splitText, spotlight, tilt } from '$lib/actions/motion';
	import { FLOWERS } from '$lib/data/flowers';

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

	const donationUrl = 'https://saweria.co/fandy11';
</script>

<svelte:head>
	<title>Petalbit — Little pixels, lovely flowers.</title>
	<meta
		name="description"
		content="Petalbit adalah generator buket bunga digital gratis. Pilih bunga pixel, tulis pesan spesial, lalu bagikan buketmu lewat satu tautan. Bertahan 7 hari."
	/>
	<meta property="og:title" content="Petalbit — Little pixels, lovely flowers." />
	<meta
		property="og:description"
		content="Rangkai buket bunga digital untuk seseorang yang spesial. Gratis, tanpa akun, dan bertahan 7 hari."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:image" content="/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<IntroLoader />

<section class="hero">
	<div class="hero-wash" aria-hidden="true"></div>
	<div class="hero-petals" aria-hidden="true">
		<FloatingPetals count={6} />
	</div>

	<div class="shell hero-inner">
		<div class="hero-copy">
			<p class="mono hero-eyebrow">
				<span class="dot" aria-hidden="true"></span>
				Gratis · Tanpa akun · Bertahan 7 hari
			</p>

			<h1 class="display-xl" use:splitText={{ delay: 120, step: 62 }}>
				Little pixels,<br /><em>lovely flowers.</em>
			</h1>

			<p class="body-lg hero-lede">
				Rangkai buket bunga digital untuk seseorang yang spesial. Pilih kelopaknya, tulis pesannya,
				lalu kirimkan lewat satu tautan cantik.
			</p>

			<div class="cta-row">
				<a class="btn btn-primary" href="/create" use:magnet={{ strength: 9 }}>
					Buat buket
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" />
					</svg>
				</a>
				<a class="link-arrow" href="#bunga">
					Lihat koleksi
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M8 2v12M3 9l5 5 5-5" stroke="currentColor" stroke-width="1.6" />
					</svg>
				</a>
			</div>

			<ul class="hero-facts">
				<li><strong>09</strong> spesies bunga</li>
				<li><strong>07</strong> tangkai per buket</li>
				<li><strong>01</strong> tautan untuk dibagikan</li>
			</ul>
		</div>

		<div class="hero-art" use:tilt={{ max: 3 }}>
			<div class="plate marks" use:spotlight>
				<div class="plate-head">
					<span class="mono">Lembar contoh</span>
					<span class="mono plate-no">No. 07 / 09</span>
				</div>
				<div class="plate-art">
					<Bouquet hint />
				</div>
				<div class="plate-foot">
					<span class="mono">Mawar · Tulip · Daisy</span>
					<span class="mono">150 × 232 px</span>
				</div>
			</div>
			<p class="art-caption">Setiap kelopak digambar pixel per pixel — bukan foto, bukan templat.</p>
		</div>
	</div>

	<div class="shell scroll-cue" aria-hidden="true">
		<span class="mono">Gulir untuk melihat</span>
		<span class="cue-line"><i></i></span>
	</div>
</section>

<FlowerTicker />

<section class="section steps" id="cara-kerja">
	<div class="shell">
		<header class="section-head">
			<p class="eyebrow">Cara kerja</p>
			<h2 class="display-lg" use:splitText={{ step: 50 }}>Tiga langkah, satu buket.</h2>
			<p class="section-sub">
				Prosesnya sesederhana memilih bunga di toko sungguhan — hanya saja semuanya bisa selesai
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
		<div class="notice reveal" use:reveal>
			<div class="notice-figure">
				<span class="notice-num" use:countUp={{ to: 7, duration: 1400 }}>0</span>
				<span class="mono">hari</span>
			</div>
			<div class="notice-copy">
				<p class="eyebrow">Sekilas info</p>
				<h2>Indahnya karena sementara.</h2>
				<p>
					Buket ini hanya bertahan selama 7 hari setelah dibuat. Setelah itu, buket dan pesanmu
					akan menghilang secara otomatis — tanpa pengingat, tanpa sisa.
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
		<header class="section-head collection-head">
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
		<div class="support-card reveal" use:reveal>
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
					<a
						class="btn btn-primary"
						href={donationUrl}
						target="_blank"
						rel="noopener noreferrer"
						use:magnet={{ strength: 7 }}
					>
						Dukung Petalbit
						<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path
								d="M6 3h7v7M13 3L3 13"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="square"
							/>
						</svg>
						<span class="sr-only">(terbuka di tab baru)</span>
					</a>
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
		position: relative;
		padding-block: clamp(2.4rem, 5vw, 4.4rem) clamp(1rem, 2vw, 1.6rem);
		overflow: hidden;
	}

	.hero-wash {
		position: absolute;
		inset: -30% -10% auto;
		height: 118%;
		background:
			radial-gradient(ellipse 60% 50% at 78% 34%, rgb(236 207 202 / 0.75), transparent 62%),
			radial-gradient(ellipse 40% 40% at 8% 4%, rgb(223 154 166 / 0.22), transparent 60%);
		pointer-events: none;
	}

	.hero-petals {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.hero-inner {
		position: relative;
		z-index: 2;
		display: grid;
		gap: clamp(2.2rem, 5vw, 4rem);
		align-items: center;
	}

	.hero-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--color-rose-deep);
	}

	.hero-eyebrow .dot {
		width: 5px;
		height: 5px;
		background: var(--color-rose);
		box-shadow: 0 0 0 3px rgb(173 54 72 / 0.14);
	}

	h1 {
		margin: 1.2rem 0 0;
		font-weight: 500;
	}

	h1 em {
		font-style: italic;
		font-weight: 400;
		color: var(--color-rose);
	}

	.hero-lede {
		margin-top: 1.5rem;
		max-width: 40ch;
	}

	.cta-row {
		margin-top: 2rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.9rem 1.6rem;
	}

	.hero-facts {
		margin: 2.4rem 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.hero-facts li {
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
		padding-right: 1rem;
		margin-right: 1rem;
		border-right: 1px solid var(--color-rule);
	}

	.hero-facts li:last-child {
		border-right: 0;
		margin-right: 0;
		padding-right: 0;
	}

	.hero-facts strong {
		font-family: var(--font-display);
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		color: var(--color-ink);
	}

	.hero-art {
		position: relative;
		max-width: 30rem;
		margin-inline: auto;
		width: 100%;
	}

	.plate {
		position: relative;
		background: linear-gradient(170deg, var(--color-paper) 0%, #f6ecdd 100%);
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		padding: 0.85rem 0.85rem 0.5rem;
		box-shadow: var(--shadow-soft);
	}

	.plate::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(rgb(25 17 16 / 0.05) 0.7px, transparent 0.8px);
		background-size: 3px 3px;
		pointer-events: none;
		opacity: 0.6;
		mix-blend-mode: multiply;
	}

	.plate-head,
	.plate-foot {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		color: var(--color-ink-faint);
	}

	.plate-no {
		color: var(--color-rose-deep);
	}

	.plate-art {
		position: relative;
		z-index: 1;
		margin: 0.5rem 0 0.1rem;
		padding-inline: clamp(0.3rem, 1.6vw, 1.1rem);
	}

	.plate-foot {
		border-top: 1px solid var(--color-rule-soft);
		padding-top: 0.5rem;
	}

	.art-caption {
		margin-top: 0.9rem;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.8rem;
		color: var(--color-ink-faint);
		text-align: center;
	}

	.scroll-cue {
		display: none;
		margin-top: 2.2rem;
		align-items: center;
		gap: 0.8rem;
		color: var(--color-ink-faint);
	}

	.cue-line {
		position: relative;
		flex: 1;
		height: 1px;
		background: var(--color-rule);
		overflow: hidden;
	}

	.cue-line i {
		position: absolute;
		inset: 0;
		background: var(--color-rose);
		transform-origin: left;
		animation: cue-sweep 3.4s var(--ease-soft) infinite;
	}

	@keyframes cue-sweep {
		0% {
			transform: scaleX(0);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		70%,
		100% {
			transform: scaleX(1);
			opacity: 0;
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

	.support-note {
		color: var(--color-ink-faint);
	}

	@media (min-width: 720px) {
		.hero-inner {
			grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
		}

		.hero-art {
			max-width: none;
		}

		.scroll-cue {
			display: flex;
		}

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
