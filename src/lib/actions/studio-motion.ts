/**
 * Motion helpers, built on the Web Animations API.
 *
 * These used to wrap `motion`, which was only ever reached through this file —
 * and cost every route that imports it ~34 kB gzip for nine small helpers.
 * WAAPI does the same work natively, so the exports keep their names and
 * signatures and none of the 50-odd call sites change.
 *
 * Two behaviours have to be preserved deliberately:
 *
 * - Finishing must *stay* finished. WAAPI defaults to `fill: "none"`, which
 *   snaps an element back to its pre-animation state. `mStagger` pre-hides its
 *   children, so a naive port would blink them in and then leave them
 *   invisible. Every entrance here commits its final value as inline styles.
 * - A new hover/press has to start from wherever the last one stopped instead
 *   of from the keyframe's literal value, or moving the pointer quickly across
 *   a button visibly jumps. `glide` reads the current computed transform
 *   first, which includes the position of an animation still in flight.
 */

export function reducedMotion() {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const springs = {
	gentle: [0.22, 1, 0.36, 1] as const,
	bouncy: [0.34, 1.56, 0.64, 1] as const,
	soft: [0.25, 1, 0.5, 1] as const
};

type Spring = readonly [number, number, number, number];

/** Springs are cubic-bézier control points, which WAAPI takes verbatim. */
const ease = (spring: Spring) => `cubic-bezier(${spring.join(', ')})`;

const IDENTITY = 'translate3d(0, 0, 0) scale(1)';

/** Live animation per node, so a newer gesture can replace the older one. */
const running = new WeakMap<HTMLElement, Animation>();

function stop(node: HTMLElement) {
	const animation = running.get(node);
	if (!animation) return;
	running.delete(node);
	animation.cancel();
}

/**
 * Run an animation, then freeze its final values into inline styles and drop
 * the animation so it stops holding a compositor layer.
 *
 * `fill: forwards` keeps the element visible while the promise settles; the
 * committed inline styles are what make the end state permanent.
 */
function play(
	node: HTMLElement,
	keyframes: Keyframe[],
	options: KeyframeAnimationOptions,
	commit?: () => void
): Animation {
	stop(node);
	const animation = node.animate(keyframes, { fill: 'forwards', ...options });
	running.set(node, animation);

	animation.finished
		.then(() => {
			commit?.();
			animation.cancel();
			if (running.get(node) === animation) running.delete(node);
		})
		// Cancelling — on destroy, or when a newer gesture takes over — rejects
		// `finished`. Without this catch that is an unhandled rejection per event.
		.catch(() => {});

	return animation;
}

/** An element's transform right now, including any animation mid-flight. */
function currentTransform(node: HTMLElement): string {
	const value = getComputedStyle(node).transform;
	return !value || value === 'none' ? IDENTITY : value;
}

/** Glide to a transform, starting from wherever the element currently is. */
function glide(node: HTMLElement, target: string, duration: number, spring: Spring) {
	const from = currentTransform(node);
	play(node, [{ transform: from }, { transform: target }], { duration, easing: ease(spring) }, () => {
		node.style.transform = target;
	});
}

/** Drop the hint layers an entrance added once it has landed. */
function settle(node: HTMLElement) {
	node.style.removeProperty('will-change');
	node.style.removeProperty('filter');
}

/** Enter with a soft lift + blur fade. */
export function mEnter(
	node: HTMLElement,
	opts: { y?: number; x?: number; scale?: number; blur?: number; delay?: number; duration?: number } = {}
) {
	if (reducedMotion()) return;
	const { y = 18, x = 0, scale = 0.985, blur = 6, delay = 0, duration = 0.55 } = opts;
	node.style.willChange = 'transform, opacity, filter';

	const animation = play(
		node,
		[
			{
				opacity: 0,
				transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				filter: `blur(${blur}px)`
			},
			{ opacity: 1, transform: IDENTITY, filter: 'blur(0px)' }
		],
		{ duration: duration * 1000, delay: delay * 1000, easing: ease(springs.gentle) },
		() => {
			node.style.opacity = '1';
			node.style.transform = IDENTITY;
			settle(node);
		}
	);

	return {
		destroy() {
			animation.cancel();
		}
	};
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

	const from = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
	for (const item of items) {
		item.style.opacity = '0';
		item.style.transform = from;
	}

	const animations = items.map((item, index) =>
		play(
			item,
			[
				{ opacity: 0, transform: from },
				{ opacity: 1, transform: IDENTITY }
			],
			{
				duration: 500,
				delay: (delay + index * step) * 1000,
				easing: ease(springs.gentle)
			},
			() => {
				item.style.opacity = '1';
				item.style.transform = IDENTITY;
			}
		)
	);

	return {
		destroy() {
			for (const animation of animations) animation.cancel();
		}
	};
}

/** Playful hover/press micro-interaction for buttons/cards. */
export function mPress(
	node: HTMLElement,
	opts: { hoverScale?: number; pressScale?: number; lift?: number } = {}
) {
	if (reducedMotion()) return;
	const { hoverScale = 1.03, pressScale = 0.97, lift = -2 } = opts;

	const hover = `translate3d(0, ${lift}px, 0) scale(${hoverScale})`;

	const onEnter = () => glide(node, hover, 220, springs.gentle);
	const onLeave = () => glide(node, IDENTITY, 280, springs.soft);
	const onDown = () => glide(node, `translate3d(0, 0, 0) scale(${pressScale})`, 120, springs.soft);
	const onUp = () => glide(node, hover, 180, springs.gentle);

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
			stop(node);
		}
	};
}

