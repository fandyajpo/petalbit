<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Bouquet from './Bouquet.svelte';
	import BouquetBackground from './BouquetBackground.svelte';

	type Props = {
		flowers: string[];
		paper: string;
		background: string;
		to: string;
		from: string;
		message: string;
	};

	let { flowers, paper, background, to, from, message }: Props = $props();

	const MARGIN = 12;
	const DEFAULT_TOP = 72;

	let shell = $state<HTMLElement | null>(null);
	let ready = $state(false);
	let dragging = $state(false);
	let settling = $state(false);
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	let docked = $state<'left' | 'right' | null>(null);
	let dragFrame = 0;
	let pending = { x: 0, y: 0 };
	let x = $state(0);
	let y = $state(0);
	let insets = { top: 0, bottom: 0 };
	// The visible viewport (keyboard, browser chrome, pinch zoom) is smaller than
	// the layout viewport on mobile, so clamping follows visualViewport when it exists.
	let viewport = $state({ w: 390, h: 844, top: 0 });

	function syncViewport() {
		const vv = window.visualViewport;
		viewport = {
			// visualViewport can lag a resize by a frame; the tighter box always wins.
			w: Math.min(window.innerWidth, vv?.width ?? Number.POSITIVE_INFINITY),
			h: Math.min(window.innerHeight, vv?.height ?? Number.POSITIVE_INFINITY),
			top: vv?.offsetTop ?? 0
		};
	}

	/** Render outside the page layout so the window's z-index is global. */
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	function box() {
		const el = shell;
		if (!el) return { w: 172, h: 220 };
		return { w: el.offsetWidth, h: el.offsetHeight };
	}

	function clampPos(nx: number, ny: number) {
		const { w, h } = box();
		const maxX = Math.max(MARGIN, viewport.w - w - MARGIN);
		const minY = viewport.top + insets.top + MARGIN;
		const maxY = Math.max(minY, viewport.top + viewport.h - h - insets.bottom - MARGIN);
		return {
			x: Math.min(maxX, Math.max(MARGIN, nx)),
			y: Math.min(maxY, Math.max(minY, ny))
		};
	}

	/** Keep the height the user dropped it at, pinned to one edge. */
	function sidePos(side: 'left' | 'right') {
		const { w } = box();
		return {
			x: side === 'left' ? MARGIN : Math.max(MARGIN, viewport.w - w - MARGIN),
			y: clampPos(x, y).y
		};
	}

	function settleTo(next: { x: number; y: number }) {
		settling = true;
		x = next.x;
		y = next.y;
		clearTimeout(settleTimer);
		settleTimer = setTimeout(() => (settling = false), 380);
	}

	function snapToNearestSide() {
		const { w } = box();
		const side = x + w / 2 > viewport.w / 2 ? 'right' : 'left';
		docked = side;
		settleTo(sidePos(side));
	}

	function applyTransform() {
		if (shell) shell.style.transform = `translate3d(${pending.x}px, ${pending.y}px, 0)`;
	}

	let gesture: { id: number; px: number; py: number; ox: number; oy: number; moved: boolean } | null = null;

	function onDragDown(event: PointerEvent) {
		if (event.button !== 0 && event.pointerType === 'mouse') return;
		try {
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		} catch {
			/* Synthetic pointer: the drag still tracks while over the grip. */
		}
		// If a snap is mid-flight, freeze the window where it visually is so the
		// drag starts under the finger instead of jumping to the old corner.
		clearTimeout(settleTimer);
		if (shell && settling) {
			const computed = getComputedStyle(shell).transform;
			shell.classList.remove('settling');
			if (computed && computed !== 'none') {
				const matrix = new DOMMatrixReadOnly(computed);
				x = matrix.m41;
				y = matrix.m42;
			}
		}
		settling = false;
		docked = null;
		gesture = {
			id: event.pointerId,
			px: event.clientX,
			py: event.clientY,
			ox: x,
			oy: y,
			moved: false
		};
		pending = { x, y };
		dragging = true;
		if (dragFrame) cancelAnimationFrame(dragFrame);
		dragFrame = 0;
		event.preventDefault();
	}

	function onDragMove(event: PointerEvent) {
		if (!gesture || event.pointerId !== gesture.id) return;
		if (Math.abs(event.clientX - gesture.px) + Math.abs(event.clientY - gesture.py) > 3) {
			gesture.moved = true;
		}
		pending = clampPos(
			gesture.ox + (event.clientX - gesture.px),
			gesture.oy + (event.clientY - gesture.py)
		);
		// Coalesce pointer events into one paint so touch dragging stays smooth
		// even when the browser fires several moves per frame.
		if (!dragFrame) {
			dragFrame = requestAnimationFrame(() => {
				dragFrame = 0;
				applyTransform();
			});
		}
	}

	function endDrag(event?: PointerEvent) {
		if (!gesture) return;
		if (event && event.pointerId !== gesture.id) return;
		const moved = gesture.moved;
		gesture = null;
		dragging = false;
		if (dragFrame) {
			cancelAnimationFrame(dragFrame);
			dragFrame = 0;
		}
		applyTransform();
		x = pending.x;
		y = pending.y;
		if (moved) snapToNearestSide();
	}

	/** Pointer listeners live in an action so the aside keeps landmark semantics. */
	function dragSurface(node: HTMLElement) {
		node.addEventListener('pointerdown', onDragDown);
		node.addEventListener('pointermove', onDragMove);
		node.addEventListener('pointerup', endDrag);
		node.addEventListener('pointercancel', endDrag);
		return {
			destroy() {
				node.removeEventListener('pointerdown', onDragDown);
				node.removeEventListener('pointermove', onDragMove);
				node.removeEventListener('pointerup', endDrag);
				node.removeEventListener('pointercancel', endDrag);
			}
		};
	}

	function readInsets() {
		const probe = document.createElement('div');
		probe.style.cssText =
			'position:fixed;left:-9999px;top:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);';
		document.body.appendChild(probe);
		const style = getComputedStyle(probe);
		insets = {
			top: Number.parseFloat(style.paddingTop) || 0,
			bottom: Number.parseFloat(style.paddingBottom) || 0
		};
		probe.remove();
	}

	onMount(() => {
		syncViewport();
		readInsets();
		// Start just under the header on the right so the primary step action at
		// the bottom of the form stays tappable.
		const initial = clampPos(viewport.w - 172 - MARGIN, insets.top + DEFAULT_TOP);
		x = initial.x;
		y = initial.y;
		pending = initial;
		docked = 'right';
		ready = true;

		const onResize = () => {
			syncViewport();
			const clampNow = () => {
				const next = docked ? sidePos(docked) : clampPos(x, y);
				x = next.x;
				y = next.y;
			};
			clampNow();
			// One more pass after layout settles (mobile chrome, keyboard, rotation).
			requestAnimationFrame(clampNow);
		};
		window.addEventListener('resize', onResize);
		window.visualViewport?.addEventListener('resize', onResize);
		window.visualViewport?.addEventListener('scroll', onResize);
		const observer = new ResizeObserver(onResize);
		observer.observe(document.documentElement);
		if (shell) observer.observe(shell);
		// Some embedded browsers miss resize/observer events when the viewport is
		// resized. A cheap dimension check keeps the window in view either way.
		const watchdog = setInterval(() => {
			const vv = window.visualViewport;
			const w = Math.min(window.innerWidth, vv?.width ?? Number.POSITIVE_INFINITY);
			const h = Math.min(window.innerHeight, vv?.height ?? Number.POSITIVE_INFINITY);
			if (Math.abs(w - viewport.w) > 1 || Math.abs(h - viewport.h) > 1) onResize();
		}, 400);
		return () => {
			window.removeEventListener('resize', onResize);
			window.visualViewport?.removeEventListener('resize', onResize);
			window.visualViewport?.removeEventListener('scroll', onResize);
			observer.disconnect();
			clearInterval(watchdog);
			clearTimeout(settleTimer);
			if (dragFrame) cancelAnimationFrame(dragFrame);
		};
	});

	// Adding a stem can change the window height; keep it fully on screen.
	$effect(() => {
		flowers.length;
		viewport;
		if (!ready) return;
		void tick().then(() => {
			const next = docked ? sidePos(docked) : clampPos(x, y);
			x = next.x;
			y = next.y;
		});
	});
