type Options = { delay?: number; threshold?: number };

/**
 * Scroll-linked reveal. Markup opts in with `class="reveal"`.
 *
 * Elements rise in from below as they enter the viewport, and leave upward when
 * scrolling past them, so a long page keeps breathing instead of only animating
 * once. Reduced motion is handled in CSS.
 */
export function reveal(node: HTMLElement, options: Options = {}) {
	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('is-visible');
		return;
	}

	if (options.delay) node.style.setProperty('--reveal-delay', `${options.delay}ms`);

	const show = () => {
		node.classList.remove('is-past');
		node.classList.add('is-visible');
	};

	// Above the fold the observer can fire a frame late; paint the first screen
	// straight away so nothing sits blank while fonts settle.
	requestAnimationFrame(() => {
		if (node.getBoundingClientRect().top < window.innerHeight * 0.94) show();
	});

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					show();
					continue;
				}

				const wasVisible = node.classList.contains('is-visible');
				if (!wasVisible) continue;

				if (entry.boundingClientRect.top < 0) {
					// Left through the top: animate out in the direction of travel.
					node.classList.add('is-past');
					node.classList.remove('is-visible');
				} else {
					// Left through the bottom (scrolling back up): reset for re-entry.
					node.classList.remove('is-visible', 'is-past');
				}
			}
		},
		{ threshold: options.threshold ?? 0, rootMargin: '0px 0px -6% 0px' }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