/** Brief pop for selection/success feedback. */
export function mPop(node: HTMLElement) {
	if (reducedMotion()) return;
	play(
		node,
		[
			{ transform: 'scale(1)' },
			{ transform: 'scale(1.08) rotate(-2.5deg)' },
			{ transform: 'scale(1)' }
		],
		{ duration: 420, easing: ease(springs.bouncy) }
	);
}

/** Shake for gentle validation feedback. */
export function mShake(node: HTMLElement) {
	if (reducedMotion()) return;
	const frames = [0, -7, 6, -4, 3, 0].map((x) => ({ transform: `translate3d(${x}px, 0, 0)` }));
	play(node, frames, { duration: 420, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' });
}

/** Subtle pulse for live/success feedback. */
export function mPulse(node: HTMLElement) {
	if (reducedMotion()) return;
	play(
		node,
		[{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
		{ duration: 500, easing: ease(springs.soft) }
	);
}

/** Soft focus micro-interaction for inputs. */
export function mFocus(node: HTMLElement) {
	if (reducedMotion()) return;
	const onFocus = () => {
		play(
			node,
			[{ transform: 'scale(1)' }, { transform: 'scale(1.01)' }, { transform: 'scale(1)' }],
			{ duration: 280, easing: ease(springs.soft) }
		);
	};
	node.addEventListener('focus', onFocus);
	return {
		destroy() {
			node.removeEventListener('focus', onFocus);
			stop(node);
		}
	};
}

/** Animate a progress bar width smoothly. */
export function mProgress(node: HTMLElement, value: number) {
	node.style.transformOrigin = 'left center';
	const set = (v: number) => {
		const target = `scaleX(${v})`;
		if (reducedMotion()) {
			node.style.transform = target;
			return;
		}
		glide(node, target, 500, springs.gentle);
	};
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

	const animation = play(
		node,
		[
			{
				opacity: 0,
				transform: `translate3d(${fromX}px, 10px, 0) scale(0.992)`,
				filter: 'blur(5px)'
			},
			{ opacity: 1, transform: IDENTITY, filter: 'blur(0px)' }
		],
		{ duration: 500, easing: ease(springs.gentle) },
		() => {
			node.style.opacity = '1';
			node.style.transform = IDENTITY;
			settle(node);
		}
	);

	return {
		destroy() {
			animation.cancel();
		}
	};
}
