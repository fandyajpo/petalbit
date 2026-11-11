import { animate, stagger } from 'motion';

export function reducedMotion() {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const springs = {
	gentle: [0.22, 1, 0.36, 1] as const,
	bouncy: [0.34, 1.56, 0.64, 1] as const,
	soft: [0.25, 1, 0.5, 1] as const
};

/** Enter with a soft lift + blur fade. */
export function mEnter(
	node: HTMLElement,
	opts: { y?: number; x?: number; scale?: number; blur?: number; delay?: number; duration?: number } = {}
) {
	if (reducedMotion()) return;
	const { y = 18, x = 0, scale = 0.985, blur = 6, delay = 0, duration = 0.55 } = opts;
	node.style.willChange = 'transform, opacity, filter';
	const controls = animate(
		node,
		{
			opacity: [0, 1],
			transform: [`translate3d(${x}px, ${y}px, 0) scale(${scale})`, 'translate3d(0, 0, 0) scale(1)'],
			filter: [`blur(${blur}px)`, 'blur(0px)']
		},
		{ duration, delay, ease: springs.gentle }
	);
	controls.finished.finally(() => {
		node.style.removeProperty('will-change');
		node.style.removeProperty('filter');
	});
	return { destroy() { controls.stop(); } };
}

/** Stagger-animate matching children on mount. */
export function mStagger(
	node: HTMLElement,
	opts: { selector?: string; y?: number; x?: number; scale?: number; step?: number; delay?: number } = {}
) {
	if (reducedMotion()) return;
	const { selector = ':scope > *', y = 16, x = 0, scale = 0.985, step = 0.045, delay = 0 } = opts;
	const items = Array.from(node.querySelectorAll<HTMLElement>(selector));
	if (!items.length) return;
	for (const item of items) {
		item.style.opacity = '0';
		item.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
	}
	const controls = animate(
		items,
		{ opacity: [0, 1], transform: [`translate3d(${x}px, ${y}px, 0) scale(${scale})`, 'translate3d(0, 0, 0) scale(1)'] },
		{ duration: 0.5, delay: stagger(step, { startDelay: delay }), ease: springs.gentle }
	);
	return { destroy() { controls.stop(); } };
}

/** Playful hover/press micro-interaction for buttons/cards. */
export function mPress(
	node: HTMLElement,
	opts: { hoverScale?: number; pressScale?: number; lift?: number } = {}
) {
	if (reducedMotion()) return;
	const { hoverScale = 1.03, pressScale = 0.97, lift = -2 } = opts;

	const onEnter = () => {
		animate(node, { scale: hoverScale, y: lift }, { duration: 0.22, ease: springs.gentle });
	};
	const onLeave = () => {
		animate(node, { scale: 1, y: 0 }, { duration: 0.28, ease: springs.soft });
	};
	const onDown = () => {
		animate(node, { scale: pressScale, y: 0 }, { duration: 0.12, ease: springs.soft });
	};
	const onUp = () => {
		animate(node, { scale: hoverScale, y: lift }, { duration: 0.18, ease: springs.gentle });
	};

	node.addEventListener('pointerenter', onEnter);
	node.addEventListener('pointerleave', onLeave);
	node.addEventListener('pointerdown', onDown);
	node.addEventListener('pointerup', onUp);
	node.addEventListener('pointercancel', onLeave);

	return {
		destroy() {
			node.removeEventListener('pointerenter', onEnter);
			node.removeEventListener('pointerleave', onLeave);
			node.removeEventListener('pointerdown', onDown);
			node.removeEventListener('pointerup', onUp);
			node.removeEventListener('pointercancel', onLeave);
		}
	};
}

/** Brief pop for selection/success feedback. */
export function mPop(node: HTMLElement) {
	if (reducedMotion()) return;
	animate(
		node,
		{ scale: [1, 1.08, 1], rotate: [0, -2.5, 0] },
		{ ease: springs.bouncy, duration: 0.42 }
	);
}

/** Shake for gentle validation feedback. */
export function mShake(node: HTMLElement) {
	if (reducedMotion()) return;
	animate(
		node,
		{ x: [0, -7, 6, -4, 3, 0] },
		{ duration: 0.42, ease: [0.36, 0.07, 0.19, 0.97] }
	);
}

/** Subtle pulse for live/success feedback. */
export function mPulse(node: HTMLElement) {
	if (reducedMotion()) return;
	animate(node, { scale: [1, 1.03, 1] }, { ease: springs.soft, duration: 0.5 });
}

/** Soft focus micro-interaction for inputs. */
export function mFocus(node: HTMLElement) {
	if (reducedMotion()) return;
	const onFocus = () => {
		animate(node, { scale: [1, 1.01, 1] }, { ease: springs.soft, duration: 0.28 });
	};
	node.addEventListener('focus', onFocus);
	return {
		destroy() {
			node.removeEventListener('focus', onFocus);
		}
	};
}

/** Animate a progress bar width smoothly. */
export function mProgress(node: HTMLElement, value: number) {
	const set = (v: number) => {
		if (reducedMotion()) {
			node.style.transform = `scaleX(${v})`;
			return;
		}
		animate(node, { scaleX: v }, { ease: springs.gentle, duration: 0.5 });
	};
	node.style.transformOrigin = 'left center';
	set(value);
	return {
		update(v: number) {
			set(v);
		}
	};
}

/** Directional step entrance: pass 1 for forward, -1 for back. */
export function mStep(node: HTMLElement, dir: number = 1) {
	if (reducedMotion()) return;
	const fromX = dir >= 0 ? 34 : -34;
	node.style.willChange = 'transform, opacity, filter';
	const controls = animate(
		node,
		{
			opacity: [0, 1],
			transform: [`translate3d(${fromX}px, 10px, 0) scale(0.992)`, 'translate3d(0,0,0) scale(1)'],
			filter: ['blur(5px)', 'blur(0px)']
		},
		{ duration: 0.5, ease: springs.gentle }
	);
	controls.finished.finally(() => {
		node.style.removeProperty('will-change');
		node.style.removeProperty('filter');
	});
	return { destroy() { controls.stop(); } };
}
