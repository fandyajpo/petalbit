import { scroll } from 'motion';

/**
 * Scroll progress for a tall, sticky "stage" section.
 *
 * Motion's scroll observer drives `--p` (0 → 1) over the section's runway so
 * all movement can stay in CSS on the compositor. Where the browser supports
 * ScrollTimeline, Motion can run the tracking off the main thread for a
 * smoother feel on mobile.
 */

type Options = {
	/** Called only when the value moves by a visible step. */
	onProgress?: (progress: number) => void;
	/** Extra scroll distance (px) before progress starts, e.g. a sticky header. */
	offset?: number;
};

const reduced = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrollProgress(node: HTMLElement, options: Options = {}) {
	if (reduced()) {
		node.style.setProperty('--p', '0.62');
		options.onProgress?.(0.62);
		return;
	}

	let last = -1;
	let onProgress = options.onProgress;
	let offset = options.offset ?? 0;

	const apply = (raw: number) => {
		let p = raw;
		if (offset > 0) {
			const span = Math.max(1, node.offsetHeight - window.innerHeight);
			p = Math.max(0, Math.min(1, (raw * span - offset) / Math.max(1, span - offset)));
		}
		node.style.setProperty('--p', p.toFixed(4));
		if (onProgress && Math.abs(p - last) > 0.04) {
			last = p;
			onProgress(p);
		}
	};

	// 0 when the section top reaches the viewport top, 1 when its bottom
	// reaches the viewport bottom, matching the sticky runway.
	const stop = scroll((progress) => apply(progress), {
		target: node,
		offset: ['start start', 'end end']
	});

	return {
		update(next: Options = {}) {
			onProgress = next.onProgress ?? onProgress;
			offset = next.offset ?? offset;
		},
		destroy() {
			stop();
			node.style.removeProperty('--p');
		}
	};
}
