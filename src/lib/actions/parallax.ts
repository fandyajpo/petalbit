/**
 * Scroll parallax, shared and cheap.
 *
 * Every `use:parallax` element registers in one module-level set, and a single
 * passive scroll listener + one rAF frame moves all of them. Offsets are
 * measured once (and again on resize / after fonts settle) so the scroll handler
 * never calls `getBoundingClientRect` per element.
 *
 * The action only writes a `--parallax` custom property; each element's own
 * transform (rotation, base offset) stays in CSS, which keeps the work on the
 * compositor and leaves `prefers-reduced-motion` users with a static page.
 */

type Options = {
	/** Fraction of the scrolled distance. Negative drifts up, positive down. */
	speed?: number;
	/** Largest offset in pixels, so nothing flies off the screen. */
	max?: number;
};

type Entry = {
	node: HTMLElement;
	speed: number;
	max: number;
	/** Document offset of the element, measured with the drift reset to 0. */
	top: number;
	/** Scroll position at which the drift starts. */
	start: number;
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
		const raw = (y - entry.start) * entry.speed;
		const value = Math.max(-entry.max, Math.min(entry.max, raw));
		entry.node.style.setProperty('--parallax', `${value.toFixed(2)}px`);
	}
}

function schedule() {
	if (!frame) frame = requestAnimationFrame(paint);
}

function measure(entry: Entry) {
	entry.node.style.setProperty('--parallax', '0px');
	entry.top = entry.node.getBoundingClientRect().top + window.scrollY;
	/* Nothing moves while the element is still out of view, so a parallax
	   block never shows up pre-shifted from its laid-out position. */
	entry.start = Math.max(0, entry.top - window.innerHeight * 0.6);
}

function measureAll() {
	for (const entry of entries) measure(entry);
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

export function parallax(node: HTMLElement, options: Options = {}) {
	if (reduced()) return;

	const entry: Entry = {
		node,
		speed: options.speed ?? 0.12,
		max: options.max ?? 160,
		top: 0,
		start: 0
	};

	node.style.willChange = 'transform';
	entries.add(entry);
	connect();
	measure(entry);
	schedule();

	return {
		update(next: Options = {}) {
			entry.speed = next.speed ?? entry.speed;
			entry.max = next.max ?? entry.max;
			schedule();
		},
		destroy() {
			entries.delete(entry);
			node.style.removeProperty('--parallax');
			node.style.willChange = '';
			if (entries.size === 0) disconnect();
		}
	};
}
