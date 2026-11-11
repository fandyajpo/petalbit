type Options = { delay?: number; threshold?: number; once?: boolean };

/**
 * Scroll-linked reveal. Markup opts in with `class="reveal"`.
 *
 * Elements rise in from below (with a short blur) as they enter the viewport.
 * By default the animation runs once and the observer disconnects, so scrolling
 * back and forth never replays the same section.
 */
export function reveal(node: HTMLElement, options: Options = {}) {
	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('is-visible');
		return;
	}

	if (options.delay) node.style.setProperty('--reveal-delay', `${options.delay}ms`);

	const show = () => node.classList.add('is-visible');

	// Above the fold the observer can fire a frame late; paint the first screen
	// straight away so nothing sits blank while fonts settle.
	requestAnimationFrame(() => {
		if (node.getBoundingClientRect().top < window.innerHeight * 0.94) show();
	});

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				show();
				if (options.once !== false) {
					observer.unobserve(node);
					observer.disconnect();
				}
			}
		},
		{ threshold: options.threshold ?? 0.12, rootMargin: '0px 0px -6% 0px' }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
