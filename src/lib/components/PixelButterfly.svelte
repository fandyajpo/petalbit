<script lang="ts">
	import { onMount } from 'svelte';

	type RGB = [number, number, number];
	type Vec = { x: number; y: number };
	type Mode = 'cruise' | 'dart' | 'hover';
	type Butterfly = {
		pos: Vec;
		vel: Vec;
		target: Vec;
		heading: number;
		mode: Mode;
		modeTimer: number;
		flapPhase: number;
		flapRate: number;
		seed: number;
		time: number;
	};
	type Sprite = { left: HTMLCanvasElement; right: HTMLCanvasElement; body: HTMLCanvasElement };
	type Palette = {
		ink: RGB;
		ring1: RGB;
		ring2: RGB;
		ring3: RGB;
		glow: RGB;
		spot: RGB;
		body: RGB;
		outline: RGB;
		bodyDark: RGB;
	};
	type Flock = { sprite: Sprite; butterfly: Butterfly; scale: number };

	const MONARCH: Palette = {
		ink: [34, 22, 12],
		ring1: [154, 64, 24],
		ring2: [214, 104, 40],
		ring3: [244, 146, 66],
		glow: [255, 186, 112],
		spot: [255, 232, 190],
		body: [62, 40, 22],
		outline: [38, 24, 14],
		bodyDark: [112, 74, 40]
	};

	const ROSE: Palette = {
		ink: [46, 16, 24],
		ring1: [109, 29, 41],
		ring2: [173, 54, 72],
		ring3: [223, 154, 166],
		glow: [255, 205, 212],
		spot: [255, 240, 238],
		body: [74, 30, 38],
		outline: [46, 20, 26],
		bodyDark: [140, 62, 76]
	};

	const LILAC: Palette = {
		ink: [36, 28, 52],
		ring1: [74, 58, 104],
		ring2: [122, 98, 158],
		ring3: [154, 134, 174],
		glow: [226, 210, 242],
		spot: [248, 242, 256],
		body: [58, 46, 78],
		outline: [40, 32, 58],
		bodyDark: [116, 98, 148]
	};

	const SPECS: { palette: Palette; fx: number; fy: number; scale: number }[] = [
		{ palette: MONARCH, fx: 0.28, fy: 0.38, scale: 1 },
		{ palette: ROSE, fx: 0.6, fy: 0.64, scale: 0.92 },
		{ palette: LILAC, fx: 0.78, fy: 0.26, scale: 1.05 }
	];

	const VEINS = [-1.15, -0.85, -0.55, -0.28, 0.02, 0.32, 0.62];
	const WING_SPOTS: [number, number][] = [
		[20, -0.95],
		[22, -0.62],
		[18, -1.18],
		[15, 0.38],
		[18, 0.66],
		[11, -0.18]
	];

	function rgb(color: RGB): string {
		return `rgb(${color[0]} ${color[1]} ${color[2]})`;
	}

	function shade(color: RGB, amount: number): RGB {
		return [
			Math.round(color[0] * amount),
			Math.round(color[1] * amount),
			Math.round(color[2] * amount)
		];
	}

	function noise(x: number, y: number): number {
		const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
		return value - Math.floor(value);
	}

	function angleDelta(a: number, b: number): number {
		return Math.atan2(Math.sin(a - b), Math.cos(a - b));
	}

	/** Normalised distance from an ellipse; <= 1 is inside. */
	function ellipse(px: number, py: number, cx: number, cy: number, rx: number, ry: number, rot: number) {
		const cos = Math.cos(rot);
		const sin = Math.sin(rot);
		const dx = px - cx;
		const dy = py - cy;
		const x = dx * cos + dy * sin;
		const y = -dx * sin + dy * cos;
		return (x * x) / (rx * rx) + (y * y) / (ry * ry);
	}

	function wingShape(x: number, y: number): boolean {
		return (
			ellipse(x, y, 17, -12, 20, 12, -0.4) <= 1 || ellipse(x, y, 12, 6, 15, 11, 0.3) <= 1
		);
	}

	/** Colour one wing pixel for the given palette, or null for transparent. */
	function wingColor(x: number, y: number, palette: Palette): RGB | null {
		if (!wingShape(x, y)) return null;
		if (!wingShape(x - 1, y) || !wingShape(x + 1, y) || !wingShape(x, y - 1) || !wingShape(x, y + 1)) {
			return palette.ink;
		}

		const dist = Math.hypot(x, y);
		const angle = Math.atan2(y, x);
		const upper = ellipse(x, y, 17, -12, 20, 12, -0.4);
		const lower = ellipse(x, y, 12, 6, 15, 11, 0.3);
		let color: RGB = dist < 9 ? palette.ring1 : dist < 17 ? palette.ring2 : palette.ring3;

		if (dist > 5 && VEINS.some((vein) => Math.abs(angleDelta(angle, vein)) < 0.028)) {
			return shade(palette.ink, 1.15);
		}

		const band = (dist - 6) % 6.5;
		if (dist > 8 && band >= 0 && band < 0.6) color = shade(color, 0.84);

		for (const [spotDist, spotAngle] of WING_SPOTS) {
			if (Math.abs(dist - spotDist) < 1.4 && Math.abs(angleDelta(angle, spotAngle)) < 0.1) {
				return palette.spot;
			}
		}

		if (lower <= 1 && upper > 1) color = shade(color, 0.92);
		if (y < -4 && noise(x, y) > 0.87) color = palette.glow;
		if (dist > 23 && noise(x, y) > 0.55) color = shade(color, 1.12);
		if (noise(x, y) > 0.94) color = shade(color, 0.9);

		return color;
	}

	function createWing(palette: Palette): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = 40;
		canvas.height = 56;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		const image = ctx.createImageData(40, 56);
		for (let y = 0; y < 56; y += 1) {
			for (let x = 0; x < 40; x += 1) {
				const color = wingColor(x + 0.5, y + 0.5 - 28, palette);
				if (!color) continue;
				const i = (y * 40 + x) * 4;
				image.data[i] = color[0];
				image.data[i + 1] = color[1];
				image.data[i + 2] = color[2];
				image.data[i + 3] = 255;
			}
		}
		ctx.putImageData(image, 0, 0);
		return canvas;
	}

	function mirror(source: HTMLCanvasElement): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = 40;
		canvas.height = 56;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.translate(40, 0);
		ctx.scale(-1, 1);
		ctx.drawImage(source, 0, 0);
		return canvas;
	}

	function createBody(palette: Palette): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = 30;
		canvas.height = 64;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		const pixel = (x: number, y: number, color: RGB) => {
			ctx.fillStyle = rgb(color);
			ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
		};
		const line = (x1: number, y1: number, x2: number, y2: number, color: RGB) => {
			const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
			for (let s = 0; s <= steps; s += 1) {
				const t = steps === 0 ? 0 : s / steps;
				pixel(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, color);
			}
		};

		for (let y = 38; y <= 56; y += 1) {
			const t = (y - 38) / 18;
			const radius = Math.max(1, Math.round(4 - t * 2.6));
			for (let x = 15 - radius; x <= 15 + radius; x += 1) {
				const edge = x === 15 - radius || x === 15 + radius || y === 56;
				pixel(x, y, edge ? palette.outline : y % 4 === 0 ? palette.bodyDark : palette.body);
			}
		}

		for (let y = 26; y <= 38; y += 1) {
			const radius = y < 29 || y > 35 ? 4 : 5;
			for (let x = 15 - radius; x <= 15 + radius; x += 1) {
				const edge = x === 15 - radius || x === 15 + radius;
				pixel(x, y, edge ? palette.outline : noise(x, y) > 0.7 ? palette.bodyDark : palette.body);
			}
		}

		for (let y = 17; y <= 26; y += 1) {
			const radius = y < 19 || y > 24 ? 2 : 4;
			for (let x = 15 - radius; x <= 15 + radius; x += 1) {
				pixel(x, y, x === 15 - radius || x === 15 + radius ? palette.outline : palette.body);
			}
		}

		pixel(13, 20, palette.spot);
		pixel(17, 20, palette.spot);
		pixel(13, 21, palette.outline);
		pixel(17, 21, palette.outline);
		line(14, 18, 11, 11, palette.outline);
		line(16, 18, 19, 11, palette.outline);
		line(11, 29, 6, 35, palette.outline);
		line(10, 33, 5, 41, palette.outline);
		line(11, 37, 7, 45, palette.outline);
		line(19, 29, 24, 35, palette.outline);
		line(20, 33, 25, 41, palette.outline);
		line(19, 37, 23, 45, palette.outline);

		return canvas;
	}

	function createSprite(palette: Palette): Sprite | null {
		const right = createWing(palette);
		if (!right) return null;
		const left = mirror(right);
		const body = createBody(palette);
		if (!left || !body) return null;
		return { left, right, body };
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function createButterfly(width: number, height: number, fx: number, fy: number): Butterfly {
		return {
			pos: { x: width * fx, y: height * fy },
			vel: { x: 18, y: -6 },
			target: { x: width * 0.7, y: height * 0.3 },
			heading: Math.PI / 2,
			mode: 'cruise',
			modeTimer: 1.5,
			flapPhase: Math.random() * Math.PI * 2,
			flapRate: 9,
			seed: Math.random() * 1000,
			time: Math.random() * 10
		};
	}

	function validTarget(width: number, height: number) {
		return { x: Math.max(64, width - 64), y: Math.max(64, height - 64) };
	}

	function pickTarget(pos: Vec, width: number, height: number, minDistance: number): Vec {
		const max = validTarget(width, height);
		let target = { x: pos.x, y: pos.y };
		for (let attempt = 0; attempt < 9; attempt += 1) {
			target = {
				x: 64 + Math.random() * (max.x - 64),
				y: 64 + Math.random() * (max.y - 64)
			};
			if (Math.hypot(target.x - pos.x, target.y - pos.y) >= minDistance) break;
		}
		return target;
	}

	function chooseMode(butterfly: Butterfly, width: number, height: number) {
		const roll = Math.random();
		butterfly.mode = roll < 0.18 ? 'dart' : roll < 0.42 ? 'hover' : 'cruise';
		butterfly.modeTimer = 2 + Math.random() * 4;

		if (butterfly.mode === 'hover') {
			butterfly.modeTimer = 1.4 + Math.random() * 2.4;
			butterfly.target = {
				x: clamp(butterfly.pos.x + (Math.random() - 0.5) * 90, 64, Math.max(64, width - 64)),
				y: clamp(butterfly.pos.y + (Math.random() - 0.5) * 90, 64, Math.max(64, height - 64))
			};
			butterfly.flapRate = 12.5;
			return;
		}

		butterfly.flapRate = butterfly.mode === 'dart' ? 11 : 8.6 + Math.random() * 1.8;
		butterfly.target = pickTarget(
			butterfly.pos,
			width,
			height,
			butterfly.mode === 'dart' ? 190 : 110
		);
	}

	function update(butterfly: Butterfly, dt: number, width: number, height: number) {
		butterfly.time += dt;
		butterfly.modeTimer -= dt;

		const dx = butterfly.target.x - butterfly.pos.x;
		const dy = butterfly.target.y - butterfly.pos.y;
		const distance = Math.hypot(dx, dy);

		if (butterfly.modeTimer <= 0) {
			chooseMode(butterfly, width, height);
		} else if (distance < 26 && butterfly.mode !== 'hover') {
			butterfly.target = pickTarget(butterfly.pos, width, height, 110);
		}

		const targetSpeed = butterfly.mode === 'hover' ? 0 : butterfly.mode === 'dart' ? 185 : 96;
		const toX = butterfly.target.x - butterfly.pos.x;
		const toY = butterfly.target.y - butterfly.pos.y;
		const length = Math.hypot(toX, toY) || 1;
		const desiredX = (toX / length) * targetSpeed;
		const desiredY = (toY / length) * targetSpeed;
		const steering = butterfly.mode === 'dart' ? 3.2 : butterfly.mode === 'hover' ? 2.4 : 1.8;
		const blend = Math.min(1, steering * dt);

		butterfly.vel.x += (desiredX - butterfly.vel.x) * blend;
		butterfly.vel.y += (desiredY - butterfly.vel.y) * blend;

		const wander =
			(Math.sin(butterfly.time * 1.31 + butterfly.seed) +
				Math.sin(butterfly.time * 0.47 + butterfly.seed * 2.1)) *
			16;
		butterfly.vel.x += Math.cos(butterfly.time * 0.83 + butterfly.seed) * wander * dt;
		butterfly.vel.y += Math.sin(butterfly.time * 0.61 + butterfly.seed * 1.7) * wander * dt;

		if (butterfly.pos.x < 92) butterfly.vel.x += ((92 - butterfly.pos.x) / 92) * 230 * dt;
		if (butterfly.pos.x > width - 92) {
			butterfly.vel.x -= ((butterfly.pos.x - (width - 92)) / 92) * 230 * dt;
		}
		if (butterfly.pos.y < 92) butterfly.vel.y += ((92 - butterfly.pos.y) / 92) * 230 * dt;
		if (butterfly.pos.y > height - 92) {
			butterfly.vel.y -= ((butterfly.pos.y - (height - 92)) / 92) * 230 * dt;
		}

		const speed = Math.hypot(butterfly.vel.x, butterfly.vel.y);
		const maxSpeed = butterfly.mode === 'dart' ? 215 : 132;
		if (speed > maxSpeed) {
			butterfly.vel.x = (butterfly.vel.x / speed) * maxSpeed;
			butterfly.vel.y = (butterfly.vel.y / speed) * maxSpeed;
		}

		butterfly.pos.x = clamp(butterfly.pos.x + butterfly.vel.x * dt, 54, Math.max(54, width - 54));
		butterfly.pos.y = clamp(butterfly.pos.y + butterfly.vel.y * dt, 54, Math.max(54, height - 54));

		if (speed > 9) {
			butterfly.heading +=
				angleDelta(Math.atan2(butterfly.vel.y, butterfly.vel.x), butterfly.heading) * Math.min(1, 4 * dt);
		}
		butterfly.flapPhase += dt * butterfly.flapRate * Math.PI * 2;
	}

	function draw(
		ctx: CanvasRenderingContext2D,
		sprite: Sprite,
		butterfly: Butterfly,
		scale: number
	) {
		const flap = Math.cos(butterfly.flapPhase);
		const wingX = 0.24 + 0.76 * (0.5 + 0.5 * flap);
		const wingY = 0.84 + 0.16 * (0.5 + 0.5 * flap);
		const lift = (1 - wingX) * -2.4;

		ctx.save();
		ctx.translate(butterfly.pos.x, butterfly.pos.y + lift);
		ctx.rotate(butterfly.heading + Math.PI / 2);
		ctx.scale(scale, scale);

		ctx.save();
		ctx.scale(wingX, wingY);
		ctx.drawImage(sprite.left, -40, -28);
		ctx.restore();

		ctx.save();
		ctx.scale(wingX, wingY);
		ctx.drawImage(sprite.right, 0, -28);
		ctx.restore();

		ctx.drawImage(sprite.body, -15, -30);
		ctx.restore();
	}

	let host = $state<HTMLDivElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);

	onMount(() => {
		const field = host;
		const surface = canvas;
		if (!field || !surface) return;

		const ctx = surface.getContext('2d');
		if (!ctx) return;

		const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		let reduced = motionQuery.matches;
		let width = 0;
		let height = 0;
		let scale = 1;
		let raf = 0;
		let last = 0;
		let running = false;
		let onScreen = false;

		const flock: Flock[] = [];

		const measure = () => {
			const rect = field.getBoundingClientRect();
			width = Math.max(1, Math.round(rect.width));
			height = Math.max(1, Math.round(rect.height));
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			surface.width = Math.round(width * dpr);
			surface.height = Math.round(height * dpr);
			surface.style.width = `${width}px`;
			surface.style.height = `${height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.imageSmoothingEnabled = false;

			scale = clamp(Math.min(width, height) / 560, 0.85, 1.15);
		};

		const clampAll = () => {
			for (const { butterfly } of flock) {
				butterfly.pos.x = clamp(butterfly.pos.x, 54, Math.max(54, width - 54));
				butterfly.pos.y = clamp(butterfly.pos.y, 54, Math.max(54, height - 54));
				butterfly.target.x = clamp(butterfly.target.x, 64, Math.max(64, width - 64));
				butterfly.target.y = clamp(butterfly.target.y, 64, Math.max(64, height - 64));
			}
		};

		const render = () => {
			ctx.clearRect(0, 0, width, height);
			for (const { sprite, butterfly, scale: localScale } of flock) {
				draw(ctx, sprite, butterfly, scale * localScale);
			}
		};

		const frame = (now: number) => {
			if (!running) return;
			const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
			last = now;
			for (const { butterfly } of flock) update(butterfly, dt, width, height);
			render();
			raf = requestAnimationFrame(frame);
		};

		const start = () => {
			if (running || reduced || !onScreen || document.hidden) return;
			running = true;
			last = 0;
			raf = requestAnimationFrame(frame);
		};

		const stop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		const drawResting = () => {
			stop();
			const spots = [
				{ x: 0.3, y: 0.36, heading: -0.55, flap: 0.7 },
				{ x: 0.62, y: 0.62, heading: 0.4, flap: 0.9 },
				{ x: 0.76, y: 0.28, heading: 2.2, flap: 0.55 }
			];
			flock.forEach(({ butterfly }, index) => {
				const spot = spots[index] ?? spots[0];
				butterfly.pos = { x: width * spot.x, y: height * spot.y };
				butterfly.heading = spot.heading;
				butterfly.flapPhase = spot.flap;
			});
			render();
		};

		measure();

		for (const spec of SPECS) {
			const sprite = createSprite(spec.palette);
			if (!sprite) continue;
			flock.push({
				sprite,
				butterfly: createButterfly(width, height, spec.fx, spec.fy),
				scale: spec.scale
			});
		}
		if (!flock.length) return;

		clampAll();
		if (reduced) drawResting();
		else render();

		const resizeObserver = new ResizeObserver(() => {
			measure();
			clampAll();
			if (reduced) drawResting();
			else render();
		});
		resizeObserver.observe(field);

		const intersectionObserver = new IntersectionObserver(
			(entries) => {
				onScreen = entries.some((entry) => entry.isIntersecting);
				if (onScreen) start();
				else stop();
			},
			{ threshold: 0.02 }
		);
		intersectionObserver.observe(field);

		const onVisibility = () => {
			if (document.hidden) stop();
			else start();
		};
		document.addEventListener('visibilitychange', onVisibility);

		const onMotionChange = () => {
			reduced = motionQuery.matches;
			if (reduced) drawResting();
			else start();
		};
		motionQuery.addEventListener?.('change', onMotionChange);

		if (!reduced) start();

		return () => {
			stop();
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			motionQuery.removeEventListener?.('change', onMotionChange);
		};
	});
</script>

<div class="butterfly-field" bind:this={host} aria-hidden="true">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.butterfly-field {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
