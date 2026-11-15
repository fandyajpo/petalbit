<script lang="ts">
	/**
	 * Site-wide sound layer. One delegated listener gives every link, button,
	 * tab and control its click, so individual components stay sound-free.
	 * Opt out with `data-sound="none"`, or pick a specific voice with
	 * `data-sound="select" | "remove" | "paper" | "pop" | "success" | "error"`.
	 */
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { getSoundOn, playSound } from '$lib/sound';

	const INTERACTIVE =
		'a[href], button, [role="button"], summary, input[type="checkbox"], input[type="radio"], select, [data-sound]';

	let firstNavigation = true;
	let lastKey = 0;

	function soundFor(el: HTMLElement): string | null {
		const custom = el.dataset.sound;
		if (custom === 'none') return null;
		if (custom) return custom;
		if (el.matches('input[type="checkbox"], input[type="radio"], select')) return 'pop';
		return 'tap';
	}

	function block(el: HTMLElement | null): boolean {
		if (!el) return true;
		if (el.closest('[data-sound="none"]')) return true;
		if (el.hasAttribute('disabled')) return true;
		if (el.getAttribute('aria-disabled') === 'true') return true;
		return false;
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0 || event.pointerType === 'mouse' && event.buttons !== 1) return;
		if (!getSoundOn()) return;
		const target = event.target as HTMLElement | null;
		const el = target?.closest<HTMLElement>(INTERACTIVE) ?? null;
		if (block(el)) return;
		/* Text fields are handled by the keystroke sound instead. */
		if (el?.matches('input:not([type="checkbox"]):not([type="radio"]), textarea')) return;
		const kind = soundFor(el as HTMLElement);
		if (kind) playSound(kind);
	}

	function onChange(event: Event) {
		if (!getSoundOn()) return;
		const target = event.target as HTMLElement | null;
		if (!target?.matches('input[type="checkbox"], input[type="radio"], select')) return;
		if (block(target)) return;
		playSound('pop');
	}

	function onKeyDown(event: KeyboardEvent) {
		if (!getSoundOn()) return;
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (!target) return;
		const field =
			target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
				? target
				: null;
		if (!field || field.readOnly || field.disabled) return;
		if (field instanceof HTMLInputElement && ['checkbox', 'radio', 'range', 'file'].includes(field.type)) return;
		if (event.key.length !== 1 && event.key !== 'Backspace' && event.key !== 'Enter') return;
		const now = performance.now();
		if (now - lastKey < 45) return;
		lastKey = now;
		playSound('key');
	}

	afterNavigate(() => {
		if (firstNavigation) {
			firstNavigation = false;
			return;
		}
		playSound('page');
	});

	onMount(() => {
		window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
		window.addEventListener('change', onChange, { capture: true, passive: true });
		window.addEventListener('keydown', onKeyDown, { passive: true });

		return () => {
			window.removeEventListener('pointerdown', onPointerDown, { capture: true });
			window.removeEventListener('change', onChange, { capture: true });
			window.removeEventListener('keydown', onKeyDown);
		};
	});
</script>