</script>

<aside
	bind:this={shell}
	use:portal
	use:dragSurface
	class="floating"
	class:dragging
	class:settling
	style="transform: translate3d({x}px, {y}px, 0); visibility: {ready ? 'visible' : 'hidden'};"
	aria-label="Floating bouquet preview"
>
	<div class="art">
		{#if flowers.length > 0}
			<BouquetBackground {background} />
			<Bouquet {flowers} {paper} greenery />
		{:else}
			<p class="empty">Pick a bloom and it will bloom here.</p>
		{/if}
	</div>
</aside>

<style>
	.floating {
		position: fixed;
		top: 0;
		left: 0;
		/* Above the sticky site header (60), below the first-load intro (100). */
		z-index: 95;
		width: 172px;
		display: flex;
		flex-direction: column;
		border: 1px solid rgb(25 17 16 / 0.2);
		border-radius: 14px;
		background: var(--color-paper);
		box-shadow: 0 18px 34px -18px rgb(25 17 16 / 0.45);
		-webkit-user-select: none;
		user-select: none;
		overscroll-behavior: contain;
		cursor: grab;
		/* The whole card is the drag surface, so swiping it must not scroll the page. */
		touch-action: none;
		transform-origin: center;
		transition:
			scale 150ms var(--ease-out),
			box-shadow 200ms ease;
	}

	/* Picked up: a small lift, like a call PiP held under the finger. */
	.floating.dragging {
		scale: 1.04;
		cursor: grabbing;
		border-color: rgb(25 17 16 / 0.3);
		box-shadow: 0 28px 48px -18px rgb(25 17 16 / 0.52);
		will-change: transform;
		transition:
			scale 120ms var(--ease-out),
			box-shadow 200ms ease;
	}

	/* Released: glide to the nearest edge, keeping the dropped height. */
	.floating.settling {
		transition:
			transform 300ms var(--ease-out),
			scale 150ms var(--ease-out),
			box-shadow 200ms ease;
	}

	@media (min-width: 980px) {
		.floating {
			display: none;
		}
	}

	.art {
		position: relative;
		isolation: isolate;
		padding: 0.3rem;
		margin: 0.1rem;
		border-radius: 10px;
		overflow: hidden;
	}

	.art :global(.bouquet) {
		position: relative;
		z-index: 1;
	}

	.empty {
		padding: 1.4rem 0.8rem;
		text-align: center;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--color-ink-faint);
	}

	@media (prefers-reduced-motion: reduce) {
		.floating,
		.floating.dragging,
		.floating.settling {
			transition: none;
		}
	}
</style>
