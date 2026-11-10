<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Brand from './Brand.svelte';
	import { magnet } from '$lib/actions/motion';

	const links = [
		{ href: '/#cara-kerja', label: 'Cara Kerja' },
		{ href: '/#bunga', label: 'Bunga' },
		{ href: '/#dukung', label: 'Dukung' }
	];

	const onCreatePage = $derived(page.url.pathname.startsWith('/create'));

	let scrolled = $state(false);
	let progress = $state(0);
	let open = $state(false);
	let pill = $state<HTMLElement | null>(null);
	let nav = $state<HTMLElement | null>(null);

	function slide(event: Event) {
		const target = event.currentTarget as HTMLElement;
		if (!pill || !nav) return;
		const box = nav.getBoundingClientRect();
		const rect = target.getBoundingClientRect();
		pill.style.opacity = '1';
		pill.style.width = `${rect.width}px`;
		pill.style.transform = `translateX(${rect.left - box.left}px)`;
	}

	function hidePill() {
		if (pill) pill.style.opacity = '0';
	}

	onMount(() => {
		let frame = 0;
		const onScroll = () => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				const y = window.scrollY;
				scrolled = y > 12;
				const max = document.documentElement.scrollHeight - window.innerHeight;
				progress = max > 0 ? Math.min(1, y / max) : 0;
			});
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			if (frame) cancelAnimationFrame(frame);
		};
	});

	$effect(() => {
		if (!open) return;
		const close = (event: KeyboardEvent) => {
			if (event.key === 'Escape') open = false;
		};
		window.addEventListener('keydown', close);
		return () => window.removeEventListener('keydown', close);
	});
</script>

<header class="site-header" class:scrolled class:open>
	<div class="bar">
		<Brand size="sm" />

		<nav aria-label="Navigasi utama" bind:this={nav} onpointerleave={hidePill}>
			<span class="pill" bind:this={pill} aria-hidden="true"></span>
			{#each links as link (link.href)}
				<a
					href={link.href}
					onpointerenter={slide}
					onfocus={slide}
					onblur={hidePill}
					onclick={() => (open = false)}
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="actions">
			<a
				class="btn btn-primary btn-sm cta"
				href={onCreatePage ? '/' : '/create'}
				use:magnet={{ strength: 6 }}
			>
				{#if onCreatePage}
					Beranda
				{:else}
					Buat Buket
				{/if}
			</a>

			<button
				type="button"
				class="menu"
				aria-expanded={open}
				aria-controls="menu-panel"
				onclick={() => (open = !open)}
			>
				<span class="menu-label">{open ? 'Tutup' : 'Menu'}</span>
				<span class="menu-glyph" aria-hidden="true"><i></i><i></i></span>
			</button>
		</div>
	</div>

	<div class="scroll-progress" aria-hidden="true" style="transform: scaleX({progress})"></div>

	<div class="panel" id="menu-panel" class:shown={open}>
		<nav aria-label="Navigasi seluler">
			{#each links as link, i (link.href)}
				<a
					href={link.href}
					onclick={() => (open = false)}
					style="--i:{i}"
					tabindex={open ? 0 : -1}
				>
					<span class="panel-index">0{i + 1}</span>
					{link.label}
				</a>
			{/each}
		</nav>
		<div class="panel-foot">
			<p class="mono">Gratis · tanpa akun · 7 hari</p>
			<a class="btn btn-primary btn-sm" href="/create" tabindex={open ? 0 : -1} onclick={() => (open = false)}>
				Mulai merangkai
			</a>
		</div>
	</div>
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 60;
		background: rgb(241 232 218 / 0.82);
		backdrop-filter: blur(14px) saturate(1.05);
		border-bottom: 1px solid transparent;
		transition:
			border-color 300ms ease,
			background-color 300ms ease;
	}

	.site-header.scrolled {
		border-bottom-color: var(--color-rule);
		background: rgb(241 232 218 / 0.93);
	}

	.bar {
		max-width: 1180px;
		margin: 0 auto;
		padding: 0.85rem clamp(1.15rem, 4vw, 2.5rem);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		transition: padding 380ms var(--ease-out);
	}

	.scrolled .bar {
		padding-block: 0.55rem;
	}

	nav {
		position: relative;
		display: none;
		align-items: center;
		gap: 0.15rem;
		padding: 0.22rem;
	}

	.pill {
		position: absolute;
		left: 0;
		top: 50%;
		height: 30px;
		margin-top: -15px;
		border-radius: var(--radius);
		background: rgb(25 17 16 / 0.06);
		opacity: 0;
		width: 0;
		transition:
			transform 380ms var(--ease-out),
			width 380ms var(--ease-out),
			opacity 240ms ease;
	}

	nav a {
		position: relative;
		z-index: 1;
		padding: 0.42rem 0.72rem;
		border-radius: var(--radius);
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-ink-soft);
		text-decoration: none;
		transition: color 200ms ease;
	}

	nav a:hover {
		color: var(--color-ink);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.cta {
		display: none;
	}

	/* --------------------------------------------------------------- mobile */
	.menu {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: transparent;
		padding: 0.55rem 0.7rem;
		color: var(--color-ink);
		cursor: pointer;
	}

	.menu-label {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.menu-glyph {
		display: grid;
		gap: 3px;
	}

	.menu-glyph i {
		display: block;
		width: 13px;
		height: 1px;
		background: currentColor;
		transition: transform 320ms var(--ease-out);
	}

	.open .menu-glyph i:first-child {
		transform: translateY(2px) rotate(45deg);
	}

	.open .menu-glyph i:last-child {
		transform: translateY(-2px) rotate(-45deg);
	}

	.panel {
		display: grid;
		gap: 1.2rem;
		padding: 0 clamp(1.15rem, 4vw, 2.5rem);
		max-height: 0;
		overflow: hidden;
		opacity: 0;
		border-top: 1px solid transparent;
		transition:
			max-height 460ms var(--ease-out),
			opacity 260ms ease,
			padding 460ms var(--ease-out);
	}

	.panel.shown {
		max-height: 22rem;
		opacity: 1;
		padding-block: 1rem 1.4rem;
		border-top-color: var(--color-rule-soft);
		background: var(--color-bone);
		box-shadow: 0 22px 30px -30px rgb(25 17 16 / 0.5);
	}

	.panel nav {
		display: grid;
		gap: 0;
		padding: 0;
	}

	.panel nav a {
		display: flex;
		align-items: baseline;
		gap: 0.7rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--color-rule-soft);
		font-family: var(--font-display);
		font-size: 1.4rem;
		letter-spacing: -0.03em;
		color: var(--color-ink);
		opacity: 0;
		transform: translateY(8px);
		transition:
			opacity 360ms ease,
			transform 460ms var(--ease-out);
		transition-delay: calc(var(--i) * 55ms + 60ms);
	}

	.panel.shown nav a {
		opacity: 1;
		transform: none;
	}

	.panel-index {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: var(--color-rose-deep);
	}

	.panel-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.panel-foot .mono {
		color: var(--color-ink-faint);
	}

	.scroll-progress {
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: var(--color-rose);
		transform-origin: left;
		transform: scaleX(0);
		opacity: 0.9;
	}

	@media (min-width: 760px) {
		nav {
			display: flex;
		}

		.cta {
			display: inline-flex;
		}

		.menu {
			display: none;
		}

		.panel {
			display: none;
		}
	}
</style>
