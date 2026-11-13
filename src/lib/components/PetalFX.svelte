<script lang="ts">
	import { onMount } from 'svelte';

	type Particle = {
		kind: 'burst' | 'trail';
		x: number;
		y: number;
		vx: number;
		vy: number;
		rot: number;
		spin: number;
		size: number;
		life: number;
		maxLife: number;
		image: HTMLImageElement;
		drift: number;
	};

	onMount(() => {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const canvas = document.createElement('canvas');
		canvas.setAttribute('aria-hidden', 'true');
		Object.assign(canvas.style, {
			position: 'fixed',
			inset: '0',
			width: '100%',
			height: '100%',
			pointerEvents: 'none',
			zIndex: '999'
		});
		document.body.appendChild(canvas);

		const surface = canvas.getContext('2d');
		if (!surface) {
			canvas.remove();
			return;
		}
		const ctx = surface;

		const images = ['/art/petal-1.png', '/art/petal-2.png', '/art/petal-3.png', '/art/petal-4.png'].map(
			(src) => {
				const image = new Image();
				image.src = src;
				return image;
			}
		);

		let particles: Particle[] = [];
		let frame = 0;
		let dpr = 1;

		function resize() {
			dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.round(window.innerWidth * dpr);
			canvas.height = Math.round(window.innerHeight * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		resize();

		function render() {
			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
			const alive: Particle[] = [];

			for (const p of particles) {
				p.life += 1;
				if (p.life > p.maxLife) continue;
				p.vy += p.kind === 'burst' ? 0.06 : 0.012;
				p.vx += p.drift;
				p.vx *= 0.995;
				p.x += p.vx;
				p.y += p.vy;
				p.rot += p.spin;

				const progress = p.life / p.maxLife;
				ctx.globalAlpha = Math.max(0, 1 - progress * progress);
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rot);
				ctx.drawImage(p.image, -p.size / 2, -p.size / 2, p.size, p.size * 1.16);
				ctx.restore();
				alive.push(p);
			}

			ctx.globalAlpha = 1;
			particles = alive;
			if (particles.length > 0) frame = requestAnimationFrame(render);
			else {
				frame = 0;
				ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
			}
		}

		function kick() {
			if (!frame) frame = requestAnimationFrame(render);
		}

		function burst() {
			if (reduce) return;
			const count = window.innerWidth < 640 ? 26 : 44;
			const cx = window.innerWidth / 2;
			const cy = window.innerHeight * 0.32;

			for (let i = 0; i < count; i += 1) {
				const angle = Math.random() * Math.PI * 2;
				const speed = 2.4 + Math.random() * 5.4;
				particles.push({
					kind: 'burst',
					x: cx + (Math.random() - 0.5) * 80,
					y: cy + (Math.random() - 0.5) * 40,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed - 2.2,
					rot: Math.random() * Math.PI,
					spin: (Math.random() - 0.5) * 0.18,
					size: 10 + Math.random() * 14,
					life: 0,
					maxLife: 90 + Math.random() * 45,
					image: images[i % images.length],
					drift: (Math.random() - 0.5) * 0.012
				});
			}
			kick();
		}

		let lastTrail = 0;
		function trail(event: PointerEvent) {
			if (reduce || event.pointerType !== 'mouse') return;
			if (!window.matchMedia('(hover: hover)').matches) return;
			const now = performance.now();
			if (now - lastTrail < 70) return;
			lastTrail = now;

			particles.push({
				kind: 'trail',
				x: event.clientX + (Math.random() - 0.5) * 10,
				y: event.clientY + (Math.random() - 0.5) * 8,
				vx: (Math.random() - 0.5) * 0.45,
				vy: 0.25 + Math.random() * 0.55,
				rot: Math.random() * Math.PI,
				spin: (Math.random() - 0.5) * 0.08,
				size: 5 + Math.random() * 6,
				life: 0,
				maxLife: 36 + Math.random() * 18,
				image: images[Math.floor(Math.random() * images.length)],
				drift: (Math.random() - 0.5) * 0.006
			});

			if (particles.filter((p) => p.kind === 'trail').length > 44) {
				const index = particles.findIndex((p) => p.kind === 'trail');
				if (index >= 0) particles.splice(index, 1);
			}
			kick();
		}

		const onResize = () => resize();
		const onCelebrate = () => burst();
		window.addEventListener('resize', onResize);
		window.addEventListener('pointermove', trail, { passive: true });
		window.addEventListener('petalbit:celebrate', onCelebrate);

		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('pointermove', trail);
			window.removeEventListener('petalbit:celebrate', onCelebrate);
			if (frame) cancelAnimationFrame(frame);
			canvas.remove();
		};
	});
</script>
