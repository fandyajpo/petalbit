<script lang="ts">
	import { page } from '$app/state';
	import { splitText } from '$lib/actions/motion';
	import { reveal } from '$lib/actions/reveal';

	const status = $derived(page.status);
	const message = $derived(
		page.error?.message ?? 'Terjadi kesalahan yang tidak terduga. Coba muat ulang halaman ini.'
	);
	const heading = $derived(
		status === 404 ? 'Buket ini sudah pergi.' : 'Sesuatu layu di sini.'
	);
</script>

<svelte:head>
	<title>{status} · Petalbit</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="oops">
	<div class="oops-inner">
		<div class="oops-art reveal reveal-zoom" aria-hidden="true" use:reveal>
			<span class="code">{status}</span>
			<img src="/art/flowers/mawar.png" alt="" width="450" height="696" />
			<span class="floor"></span>
		</div>

		<div class="oops-copy reveal" use:reveal={{ delay: 120 }}>
			<p class="eyebrow">Halaman tidak ditemukan</p>
			<h1 use:splitText={{ step: 55 }}>{heading}</h1>
			<p class="msg">{message}</p>
			<p class="hint">
				Buket Petalbit hanya bertahan tujuh hari. Kalau tautan ini kamu terima lebih lama dari itu,
				buketnya memang sudah menghilang.
			</p>

			<div class="actions">
				<a class="btn btn-primary" href="/create">Buat buket baru</a>
				<a class="btn" href="/">Kembali ke beranda</a>
			</div>
		</div>
	</div>
</section>

<style>
	.oops {
		max-width: 980px;
		margin: 0 auto;
		padding: clamp(2.5rem, 7vw, 5rem) 1.25rem;
	}

	.oops-inner {
		display: grid;
		gap: clamp(1.8rem, 4vw, 3rem);
		align-items: center;
	}

	.oops-art {
		position: relative;
		display: grid;
		place-items: center;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background:
			radial-gradient(circle at 50% 35%, #fffaf3, var(--color-paper) 65%, #f3e6d8);
		box-shadow:
			7px 7px 0 0 var(--color-cream-deep),
			7px 7px 0 2px var(--color-ink);
		padding: 2rem 1rem 1.4rem;
		min-height: 260px;
		overflow: hidden;
	}

	.oops-art img {
		height: 170px;
		width: auto;
		filter: grayscale(0.55) contrast(0.95);
		transform: rotate(-6deg) translateY(6px);
		opacity: 0.9;
	}

	.floor {
		position: absolute;
		left: 50%;
		bottom: 1.1rem;
		width: 62%;
		height: 10px;
		transform: translateX(-50%);
		background-image: radial-gradient(rgb(43 31 34 / 0.18) 1px, transparent 1.2px);
		background-size: 4px 4px;
	}

	.code {
		position: absolute;
		top: 0.9rem;
		left: 1rem;
		font-family: var(--font-display);
		font-size: 2.4rem;
		font-weight: 600;
		letter-spacing: -0.04em;
		color: var(--color-blush);
		line-height: 1;
	}

	.oops-copy h1 {
		margin-top: 0.7rem;
		font-size: clamp(2rem, 5vw, 3rem);
	}

	.msg {
		margin-top: 0.9rem;
		font-size: 0.95rem;
		line-height: 1.75;
		color: var(--color-ink-soft);
		max-width: 46ch;
	}

	.hint {
		margin-top: 0.7rem;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.82rem;
		line-height: 1.7;
		color: var(--color-ink-faint);
		max-width: 46ch;
	}

	.actions {
		margin-top: 1.7rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
	}

	@media (min-width: 820px) {
		.oops-inner {
			grid-template-columns: 0.85fr 1.15fr;
		}
	}

	/* ============================================================ 2026 revamp */
	.oops {
		max-width: 1000px;
		padding-block: clamp(2.5rem, 6vw, 4.4rem);
	}

	.oops-copy h1 {
		margin-top: 0.7rem;
		font-size: clamp(2.2rem, 5.4vw, 3.4rem);
		letter-spacing: -0.045em;
		line-height: 0.95;
	}

	.oops-copy .msg {
		font-size: 0.92rem;
	}

	.hint {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.05em;
		line-height: 1.9;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}
</style>
