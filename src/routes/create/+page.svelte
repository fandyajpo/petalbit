<script lang="ts">
	import { page } from '$app/state';
	import Bouquet from '$lib/components/Bouquet.svelte';
	import CopyLink from '$lib/components/CopyLink.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { splitText } from '$lib/actions/motion';
	import {
		FLOWERS,
		MAX_BOUQUET_FLOWERS,
		STARTER_BOUQUETS,
		getFlower,
		isFlowerId
	} from '$lib/data/flowers';
	import { BOUQUET_TTL_SECONDS, fieldLimits } from '$lib/types';
	import { validateBouquet } from '$lib/validation';

	const steps = [
		{ n: 1, label: 'Pick flowers' },
		{ n: 2, label: 'Write your note' },
		{ n: 3, label: 'Send it' }
	] as const;

	const samples = [
		'Hope your day blooms as bright as this.',
		'Thanks for always being around, fr.',
		'Small but real, just like these flowers.'
	];

	function initialSelection(): string[] {
		const raw = page.url.searchParams.getAll('bunga').flatMap((value) => value.split(','));
		const unique = Array.from(new Set(raw.map((value) => value.trim()).filter(isFlowerId)));
		return unique.slice(0, MAX_BOUQUET_FLOWERS);
	}

	let step = $state<number>(1);
	let selected = $state<string[]>(initialSelection());
	let sender = $state('');
	let recipient = $state('');
	let message = $state('');
	let errors = $state<Record<string, string>>({});
	let submitting = $state(false);
	let serverError = $state('');
	let result = $state<{ id: string; url: string; expiresAt: string } | null>(null);

	const canAddMore = $derived(selected.length < MAX_BOUQUET_FLOWERS);
	const selectedFlowers = $derived(selected.flatMap((id) => getFlower(id) ?? []));
	const previewFor = $derived(recipient.trim() || 'Someone special');
	const previewFrom = $derived(sender.trim() || 'You');
	const atLimit = $derived(selected.length >= MAX_BOUQUET_FLOWERS);

	const expiryLabel = $derived(
		result
			? new Intl.DateTimeFormat('en-US', {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				}).format(new Date(result.expiresAt))
			: ''
	);

	function clearError(...keys: string[]) {
		if (!keys.some((key) => key in errors)) return;
		const next = { ...errors };
		for (const key of keys) delete next[key];
		errors = next;
	}

	function toggle(id: string) {
		if (result) return;
		if (selected.includes(id)) {
			selected = selected.filter((item) => item !== id);
			clearError('flowers');
			return;
		}
		if (!canAddMore) {
			errors = {
				...errors,
				flowers: `Max ${MAX_BOUQUET_FLOWERS} stems per bouquet. Drop one first to swap.`
			};
			return;
		}
		selected = [...selected, id];
		clearError('flowers');
	}

	function applyStarter(flowers: string[]) {
		selected = [...flowers].slice(0, MAX_BOUQUET_FLOWERS);
		clearError('flowers');
	}

	function isStarterActive(flowers: string[]) {
		return (
			flowers.length === selected.length && flowers.every((id) => selected.includes(id))
		);
	}

	function validateStepOne(): boolean {
		if (selected.length === 0) {
			errors = { ...errors, flowers: 'Pick at least one flower for your bouquet.' };
			return false;
		}
		clearError('flowers');
		return true;
	}

	function validateStepTwo(): boolean {
		const check = validateBouquet({ sender, recipient, message, flowers: selected });
		const keep: Record<string, string> = {};
		for (const key of ['sender', 'recipient', 'message']) {
			if (check.errors[key]) keep[key] = check.errors[key];
		}
		errors = keep;
		return Object.keys(keep).length === 0;
	}

	function scrollToStudio() {
		if (typeof window === 'undefined') return;
		const el = document.getElementById('studio');
		if (!el) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const top = el.getBoundingClientRect().top + window.scrollY - 78;
		window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
	}

	function goTo(next: number) {
		if (next < 1 || next > 3 || next > step) return;
		step = next;
		serverError = '';
		scrollToStudio();
	}

	function next() {
		if (step === 1) {
			if (!validateStepOne()) {
				scrollToStudio();
				return;
			}
			step = 2;
			scrollToStudio();
			return;
		}
		if (step === 2) {
			if (!validateStepTwo()) {
				scrollToStudio();
				return;
			}
			step = 3;
			scrollToStudio();
		}
	}

	async function submit() {
		if (submitting || result) return;
		const check = validateBouquet({ sender, recipient, message, flowers: selected });
		if (!check.success) {
			errors = check.errors;
			if (check.errors.flowers) step = 1;
			else if (check.errors.sender || check.errors.recipient || check.errors.message) step = 2;
			scrollToStudio();
			return;
		}

		submitting = true;
		serverError = '';

		try {
			const response = await fetch('/api/bouquets', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ sender, recipient, message, flowers: selected })
			});
			const data = await response.json().catch(() => null);

			if (!response.ok || !data?.id) {
				if (data?.errors) errors = data.errors;
				serverError =
					data?.message ?? 'Could not make your bouquet rn. Try again in a sec.';
				if (data?.errors?.flowers) step = 1;
				scrollToStudio();
				return;
			}

			const createdAt = new Date(data.bouquet?.createdAt ?? Date.now()).getTime();
			result = {
				id: data.id,
				url: data.url,
				expiresAt: new Date(createdAt + BOUQUET_TTL_SECONDS * 1000).toISOString()
			};
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch {
			serverError = 'Connection dropped. Check your internet and try again.';
		} finally {
			submitting = false;
		}
	}

	function reset() {
		result = null;
		step = 1;
		selected = [];
		sender = '';
		recipient = '';
		message = '';
		errors = {};
		serverError = '';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>Make a bouquet · Petalbit</title>
	<meta
		name="description"
		content="Build a pixel bouquet in three steps: pick flowers, write a note, and share the link. Free and live for 7 days."
	/>
</svelte:head>

<section class="studio" id="studio">
	<div class="studio-glow" aria-hidden="true"></div>

	<header class="studio-head reveal" use:reveal>
		<p class="eyebrow">{result ? 'All done' : 'Bouquet studio'}</p>
		{#key result}
			<h1 use:splitText={{ step: 55 }}>{result ? 'Your bouquet is in bloom.' : 'Build your bouquet.'}</h1>
		{/key}
		<p class="sub">
			{#if result}
				One tiny link, one big message. Send it before the seven days are up.
			{:else}
				Pick flowers, write a note, and send it off. No account needed. Your bouquet lives for seven days.
			{/if}
		</p>
	</header>

	{#if result}
		<div class="success reveal" use:reveal>
			<div class="success-art">
				<Bouquet flowers={selected} animate />
				<span class="success-sticker">for {recipient.trim() || 'you'}</span>
			</div>

			<div class="success-body">
				<span class="success-badge">Saved</span>
				<h2>Your bouquet for {recipient.trim() || 'someone special'} is ready to send.</h2>
				<p class="success-lede">
					Copy the link and drop it in a chat, DM, or email. Anyone with this link can see your bouquet and note.
				</p>

				<CopyLink value={result.url} />

				<div class="expiry">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
						<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="2" />
					</svg>
					<div>
						<p class="expiry-main">Live until {expiryLabel}</p>
						<p class="expiry-sub">
							After that, your bouquet and message ghost automatically. Keep the link safe.
						</p>
					</div>
				</div>

				<div class="success-actions">
					<a class="btn btn-primary" href={`/b/${result.id}`}>View bouquet</a>
					<button class="btn" type="button" onclick={reset}>Make another</button>
				</div>
			</div>
		</div>
	{:else}
		<nav class="stepper" aria-label="Bouquet steps">
			{#each steps as item (item.n)}
				<button
					type="button"
					class="stepper-item"
					class:active={step === item.n}
					class:done={step > item.n}
					disabled={item.n > step}
					aria-current={step === item.n ? 'step' : undefined}
					onclick={() => goTo(item.n)}
				>
					<span class="stepper-num">
						{#if step > item.n}
							<svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
								<path d="M2 6.5 4.7 9 10 3.2" stroke="currentColor" stroke-width="2" />
							</svg>
						{:else}
							{item.n}
						{/if}
					</span>
					<span class="stepper-label">{item.label}</span>
				</button>
			{/each}
		</nav>

		<div class="studio-grid">
			<div class="panel">
				{#if step === 1}
					<div class="panel-head">
						<div>
							<h2>Pick your flowers</h2>
							<p>Choose one to seven stems. The order you pick sets their spot in the bouquet.</p>
						</div>
						<div class="tally" class:full={atLimit}>
							<span class="tally-num">{selected.length}<span>/{MAX_BOUQUET_FLOWERS}</span></span>
							<span class="tally-label">stems</span>
						</div>
					</div>

					<div class="quick-row">
						<span class="quick-label">Quick picks</span>
						{#each STARTER_BOUQUETS as starter (starter.label)}
							<button
								type="button"
								class="chip"
								class:on={isStarterActive(starter.flowers)}
								onclick={() => applyStarter(starter.flowers)}
							>
								{starter.label}
							</button>
						{/each}
					</div>

					<ul class="pick-grid">
						{#each FLOWERS as flower (flower.id)}
							{@const isSelected = selected.includes(flower.id)}
							{@const locked = !isSelected && !canAddMore}
							<li>
								<button
									type="button"
									class="pick"
									class:selected={isSelected}
									class:locked
									aria-pressed={isSelected}
									disabled={!flower.available}
									title={flower.available
										? isSelected
											? `Remove ${flower.name}`
											: locked
												? `Max ${MAX_BOUQUET_FLOWERS} stems`
												: `Add ${flower.name}`
										: `${flower.name} not available yet`}
									onclick={() => toggle(flower.id)}
								>
									<div class="pick-art">
										<img
											src={flower.image}
											alt=""
											width="450"
											height="696"
											loading="lazy"
										/>
									</div>
									<div class="pick-meta">
										<div class="pick-name">
											<span>{flower.name}</span>
											<span class="pick-tone">{flower.tone}</span>
										</div>
										<p class="pick-desc">{flower.description}</p>
									</div>
									<span class="pick-check" aria-hidden="true">
										<svg width="10" height="10" viewBox="0 0 12 12" fill="none">
											<path d="M2 6.5 4.7 9 10 3.2" stroke="currentColor" stroke-width="2.2" />
										</svg>
									</span>
								</button>
							</li>
						{/each}
					</ul>

					{#if errors.flowers}
						<p class="field-error notice-line" role="alert">
							<span class="err-dot" aria-hidden="true">!</span>
							{errors.flowers}
						</p>
					{:else}
						<p class="limit-note" class:full={atLimit}>
							{#if atLimit}
								Bouquet is full. Remove a stem if you wanna swap.
							{:else}
								{MAX_BOUQUET_FLOWERS - selected.length} stem slots left.
							{/if}
						</p>
					{/if}
				{:else if step === 2}
					<div class="panel-head">
						<div>
							<h2>Write your note</h2>
							<p>This name and message will show up on your bouquet page.</p>
						</div>
					</div>

					<div class="fields">
						<div class="field">
							<div class="field-top">
								<label class="field-label" for="sender">
									Who is it from? <span class="req">required</span>
								</label>
								<span class="char" class:warn={sender.length > fieldLimits.sender.max - 6}>
									{sender.length}/{fieldLimits.sender.max}
								</span>
							</div>
							<input
								id="sender"
								class="field-input"
								type="text"
								bind:value={sender}
								maxlength={fieldLimits.sender.max}
								placeholder="Your name or nickname"
								autocomplete="name"
								aria-invalid={errors.sender ? 'true' : undefined}
								aria-describedby={errors.sender ? 'sender-error' : 'sender-hint'}
								oninput={() => clearError('sender')}
							/>
							{#if errors.sender}
								<p class="field-error hint-line" id="sender-error" role="alert">
									<span class="err-dot" aria-hidden="true">!</span>{errors.sender}
								</p>
							{:else}
								<p class="field-hint hint-line" id="sender-hint">2–32 characters.</p>
							{/if}
						</div>

						<div class="field">
							<div class="field-top">
								<label class="field-label" for="recipient">
									Who is it for? <span class="req">required</span>
								</label>
								<span class="char" class:warn={recipient.length > fieldLimits.recipient.max - 6}>
									{recipient.length}/{fieldLimits.recipient.max}
								</span>
							</div>
							<input
								id="recipient"
								class="field-input"
								type="text"
								bind:value={recipient}
								maxlength={fieldLimits.recipient.max}
								placeholder="Who is on your mind?"
								autocomplete="off"
								aria-invalid={errors.recipient ? 'true' : undefined}
								aria-describedby={errors.recipient ? 'recipient-error' : 'recipient-hint'}
								oninput={() => clearError('recipient')}
							/>
							{#if errors.recipient}
								<p class="field-error hint-line" id="recipient-error" role="alert">
									<span class="err-dot" aria-hidden="true">!</span>{errors.recipient}
								</p>
							{:else}
								<p class="field-hint hint-line" id="recipient-hint">
									Name, nickname, or pet name all work.
								</p>
							{/if}
						</div>

						<div class="field">
							<div class="field-top">
								<label class="field-label" for="message">
									Your message <span class="req">required</span>
								</label>
								<span class="char" class:warn={message.length > fieldLimits.message.max - 30}>
									{message.length}/{fieldLimits.message.max}
								</span>
							</div>
							<textarea
								id="message"
								class="field-input textarea"
								bind:value={message}
								maxlength={fieldLimits.message.max}
								rows="5"
								placeholder="Drop something sweet you want to leave with the petals..."
								aria-invalid={errors.message ? 'true' : undefined}
								aria-describedby={errors.message ? 'message-error' : 'message-hint'}
								oninput={() => clearError('message')}
							></textarea>
							{#if errors.message}
								<p class="field-error hint-line" id="message-error" role="alert">
									<span class="err-dot" aria-hidden="true">!</span>{errors.message}
								</p>
							{:else}
								<p class="field-hint hint-line" id="message-hint">3–280 characters.</p>
							{/if}

							<div class="samples">
								<span class="samples-label">Need inspo?</span>
								{#each samples as sample (sample)}
									<button type="button" class="sample" onclick={() => {
										message = sample;
										clearError('message');
									}}>
										{sample}
									</button>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<div class="panel-head">
						<div>
							<h2>Review your bouquet</h2>
							<p>Give it one last look. After this, your bouquet is ready to share.</p>
						</div>
					</div>

					<div class="review">
						<div class="review-row">
							<span class="review-label">Flowers</span>
							<div class="review-value">
								<ul class="review-flowers">
									{#each selectedFlowers as flower (flower.id)}
										<li>
											<img
												src={flower.image}
												alt=""
												width="450"
												height="696"
											/>
											<span>{flower.name}</span>
										</li>
									{/each}
								</ul>
							</div>
							<button type="button" class="edit" onclick={() => goTo(1)}>Edit</button>
						</div>

						<div class="review-row">
							<span class="review-label">From</span>
							<div class="review-value">{sender.trim()}</div>
							<button type="button" class="edit" onclick={() => goTo(2)}>Edit</button>
						</div>

						<div class="review-row">
							<span class="review-label">To</span>
							<div class="review-value">{recipient.trim()}</div>
							<button type="button" class="edit" onclick={() => goTo(2)}>Edit</button>
						</div>

						<div class="review-row message-row">
							<span class="review-label">Message</span>
							<div class="review-value review-message">{message.trim()}</div>
							<button type="button" class="edit" onclick={() => goTo(2)}>Edit</button>
						</div>
					</div>

					<div class="expiry">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
							<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="2" />
						</svg>
						<div>
							<p class="expiry-main">This bouquet lasts 7 days.</p>
							<p class="expiry-sub">
								After that, your bouquet and message ghost automatically. Nothing sticks around longer.
							</p>
						</div>
					</div>

					{#if serverError}
						<p class="alert" role="alert">
							<span class="err-dot" aria-hidden="true">!</span>{serverError}
						</p>
					{/if}
				{/if}

				<div class="panel-nav">
					<div>
						{#if step > 1}
							<button type="button" class="back" onclick={() => goTo(step - 1)}>
								<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M14 8H4M8 3 3 8l5 5" stroke="currentColor" stroke-width="2" />
								</svg>
								Back
							</button>
						{/if}
					</div>

					{#if step < 3}
						<button type="button" class="btn btn-primary" onclick={next}>
							{step === 1 ? 'Next: write your note' : 'Next: review'}
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="2" />
							</svg>
						</button>
					{:else}
						<button
							type="button"
							class="btn btn-primary"
							disabled={submitting}
							onclick={submit}
						>
							{#if submitting}
								Building...
							{:else}
								Make my bouquet
								<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="2" />
								</svg>
							{/if}
						</button>
					{/if}
				</div>
			</div>

			<aside class="preview reveal" aria-label="Bouquet preview" use:reveal={{ delay: 120 }}>
				<div class="preview-card">
					<div class="preview-top">
						<span class="preview-eyebrow">Preview</span>
						<span class="preview-live"><i></i>live</span>
					</div>

					<div class="preview-art">
						<Bouquet flowers={selected} fallback={false} greenery={selected.length > 0} />
					</div>

					{#if selected.length === 0}
						<p class="preview-empty">Pick some flowers and your bouquet will bloom right here.</p>
					{:else}
						<div class="preview-meta">
							<p class="pv-to">For <strong>{previewFor}</strong></p>
							<p class="pv-from">From {previewFrom}</p>
							{#if message.trim()}
								<p class="pv-msg">“{message.trim()}”</p>
							{/if}
						</div>
					{/if}
				</div>
				<p class="preview-note">Exactly what they will see.</p>
			</aside>
		</div>
	{/if}
</section>

<style>
	.studio {
		position: relative;
		max-width: 1180px;
		margin: 0 auto;
		padding: clamp(1.8rem, 4vw, 3rem) 1.25rem 1rem;
	}

	.studio-glow {
		position: absolute;
		inset: -6rem -10% auto;
		height: 32rem;
		background: radial-gradient(ellipse at 70% 20%, rgb(242 214 212 / 0.6), transparent 60%);
		pointer-events: none;
		z-index: -1;
	}

	.studio-head {
		max-width: 640px;
		margin-bottom: clamp(1.5rem, 4vw, 2.4rem);
	}

	.studio-head h1 {
		margin-top: 0.7rem;
		font-size: clamp(2.15rem, 5.4vw, 3.2rem);
	}

	.sub {
		margin-top: 0.85rem;
		max-width: 56ch;
		font-size: 0.94rem;
		line-height: 1.75;
		color: var(--color-ink-soft);
	}

	/* --------------------------------------------------------------- stepper */
	.stepper {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 1.3rem;
		border: 2px solid rgb(43 31 34 / 0.12);
		border-radius: 3px;
		background: rgb(253 248 241 / 0.7);
		padding: 0.4rem;
	}

	.stepper-item {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		border: none;
		background: transparent;
		border-radius: 2px;
		padding: 0.55rem 0.4rem;
		font-size: 0.76rem;
		font-weight: 600;
		color: var(--color-ink-faint);
		cursor: pointer;
		transition:
			background-color 160ms ease,
			color 160ms ease;
	}

	.stepper-item:disabled {
		cursor: default;
	}

	.stepper-item.active {
		background: var(--color-ink);
		color: var(--color-cream);
	}

	.stepper-item.done {
		color: var(--color-sage-deep);
	}

	.stepper-item.done:hover {
		background: rgb(127 146 112 / 0.12);
	}

	.stepper-num {
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 2px;
		background: rgb(43 31 34 / 0.08);
		font-size: 0.66rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.stepper-item.active .stepper-num {
		background: var(--color-rose);
		color: #fff;
	}

	.stepper-item.done .stepper-num {
		background: var(--color-sage);
		color: #fff;
	}

	.stepper-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 420px) {
		.stepper-label {
			display: none;
		}

		.stepper-item.active .stepper-label {
			display: inline;
		}
	}

	/* ------------------------------------------------------------------ grid */
	.studio-grid {
		display: grid;
		gap: 1.4rem;
		align-items: start;
	}

	.panel {
		position: relative;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background: var(--color-paper);
		box-shadow: 6px 6px 0 0 rgb(43 31 34 / 0.09);
		padding: clamp(1rem, 2.6vw, 1.7rem);
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.15rem;
	}

	.panel-head h2 {
		font-size: clamp(1.3rem, 3vw, 1.6rem);
	}

	.panel-head p {
		margin-top: 0.35rem;
		font-size: 0.82rem;
		line-height: 1.65;
		color: var(--color-ink-soft);
		max-width: 42ch;
	}

	.tally {
		display: grid;
		justify-items: center;
		line-height: 1;
		padding: 0.35rem 0.55rem;
		border: 2px solid rgb(43 31 34 / 0.14);
		border-radius: 3px;
		background: var(--color-blush-soft);
		flex-shrink: 0;
		transition: background-color 160ms ease;
	}

	.tally.full {
		background: var(--color-blush);
		border-color: var(--color-rose-light);
	}

	.tally-num {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-rose-deep);
	}

	.tally-num span {
		font-size: 0.7rem;
		color: var(--color-ink-faint);
	}

	.tally-label {
		margin-top: 0.2rem;
		font-size: 0.56rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	/* ------------------------------------------------------------ quick picks */
	.quick-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
		padding-bottom: 0.9rem;
		border-bottom: 2px dashed rgb(43 31 34 / 0.1);
	}

	.quick-label {
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		margin-right: 0.3rem;
	}

	.chip {
		border: 2px solid rgb(43 31 34 / 0.16);
		border-radius: 2px;
		background: var(--color-paper);
		padding: 0.28rem 0.55rem;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-ink-soft);
		cursor: pointer;
		transition:
			background-color 140ms ease,
			color 140ms ease,
			border-color 140ms ease;
	}

	.chip:hover {
		border-color: var(--color-rose);
		color: var(--color-rose-deep);
	}

	.chip.on {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-cream);
	}

	/* ------------------------------------------------------------------ picks */
	.pick-grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
		gap: 0.65rem;
	}

	.pick {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		border: 2px solid rgb(43 31 34 / 0.14);
		border-radius: 3px;
		background: var(--color-paper);
		padding: 0;
		text-align: left;
		overflow: hidden;
		cursor: pointer;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease,
			border-color 180ms ease,
			opacity 180ms ease;
	}

	.pick:hover:not(.locked) {
		transform: translateY(-2px);
		border-color: var(--color-ink);
		box-shadow: 4px 5px 0 0 var(--color-blush);
	}

	.pick.selected {
		border-color: var(--color-rose-deep);
		box-shadow: 0 0 0 2px var(--color-blush);
	}

	.pick.locked {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.pick-art {
		display: grid;
		place-items: end center;
		height: 116px;
		background:
			radial-gradient(circle at 50% 82%, rgb(242 214 212 / 0.7), transparent 70%),
			var(--color-blush-soft);
		overflow: hidden;
		padding-top: 0.35rem;
		transition: background-color 180ms ease;
	}

	.pick.selected .pick-art {
		background:
			radial-gradient(circle at 50% 78%, rgb(233 168 179 / 0.85), transparent 72%),
			var(--color-blush);
	}

	.pick-art img {
		height: 112px;
		width: auto;
		display: block;
		transition: transform 240ms cubic-bezier(0.2, 0.8, 0.3, 1.2);
	}

	.pick:hover:not(.locked) .pick-art img {
		transform: translateY(-4px) scale(1.04) rotate(-2.2deg);
	}

	.pick:active:not(.locked) .pick-art img {
		transform: translateY(-1px) scale(0.97) rotate(1.6deg);
		transition-duration: 90ms;
	}

	.pick-meta {
		padding: 0.5rem 0.6rem 0.6rem;
		border-top: 2px solid rgb(43 31 34 / 0.06);
	}

	.pick-name {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.3rem;
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	.pick-tone {
		font-family: var(--font-sans);
		font-size: 0.52rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		white-space: nowrap;
	}

	.pick-desc {
		margin-top: 0.2rem;
		font-size: 0.66rem;
		line-height: 1.45;
		color: var(--color-ink-soft);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.pick-check {
		position: absolute;
		top: 0.3rem;
		right: 0.3rem;
		display: grid;
		place-items: center;
		width: 17px;
		height: 17px;
		border-radius: 2px;
		background: var(--color-ink);
		color: var(--color-cream);
		opacity: 0;
		transform: scale(0.6);
		transition:
			opacity 160ms ease,
			transform 160ms ease;
	}

	.pick.selected .pick-check {
		opacity: 1;
		transform: none;
	}

	/* ------------------------------------------------------------------ notes */
	.limit-note {
		margin-top: 0.85rem;
		font-size: 0.72rem;
		color: var(--color-ink-faint);
	}

	.limit-note.full {
		color: var(--color-rose-deep);
		font-weight: 500;
	}

	.notice-line {
		margin-top: 0.85rem;
	}

	.err-dot {
		display: inline-grid;
		place-items: center;
		width: 14px;
		height: 14px;
		border-radius: 2px;
		background: var(--color-rose);
		color: #fff;
		font-size: 0.6rem;
		font-weight: 700;
		flex-shrink: 0;
		margin-top: 0.12rem;
	}

	/* ----------------------------------------------------------------- fields */
	.fields {
		display: grid;
		gap: 1.1rem;
	}

	.field-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem;
	}

	.req {
		font-size: 0.56rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-rose);
		margin-left: 0.2rem;
	}

	.char {
		font-size: 0.66rem;
		color: var(--color-ink-faint);
		font-variant-numeric: tabular-nums;
	}

	.char.warn {
		color: var(--color-rose);
		font-weight: 600;
	}

	.hint-line {
		margin-top: 0.35rem;
	}

	.textarea {
		resize: vertical;
		min-height: 118px;
		line-height: 1.65;
	}

	.samples {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.6rem;
		align-items: center;
	}

	.samples-label {
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		margin-right: 0.15rem;
	}

	.sample {
		border: 2px dashed rgb(43 31 34 / 0.15);
		border-radius: 2px;
		background: transparent;
		padding: 0.24rem 0.5rem;
		font-size: 0.66rem;
		color: var(--color-ink-soft);
		cursor: pointer;
		text-align: left;
		transition:
			border-color 140ms ease,
			color 140ms ease,
			background-color 140ms ease;
	}

	.sample:hover {
		border-color: var(--color-rose);
		color: var(--color-rose-deep);
		background: var(--color-blush-soft);
	}

	/* ----------------------------------------------------------------- review */
	.review {
		display: grid;
		gap: 0.1rem;
		border: 2px solid rgb(43 31 34 / 0.12);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.review-row {
		display: grid;
		grid-template-columns: 62px 1fr auto;
		gap: 0.7rem;
		align-items: start;
		padding: 0.7rem 0.8rem;
		background: var(--color-paper);
		border-bottom: 1px solid rgb(43 31 34 / 0.08);
	}

	.review-row:last-child {
		border-bottom: none;
	}

	.review-row.message-row {
		background: var(--color-blush-soft);
	}

	.review-label {
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		padding-top: 0.25rem;
	}

	.review-value {
		font-size: 0.86rem;
		font-weight: 500;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}

	.review-message {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: 0.94rem;
		line-height: 1.6;
	}

	.review-flowers {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.review-flowers li {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border: 2px solid rgb(43 31 34 / 0.1);
		border-radius: 2px;
		background: var(--color-cream);
		padding: 0.12rem 0.35rem 0.12rem 0.15rem;
		font-size: 0.66rem;
	}

	.review-flowers img {
		height: 22px;
		width: auto;
	}

	.edit {
		border: none;
		background: none;
		padding: 0.1rem;
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--color-rose);
		cursor: pointer;
		border-bottom: 1px solid transparent;
	}

	.edit:hover {
		border-bottom-color: var(--color-rose);
	}

	/* ----------------------------------------------------------------- expiry */
	.expiry {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		border: 2px dashed rgb(43 31 34 / 0.16);
		border-radius: 3px;
		background: var(--color-cream);
		padding: 0.75rem 0.85rem;
		color: var(--color-ink-soft);
	}

	.expiry svg {
		flex-shrink: 0;
		color: var(--color-rose);
		margin-top: 0.12rem;
	}

	.expiry-main {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.expiry-sub {
		margin-top: 0.15rem;
		font-size: 0.72rem;
		line-height: 1.55;
		color: var(--color-ink-faint);
	}

	.alert {
		margin-top: 0.85rem;
		display: flex;
		gap: 0.45rem;
		align-items: flex-start;
		border: 2px solid var(--color-rose-light);
		border-radius: 3px;
		background: var(--color-blush-soft);
		padding: 0.7rem 0.8rem;
		font-size: 0.78rem;
		color: var(--color-rose-deep);
	}

	/* ------------------------------------------------------------------- nav */
	.panel-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		margin-top: 1.3rem;
		padding-top: 1.1rem;
		border-top: 2px dashed rgb(43 31 34 / 0.1);
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: none;
		background: none;
		padding: 0.4rem 0.1rem;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-ink-soft);
		cursor: pointer;
	}

	.back:hover {
		color: var(--color-ink);
	}

	/* --------------------------------------------------------------- preview */
	.preview {
		max-width: 350px;
		margin: 0 auto;
		width: 100%;
	}

	.preview-card {
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background:
			radial-gradient(circle at 50% 25%, #fffaf3, var(--color-paper) 62%);
		box-shadow: 6px 6px 0 0 var(--color-blush);
		padding: 0.8rem 0.8rem 0.9rem;
	}

	.preview-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid rgb(43 31 34 / 0.1);
	}

	.preview-eyebrow {
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.preview-live {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		font-size: 0.58rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-sage-deep);
	}

	.preview-live i {
		width: 5px;
		height: 5px;
		background: var(--color-sage);
		animation: pulse-soft 2.4s ease-in-out infinite;
	}

	.preview-art {
		margin-top: 0.4rem;
	}

	.preview-empty {
		padding: 0.2rem 0.4rem 0.5rem;
		text-align: center;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.8rem;
		line-height: 1.6;
		color: var(--color-ink-faint);
	}

	.preview-meta {
		display: grid;
		gap: 0.15rem;
		padding: 0.55rem 0.2rem 0;
		border-top: 1px solid rgb(43 31 34 / 0.1);
		text-align: center;
	}

	.pv-to {
		font-family: var(--font-display);
		font-size: 1rem;
		font-style: italic;
		color: var(--color-ink-soft);
	}

	.pv-to strong {
		font-style: normal;
		font-weight: 600;
		color: var(--color-ink);
	}

	.pv-from {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.pv-msg {
		margin-top: 0.5rem;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.82rem;
		line-height: 1.65;
		color: var(--color-ink-soft);
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.preview-note {
		margin-top: 0.55rem;
		text-align: center;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.7rem;
		color: var(--color-ink-faint);
	}

	/* --------------------------------------------------------------- success */
	.success {
		display: grid;
		gap: clamp(1.2rem, 3vw, 2.4rem);
		align-items: center;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background:
			radial-gradient(circle at 12% 15%, rgb(242 214 212 / 0.75), transparent 45%),
			var(--color-paper);
		box-shadow: 7px 7px 0 0 var(--color-blush);
		padding: clamp(1.2rem, 3vw, 2.4rem);
	}

	.success-art {
		position: relative;
		border: 2px solid var(--color-ink);
		border-radius: 3px;
		background:
			radial-gradient(circle at 50% 35%, #fffaf3, var(--color-blush-soft) 80%);
		padding: 0.6rem;
		max-width: 380px;
		margin: 0 auto;
		width: 100%;
	}

	.success-sticker {
		position: absolute;
		left: 50%;
		bottom: -0.7rem;
		transform: translateX(-50%) rotate(-2deg);
		background: var(--color-ink);
		color: var(--color-cream);
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.72rem;
		padding: 0.28rem 0.6rem;
		border-radius: 2px;
		white-space: nowrap;
		max-width: 90%;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.success-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--color-sage);
		color: #fff;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 0.25rem 0.5rem;
		border-radius: 2px;
	}

	.success-body h2 {
		margin: 0.6rem 0 0.5rem;
		font-size: clamp(1.6rem, 3.8vw, 2.3rem);
	}

	.success-lede {
		font-size: 0.9rem;
		line-height: 1.75;
		color: var(--color-ink-soft);
		margin-bottom: 1.1rem;
		max-width: 52ch;
	}

	.success-body :global(.copy) {
		margin-bottom: 0.9rem;
	}

	.success-actions {
		margin-top: 1.1rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
	}

	@media (min-width: 720px) {
		.success {
			grid-template-columns: 0.8fr 1.2fr;
		}
	}

	@media (min-width: 980px) {
		.studio-grid {
			grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.8fr);
			gap: 1.6rem;
		}

		.preview {
			position: sticky;
			top: 88px;
			max-width: none;
		}
	}

	/* ============================================================ 2026 revamp */
	.studio {
		padding-top: clamp(1.6rem, 3.4vw, 2.6rem);
		overflow: clip;
	}

	.studio-glow {
		background: radial-gradient(ellipse 54% 46% at 68% 18%, rgb(236 207 202 / 0.6), transparent 62%);
	}

	.studio-head {
		margin-bottom: clamp(1.4rem, 3vw, 2rem);
	}

	.studio-head h1 {
		margin-top: 0.6rem;
		font-size: clamp(2.3rem, 5.6vw, 3.6rem);
		letter-spacing: -0.04em;
		line-height: 0.94;
	}

	.sub {
		max-width: 52ch;
		font-size: 0.9rem;
	}

	/* stepper becomes a hairline rail */
	.stepper {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0;
		margin-bottom: 1.4rem;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: var(--color-paper);
		padding: 0;
		overflow: hidden;
	}

	.stepper-item {
		position: relative;
		justify-content: flex-start;
		gap: 0.5rem;
		border: 0;
		border-right: 1px solid var(--color-rule-soft);
		border-radius: 0;
		padding: 0.72rem 0.85rem;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		transition:
			background-color 240ms ease,
			color 240ms ease;
	}

	.stepper-item:last-child {
		border-right: 0;
	}

	.stepper-item:disabled {
		opacity: 0.7;
	}

	.stepper-item.active {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.stepper-item.active::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		background: var(--color-rose-light);
	}

	.stepper-item.done {
		color: var(--color-sage-deep);
	}

	.stepper-item.done:hover {
		background: rgb(108 127 93 / 0.08);
	}

	.stepper-num {
		width: 17px;
		height: 17px;
		border-radius: 50%;
		background: transparent;
		border: 1px solid currentColor;
		font-family: var(--font-mono);
		font-size: 0.56rem;
		font-weight: 500;
	}

	.stepper-item.active .stepper-num {
		background: var(--color-rose);
		border-color: var(--color-rose);
		color: #fff7ef;
	}

	.stepper-item.done .stepper-num {
		background: var(--color-sage);
		border-color: var(--color-sage);
		color: #fff;
	}

	.stepper-label {
		letter-spacing: 0.1em;
	}

	/* panel as a specimen sheet */
	.panel {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: var(--color-paper);
		box-shadow: none;
		padding: clamp(1rem, 2.4vw, 1.6rem);
	}

	.panel-head {
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-rule-soft);
		margin-bottom: 1.1rem;
	}

	.panel-head h2 {
		font-size: clamp(1.35rem, 3vw, 1.7rem);
		letter-spacing: -0.035em;
	}

	.panel-head p {
		font-size: 0.82rem;
	}

	.tally {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: var(--color-paper-warm);
		padding: 0.4rem 0.6rem;
	}

	.tally.full {
		background: var(--color-blush);
		border-color: var(--color-rose-light);
	}

	.tally-num {
		font-size: 1.15rem;
		letter-spacing: -0.03em;
	}

	.tally-label {
		font-family: var(--font-mono);
		font-size: 0.5rem;
		letter-spacing: 0.12em;
	}

	/* quick picks */
	.quick-row {
		border-bottom: 1px solid var(--color-rule-soft);
		gap: 0.35rem;
		padding-bottom: 0.85rem;
	}

	.quick-label {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.14em;
	}

	.chip {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: transparent;
		padding: 0.3rem 0.6rem;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-weight: 500;
		color: var(--color-ink-soft);
	}

	.chip:hover {
		border-color: var(--color-ink);
		color: var(--color-ink);
	}

	.chip.on {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-paper);
	}

	/* picker cards */
	.pick-grid {
		grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
		gap: 0.55rem;
	}

	.pick {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: var(--color-paper);
		transition:
			transform 360ms var(--ease-out),
			box-shadow 360ms var(--ease-out),
			border-color 240ms ease,
			opacity 240ms ease;
	}

	.pick:hover:not(.locked) {
		transform: translateY(-3px);
		border-color: var(--color-ink);
		box-shadow: 3px 4px 0 0 var(--color-ink);
	}

	.pick.selected {
		border-color: var(--color-ink);
		box-shadow: 0 0 0 1px var(--color-ink);
	}

	.pick-art {
		height: 124px;
		background:
			radial-gradient(circle at 50% 88%, rgb(236 207 202 / 0.55), transparent 68%),
			var(--color-paper-warm);
		border-bottom: 1px solid var(--color-rule-soft);
	}

	.pick.selected .pick-art {
		background:
			radial-gradient(circle at 50% 84%, rgb(223 154 166 / 0.55), transparent 70%),
			var(--color-blush-soft);
	}

	.pick-art img {
		height: 120px;
	}

	.pick-meta {
		border-top: 0;
		padding: 0.5rem 0.6rem 0.62rem;
	}

	.pick-name {
		font-size: 1.02rem;
		letter-spacing: -0.025em;
		align-items: center;
	}

	.pick-tone {
		font-family: var(--font-mono);
		font-size: 0.46rem;
		letter-spacing: 0.1em;
		color: var(--color-rose-deep);
		border: 1px solid var(--color-rule-soft);
		padding: 0.08rem 0.24rem;
	}

	.pick-desc {
		font-size: 0.64rem;
		color: var(--color-ink-faint);
	}

	.pick-check {
		top: 0.42rem;
		right: 0.42rem;
		width: 16px;
		height: 16px;
		border: 1px solid var(--color-paper);
		background: var(--color-ink);
		color: var(--color-paper);
	}

	/* preview */
	.preview {
		max-width: 340px;
	}

	.preview-card {
		position: sticky;
		top: 5.5rem;
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: linear-gradient(180deg, var(--color-paper), #f7ecdd);
		box-shadow: var(--shadow-soft);
		padding: 0.75rem 0.75rem 0.85rem;
	}

	.preview-eyebrow {
		font-family: var(--font-mono);
		font-size: 0.55rem;
		letter-spacing: 0.14em;
	}

	.preview-live {
		font-family: var(--font-mono);
		font-size: 0.52rem;
	}

	.preview-meta {
		border-top: 1px solid var(--color-rule-soft);
	}

	.pv-from {
		font-family: var(--font-mono);
		font-size: 0.56rem;
	}

	/* nav buttons keep the new button language */
	.back {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	@media (min-width: 980px) {
		.studio-grid {
			grid-template-columns: minmax(0, 1fr) 22rem;
			gap: 1.6rem;
		}
	}

	@media (max-width: 470px) {
		/* Two small cards still fit a 320px screen, and browsing nine flowers
		   one column at a time is a slog. */
		.pick-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.45rem;
		}

		.pick-art {
			height: 100px;
		}

		.pick-art img {
			height: 96px;
		}

		.pick-name {
			font-size: 0.92rem;
		}

		.pick-desc {
			font-size: 0.6rem;
		}

		.stepper-item {
			justify-content: center;
			padding-inline: 0.35rem;
		}

		.stepper-label {
			display: none;
		}

		.stepper-item.active .stepper-label {
			display: inline;
		}
	}

	/* success sheet */
	.success {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background:
			radial-gradient(circle at 10% 8%, rgb(236 207 202 / 0.7), transparent 48%),
			var(--color-paper);
		box-shadow: none;
	}

	.success-art {
		border: 1px solid var(--color-rule);
		border-radius: var(--radius);
		background: linear-gradient(180deg, var(--color-paper), #f7ecdd);
		box-shadow: var(--shadow-soft);
	}

	.success-sticker {
		border-radius: var(--radius);
		font-size: 0.74rem;
	}

	.success-badge {
		border-radius: var(--radius);
		font-family: var(--font-mono);
		font-size: 0.52rem;
		letter-spacing: 0.14em;
	}

	.success-body h2 {
		letter-spacing: -0.035em;
	}

	/* review table reads like a receipt */
	.review {
		border: 1px solid var(--color-rule-soft);
		border-radius: var(--radius);
		background: var(--color-paper-warm);
	}

	.review-row {
		border-bottom: 1px solid var(--color-rule-soft);
	}

	.review-label {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.edit {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-rose-deep);
	}

	.expiry {
		border: 1px dashed var(--color-rule);
		border-radius: var(--radius);
		background: transparent;
	}

	.samples-label {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.12em;
	}

	.sample {
		font-size: 0.7rem;
	}

	.req,
	.char {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.08em;
	}
</style>
