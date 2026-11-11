/**
 * Scroll progress for a tall, sticky "stage" section.
 *
 * One shared passive listener and one rAF frame drive every registered section:
 * each writes `--p` (0 → 1) over its own scroll runway, so all the movement can
 * be expressed in CSS with `calc()` and stay on the compositor.
 */

type Options = {
	/** Called only when the value moves by a visible step. */
	onProgress?: (progress: number) => void;
	/** Extra scroll distance (px) before progress starts, e.g. a sticky header. */
	offset?: number;
};

type Entry = {
	node: HTMLElement;
	offset: number;
	onProgress?: (progress: number) => void;
	top: number;
	span: number;
	last: number;
};

const entries = new Set<Entry>();
let listening = false;
let frame = 0;

const reduced = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function paint() {
	frame = 0;
	const y = window.scrollY;
	for (const entry of entries) {
		const raw = entry.span > 0 ? (y - entry.top - entry.offset) / entry.span : 1;
		const p = Math.max(0, Math.min(1, raw));
		entry.node.style.setProperty('--p', p.toFixed(4));
		if (entry.onProgress && Math.abs(p - entry.last) > 0.04) {
			entry.last = p;
			entry.onProgress(p);
		}
	}
}

function schedule() {
	if (!frame) frame = requestAnimationFrame(paint);
}

function measureAll() {
	for (const entry of entries) {
		entry.top = entry.node.getBoundingClientRect().top + window.scrollY;
		entry.span = Math.max(1, entry.node.offsetHeight - window.innerHeight);
	}
	schedule();
}

function connect() {
	if (listening) return;
	listening = true;
	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', measureAll, { passive: true });
	window.addEventListener('orientationchange', measureAll, { passive: true });
	document.fonts?.ready.then(measureAll).catch(() => {});
}

function disconnect() {
	if (!listening) return;
	listening = false;
	window.removeEventListener('scroll', schedule);
	window.removeEventListener('resize', measureAll);
	window.removeEventListener('orientationchange', measureAll);
	if (frame) cancelAnimationFrame(frame);
	frame = 0;
}

export function scrollProgress(node: HTMLElement, options: Options = {}) {
	const entry: Entry = {
		node,
		offset: options.offset ?? 0,
		onProgress: options.onProgress,
		top: 0,
		span: 1,
		last: -1
	};

	if (reduced()) {
		node.style.setProperty('--p', '0.62');
		return;
	}

	entries.add(entry);
	connect();
	entry.top = node.getBoundingClientRect().top + window.scrollY;
	entry.span = Math.max(1, node.offsetHeight - window.innerHeight);
	schedule();

	return {
		update(next: Options = {}) {
			entry.offset = next.offset ?? entry.offset;
			entry.onProgress = next.onProgress ?? entry.onProgress;
			schedule();
		},
		destroy() {
			entries.delete(entry);
			node.style.removeProperty('--p');
			if (entries.size === 0) disconnect();
		}
	};
}
