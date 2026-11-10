/**
 * Small, dependency-free motion primitives.
 *
 * These are Svelte actions so markup opts in with `use:` and stays declarative:
 * `use:magnet`, `use:tilt`, `use:spotlight`, `use:splitText`, `use:countUp`.
 * Every one of them bails out under `prefers-reduced-motion` and on coarse
 * pointers where the effect only makes sense with a cursor.
 */

const reduced = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const finePointer = () =>
	typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

type MagnetOptions = { strength?: number; scale?: number };

/** Pulls the element toward the cursor, then releases it with a soft spring. */
export function magnet(node: HTMLElement, options: MagnetOptions = {}) {
	const strength = options.strength ?? 10;
	const scale = options.scale ?? 0;

	if (!finePointer() || reduced()) {
		node.style.transform = scale ? `scale(${scale})` : '';
		return;
	}

	let frame = 0;
	let tx = 0;
	let ty = 0;

	const apply = () => {
		frame = 0;
		node.style.transform = `translate3d(${tx}px, ${ty}px, 0)${scale ? ` scale(${scale})` : ''}`;
	};

	const move = (event: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
		const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
		tx = Math.max(-1, Math.min(1, dx)) * strength;
		ty = Math.max(-1, Math.min(1, dy)) * strength * 0.7;
		node.style.transition = 'transform 120ms linear';
		if (!frame) frame = requestAnimationFrame(apply);
	};

	const leave = () => {
		tx = 0;
		ty = 0;
		node.style.transition = 'transform 620ms var(--ease-spring, cubic-bezier(.16,1.12,.28,1))';
		if (!frame) frame = requestAnimationFrame(apply);
	};

	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);

	return {
		destroy() {
			if (frame) cancelAnimationFrame(frame);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}

type TiltOptions = { max?: number; glare?: boolean };

/** Subtle 3D tilt plus a light position the element can paint as a sheen. */
export function tilt(node: HTMLElement, options: TiltOptions = {}) {
	const max = options.max ?? 6;

	if (!finePointer() || reduced()) return;

	let frame = 0;
	let rx = 0;
	let ry = 0;
	let mx = 50;
	let my = 50;

	const apply = () => {
		frame = 0;
		node.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
		node.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
		node.style.setProperty('--mx', `${mx}%`);
		node.style.setProperty('--my', `${my}%`);
	};

	const move = (event: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		const px = (event.clientX - rect.left) / rect.width;
		const py = (event.clientY - rect.top) / rect.height;
		mx = px * 100;
		my = py * 100;
		ry = (px - 0.5) * max * 2;
		rx = -(py - 0.5) * max * 2;
		node.classList.add('is-live');
		if (!frame) frame = requestAnimationFrame(apply);
	};

	const leave = () => {
		rx = 0;
		ry = 0;
		node.classList.remove('is-live');
		if (!frame) frame = requestAnimationFrame(apply);
	};

	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);

	return {
		destroy() {
			if (frame) cancelAnimationFrame(frame);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}

/** Tracks the cursor so `.spot` can paint a soft highlight under it. */
export function spotlight(node: HTMLElement) {
	if (!finePointer() || reduced()) return;

	let frame = 0;
	let x = 50;
	let y = 50;

	const apply = () => {
		frame = 0;
		node.style.setProperty('--mx', `${x}%`);
		node.style.setProperty('--my', `${y}%`);
	};

	const move = (event: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		x = ((event.clientX - rect.left) / rect.width) * 100;
		y = ((event.clientY - rect.top) / rect.height) * 100;
		if (!frame) frame = requestAnimationFrame(apply);
	};

	node.addEventListener('pointermove', move);

	return {
		destroy() {
			if (frame) cancelAnimationFrame(frame);
			node.removeEventListener('pointermove', move);
		}
	};
}

type SplitOptions = { delay?: number; step?: number };

/**
 * Masks each word so it can rise into place once the element is visible.
 * Text is preserved for assistive tech; the wrapping is purely cosmetic.
 */
export function splitText(node: HTMLElement, options: SplitOptions = {}) {
	const delay = options.delay ?? 0;
	const step = options.step ?? 55;
	const original = node.innerHTML;

	node.classList.add('split');

	if (reduced()) {
		node.classList.add('in');
		return {
			destroy() {
				node.innerHTML = original;
			}
		};
	}

	let index = 0;

	const wrap = (parent: Node) => {
		for (const child of Array.from(parent.childNodes)) {
			if (child.nodeType === Node.TEXT_NODE) {
				const text = child.textContent ?? '';
				if (!text.trim()) continue;
				const frag = document.createDocumentFragment();
				for (const chunk of text.split(/(\s+)/)) {
					if (!chunk.trim()) {
						frag.appendChild(document.createTextNode(chunk));
						continue;
					}
					const word = document.createElement('span');
					word.className = 'word';
					word.style.setProperty('--d', `${delay + index * step}ms`);
					const inner = document.createElement('span');
					inner.textContent = chunk;
					word.appendChild(inner);
					frag.appendChild(word);
					index += 1;
				}
				child.replaceWith(frag);
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				wrap(child);
			}
		}
	};

	wrap(node);

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				// Words rise in on entry and sink back behind the mask once the
				// heading leaves, in either direction, so scrolling up replays it.
				if (entry.isIntersecting) node.classList.add('in');
				else node.classList.remove('in');
			}
		},
		{ threshold: 0.2, rootMargin: '0px 0px -5% 0px' }
	);

	observer.observe(node);

	// Above the fold, observers can fire a frame late; make sure the headline
	// never sits empty while the fonts settle.
	requestAnimationFrame(() => {
		if (node.getBoundingClientRect().top < window.innerHeight * 0.85) node.classList.add('in');
	});

	return {
		destroy() {
			observer.disconnect();
			node.innerHTML = original;
		}
	};
}

type CountOptions = { to?: number; duration?: number; pad?: number };

/** Counts up to a number when it scrolls into view. */
export function countUp(node: HTMLElement, options: CountOptions = {}) {
	const to = options.to ?? Number(node.textContent) ?? 0;
	const duration = options.duration ?? 1200;

	if (reduced()) {
		node.textContent = String(to).padStart(options.pad ?? 0, '0');
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				observer.disconnect();
				const start = performance.now();
				const tick = (now: number) => {
					const t = Math.min(1, (now - start) / duration);
					const eased = 1 - Math.pow(1 - t, 3);
					node.textContent = String(Math.round(to * eased)).padStart(options.pad ?? 0, '0');
					if (t < 1) requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			}
		},
		{ threshold: 0.4 }
	);

	observer.observe(node);
	node.textContent = String(0).padStart(options.pad ?? 0, '0');

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
