<script lang="ts">
	import { page } from '$app/state';
	import Bouquet from '$lib/components/Bouquet.svelte';
	import BouquetBackground from '$lib/components/BouquetBackground.svelte';
	import CopyLink from '$lib/components/CopyLink.svelte';
	import FloatingBouquet from '$lib/components/FloatingBouquet.svelte';
	import {
		mEnter,
		mFocus,
		mPop,
		mPress,
		mProgress,
		mShake,
		mStagger,
		mStep
	} from '$lib/actions/studio-motion';
	import {
		FLOWERS,
		MAX_BOUQUET_FLOWERS,
		STARTER_BOUQUETS,
		getFlower,
		isFlowerId
	} from '$lib/data/flowers';
	import {
		BOUQUET_PAPERS,
		DEFAULT_BOUQUET_PAPER,
		getBouquetPaper,
		type BouquetPaper
	} from '$lib/data/papers';
	import {
		BOUQUET_BACKGROUNDS,
		DEFAULT_BOUQUET_BACKGROUND,
		getBouquetBackground
	} from '$lib/data/backgrounds';
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

	type Stem = { key: string; flower: string };

	function makeStem(flower: string): Stem {
		const key =
			typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
				? crypto.randomUUID()
				: `${flower}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
		return { key, flower };
	}

	function initialStems(): Stem[] {
		const raw = page.url.searchParams.getAll('bunga').flatMap((value) => value.split(','));
		return raw
			.map((value) => value.trim())
			.filter(isFlowerId)
			.slice(0, MAX_BOUQUET_FLOWERS)
			.map((flower) => makeStem(flower));
	}

	let step = $state<number>(1);
	let dir = $state(1);
	let stems = $state<Stem[]>(initialStems());
	let paper = $state(DEFAULT_BOUQUET_PAPER);
	let background = $state(DEFAULT_BOUQUET_BACKGROUND);
	let sender = $state('');
	let recipient = $state('');
	let message = $state('');
	let errors = $state<Record<string, string>>({});
	let submitting = $state(false);
	let serverError = $state('');
	let result = $state<{ id: string; url: string; expiresAt: string } | null>(null);

	const canAddMore = $derived(stems.length < MAX_BOUQUET_FLOWERS);
	const selected = $derived(stems.map((stem) => stem.flower));
	const counts = $derived(
		Object.fromEntries(FLOWERS.map((flower) => [flower.id, stems.filter((stem) => stem.flower === flower.id).length]))
	);
	const stemSummary = $derived.by(() => {
		const plural = (name: string) =>
			name === 'Iris' ? 'Irises' : name.endsWith('y') ? `${name.slice(0, -1)}ies` : `${name}s`;
		return FLOWERS.filter((flower) => counts[flower.id] > 0)
			.map((flower) => `${counts[flower.id]} ${counts[flower.id] === 1 ? flower.name : plural(flower.name)}`)
			.join(' · ');
	});
	const previewFor = $derived(recipient.trim() || 'Someone special');
	const previewFrom = $derived(sender.trim() || 'You');
	const atLimit = $derived(selected.length >= MAX_BOUQUET_FLOWERS);
	const progress = $derived(step / 3);
	const selectedPaper = $derived(getBouquetPaper(paper));
	const selectedBackground = $derived(getBouquetBackground(background));

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

	function popEl(el: HTMLElement | null | undefined) {
		if (!el) return;
		mPop(el);
	}

	function clearError(...keys: string[]) {
		if (!keys.some((key) => key in errors)) return;
		const next = { ...errors };
		for (const key of keys) delete next[key];
		errors = next;
	}

	function toggle(id: string, event?: MouseEvent) {
		if (result) return;
		const btn = event?.currentTarget as HTMLElement | null;
		const flower = getFlower(id);
		const used = counts[id] ?? 0;
		if (flower && used >= flower.maxPerBouquet) {
			errors = {
				...errors,
				flowers: `${flower.name} is maxed at ${flower.maxPerBouquet}. Remove one to add another.`
			};
			if (btn) mShake(btn);
			return;
		}
		if (!canAddMore) {
			errors = {
				...errors,
				flowers: `Max ${MAX_BOUQUET_FLOWERS} stems per bouquet. Remove one first to swap.`
			};
			if (btn) mShake(btn);
			return;
		}
		stems = [...stems, makeStem(id)];
		clearError('flowers');
		if (btn) popEl(btn.querySelector('.pick-art') as HTMLElement | null);
	}

	function applyStarter(flowers: string[]) {
		stems = flowers.slice(0, MAX_BOUQUET_FLOWERS).map((flower) => makeStem(flower));
		clearError('flowers');
	}

	function removeStem(index: number) {
		stems = stems.filter((_, i) => i !== index);
		clearError('flowers');
	}


	function isStarterActive(flowers: string[]) {
		return flowers.length === selected.length && flowers.every((id) => selected.includes(id));
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
		const check = validateBouquet({
			sender,
			recipient,
			message,
			flowers: selected,
			paper,
			background
		});
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
		const top = el.getBoundingClientRect().top + window.scrollY - 84;
		window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
	}

	function goTo(nextStep: number) {
		if (nextStep < 1 || nextStep > 3 || nextStep > step) return;
		dir = -1;
		step = nextStep;
		serverError = '';
		scrollToStudio();
	}

	function next() {
		if (step === 1) {
			if (!validateStepOne()) {
				scrollToStudio();
				return;
			}
			dir = 1;
			step = 2;
			scrollToStudio();
			return;
		}
		if (step === 2) {
			if (!validateStepTwo()) {
				scrollToStudio();
				return;
			}
			dir = 1;
			step = 3;
			scrollToStudio();
		}
	}

	async function submit() {
		if (submitting || result) return;
		const check = validateBouquet({
			sender,
			recipient,
			message,
			flowers: selected,
			paper,
			background
		});
		if (!check.success) {
			errors = check.errors;
			if (check.errors.flowers) {
				dir = -1;
				step = 1;
			} else if (check.errors.sender || check.errors.recipient || check.errors.message) {
				dir = -1;
				step = 2;
			}
			scrollToStudio();
			return;
		}

		submitting = true;
		serverError = '';

		try {
			const response = await fetch('/api/bouquets', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ sender, recipient, message, flowers: selected, paper, background })
			});
			const data = await response.json().catch(() => null);

			if (!response.ok || !data?.id) {
				if (data?.errors) errors = data.errors;
				serverError = data?.message ?? 'Could not make your bouquet rn. Try again in a sec.';
				if (data?.errors?.flowers) {
					dir = -1;
					step = 1;
				}
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
		dir = 1;
		stems = [];
		paper = DEFAULT_BOUQUET_PAPER;
		background = DEFAULT_BOUQUET_BACKGROUND;
		sender = '';
		recipient = '';
		message = '';
		errors = {};
		serverError = '';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function onSample(sample: string) {
		message = sample;
		clearError('message');
	}

	function paperSwatchStyle(option: BouquetPaper) {
		const layout = option.layout ?? {};
		const parts = [
			`transform: translateY(8%) translate(${layout.paperX ?? 0}%, ${(layout.paperY ?? 0) * 0.4}px) rotate(${layout.paperRotate ?? 0}deg) scale(${Math.min(layout.paperScale ?? 1, 1.12)})`
		];
		if (layout.filter) parts.push(`filter:${layout.filter}`);
		return parts.join(';');
	}
</script>

<svelte:head>
	<title>Make a bouquet · Petalbit</title>
	<meta
		name="description"
		content="Build a pixel bouquet in three playful steps: pick flowers, write a note, and share the link. Free and live for 7 days."
	/>
</svelte:head>

<section class="studio" id="studio">
	<div class="studio-glow" aria-hidden="true"></div>

	<header class="studio-head">
		<p class="eyebrow">{result ? 'All done' : 'Bouquet studio'}</p>
		{#key result ? 'done' : 'make'}
			<h1 use:mEnter={{ y: 14, blur: 4, duration: 0.6 }}>
				{result ? 'Your bouquet is in bloom.' : 'Build your bouquet.'}
			</h1>
		{/key}
		<p class="sub" use:mEnter={{ y: 10, delay: 0.06, blur: 3 }}>
			{#if result}
				One tiny link, one big vibe. Send it before the seven days are up.
			{:else}
				Pick flowers, drop a note, and send it off. No account needed. Your bouquet lives for seven days.
			{/if}
		</p>
	</header>

	{#if result}
		<div class="success" use:mEnter={{ y: 22, scale: 0.98, blur: 5 }}>
			<div class="success-art">
				<BouquetBackground background={background} />
				<Bouquet flowers={selected} {paper} animate />
				<span class="success-sticker selectable" use:mEnter={{ y: 8, delay: 0.18 }}>for {recipient.trim() || 'you'}</span>
			</div>

			<div class="success-body">
				<span class="success-badge" use:mEnter={{ y: 6, delay: 0.05 }}>Saved</span>
				<h2 class="selectable" use:mEnter={{ y: 10, delay: 0.08 }}>Your bouquet for {recipient.trim() || 'someone special'} is ready to send.</h2>
				<p class="success-lede" use:mEnter={{ y: 8, delay: 0.12 }}>
					Copy the link and drop it in a chat, DM, or email. Anyone with this link can see your bouquet and note.
				</p>

				<div use:mEnter={{ y: 8, delay: 0.16 }}>
					<CopyLink value={result.url} />
				</div>

				<div class="expiry" use:mEnter={{ y: 8, delay: 0.2 }}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
						<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="2" />
					</svg>
					<div>
						<p class="expiry-main selectable">Live until {expiryLabel}</p>
						<p class="expiry-sub">
							After that, your bouquet and message ghost automatically. Keep the link safe.
						</p>
					</div>
				</div>

				<div class="success-actions" use:mEnter={{ y: 8, delay: 0.24 }}>
					<a class="btn btn-primary" href={`/b/${result.id}`} use:mPress>View bouquet</a>
					<button class="btn" type="button" onclick={reset} use:mPress>Make another</button>
				</div>
			</div>
		</div>
	{:else}
		<nav class="stepper" aria-label="Bouquet steps" use:mEnter={{ y: 10, blur: 3 }}>
			<div class="stepper-track" aria-hidden="true">
				<span class="stepper-fill" use:mProgress={progress}></span>
			</div>
			{#each steps as item (item.n)}
				<button
					type="button"
					class="stepper-item"
					class:active={step === item.n}
					class:done={step > item.n}
					disabled={item.n > step}
					aria-current={step === item.n ? 'step' : undefined}
					onclick={() => goTo(item.n)}
					use:mPress={{ hoverScale: 1.015, pressScale: 0.985, lift: -1 }}
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
				{#key step}
					<div class="step-view" use:mStep={dir}>
						{#if step === 1}
							<div class="panel-head">
								<div>
									<h2>Pick your flowers</h2>
									<p>Add up to {MAX_BOUQUET_FLOWERS} stems. Mix flowers freely and repeat your favourites.</p>
								</div>
								<div class="tally" class:full={atLimit} aria-live="polite">
									<span class="tally-num">{selected.length}<span>/{MAX_BOUQUET_FLOWERS}</span></span>
									<span class="tally-label">stems</span>
								</div>
							</div>

							<div class="quick-row" use:mStagger={{ y: 8, step: 0.03, selector: '.chip, .quick-label' }}>
								<span class="quick-label">Quick picks</span>
								{#each STARTER_BOUQUETS as starter (starter.label)}
									<button
										type="button"
										class="chip"
										class:on={isStarterActive(starter.flowers)}
										onclick={() => applyStarter(starter.flowers)}
										use:mPress={{ hoverScale: 1.04, pressScale: 0.96, lift: -1 }}
									>
										{starter.label}
									</button>
								{/each}
							</div>

							<ul class="pick-grid" use:mStagger={{ y: 18, scale: 0.97, step: 0.03, selector: 'li' }}>
								{#each FLOWERS as flower (flower.id)}
									{@const count = counts[flower.id] ?? 0}
									{@const typeMaxed = count >= flower.maxPerBouquet}
									{@const locked = !canAddMore || typeMaxed}
									<li>
										<button
											type="button"
											class="pick"
											class:selected={count > 0}
											class:locked
											disabled={!flower.available}
											title={!flower.available
												? `${flower.name} not available yet`
												: typeMaxed
													? `${flower.name} maxed — remove one to add another`
													: !canAddMore
														? `Max ${MAX_BOUQUET_FLOWERS} stems`
														: `Add another ${flower.name}`}
											onclick={(e) => toggle(flower.id, e)}
										>
											<div class="pick-art">
												<img src={flower.image} alt="" width="450" height="696" loading="lazy" />
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
											{#if count > 0}
												<span class="pick-count" aria-hidden="true">{count}</span>
											{/if}
										</button>
									</li>
								{/each}
							</ul>

							{#if stems.length > 0}
								<div class="stems">
									<div class="stems-head">
										<div>
											<h3>Your stems</h3>
											<p class="stems-summary">{stemSummary}</p>
										</div>
										<span class="stems-count">{stems.length}/{MAX_BOUQUET_FLOWERS}</span>
									</div>
									<ul class="stem-list">
										{#each stems as stem, i (stem.key)}
											{@const flower = getFlower(stem.flower)}
											<li class="stem">
												<span class="stem-pick">
													<img src={flower?.image} alt="" width="450" height="696" loading="lazy" />
													<span>{flower?.name ?? 'Stem'}</span>
												</span>
												<button
													type="button"
													class="stem-remove"
													onclick={() => removeStem(i)}
													aria-label={`Remove ${flower?.name ?? 'stem'}`}
												>×</button>
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							<div class="paper-picker">
								<div class="paper-head">
									<div>
										<h3>Bouquet paper <span class="optional">(optional)</span></h3>
										<p>Pick the wrap design, not just the color. Skip it and we’ll use {getBouquetPaper(DEFAULT_BOUQUET_PAPER).name} by default.</p>
									</div>
									<span class="paper-current">{selectedPaper.name}</span>
								</div>
								<p class="carousel-hint" aria-hidden="true">Swipe to see all wraps →</p>
								<div class="paper-grid" role="radiogroup" aria-label="Bouquet paper">
									{#each BOUQUET_PAPERS as option (option.id)}
										<button
											type="button"
											class="paper-card"
											class:selected={paper === option.id}
											role="radio"
											aria-checked={paper === option.id}
											onclick={() => (paper = option.id)}
											use:mPress={{ hoverScale: 1, pressScale: 0.985, lift: 0 }}
										>
											<span class="paper-swatch" aria-hidden="true">
												<img src={option.paperImage} alt="" style={paperSwatchStyle(option)} />
											</span>
											<span class="paper-meta">
												<span class="paper-name">{option.name}</span>
												<span class="paper-desc">{option.description}</span>
											</span>
											<span class="paper-check" aria-hidden="true">
												<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6.5 4.7 9 10 3.2" stroke="currentColor" stroke-width="2.2" /></svg>
											</span>
										</button>
									{/each}
								</div>
							</div>

							<div class="bg-picker">
								<div class="paper-head">
									<div>
										<h3>Background <span class="optional">(optional)</span></h3>
										<p>Set the mood behind your bouquet. Skip it and we’ll use {getBouquetBackground(DEFAULT_BOUQUET_BACKGROUND).name} by default.</p>
									</div>
									<span class="paper-current">{selectedBackground.name}</span>
								</div>
								<p class="carousel-hint" aria-hidden="true">Swipe to see all moods →</p>
								<div class="bg-grid" role="radiogroup" aria-label="Bouquet background">
									{#each BOUQUET_BACKGROUNDS as option (option.id)}
										<button
											type="button"
											class="bg-card"
											class:selected={background === option.id}
											role="radio"
											aria-checked={background === option.id}
											onclick={() => (background = option.id)}
											use:mPress={{ hoverScale: 1, pressScale: 0.985, lift: 0 }}
										>
											<span class="bg-thumb" aria-hidden="true">
												<BouquetBackground background={option.id} compact />
											</span>
											<span class="paper-meta">
												<span class="paper-name">{option.name}</span>
												<span class="paper-desc">{option.description}</span>
											</span>
											<span class="paper-check" aria-hidden="true">
												<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6.5 4.7 9 10 3.2" stroke="currentColor" stroke-width="2.2" /></svg>
											</span>
										</button>
									{/each}
								</div>
							</div>

							{#if errors.flowers}
								<p class="field-error notice-line" role="alert" use:mEnter={{ y: 6, blur: 2 }} use:mShake>
									<span class="err-dot" aria-hidden="true">!</span>
									{errors.flowers}
								</p>
							{:else}
								<p class="limit-note" class:full={atLimit} aria-live="polite">
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

							<div class="fields" use:mStagger={{ y: 14, step: 0.06, selector: '.field' }}>
								<div class="field">
									<div class="field-top">
										<label class="field-label" for="sender">Who is it from? <span class="req">required</span></label>
										<span class="char" class:warn={sender.length > fieldLimits.sender.max - 6}>{sender.length}/{fieldLimits.sender.max}</span>
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
										use:mFocus
									/>
									{#if errors.sender}
										<p class="field-error hint-line" id="sender-error" role="alert" use:mEnter={{ y: 4, blur: 0 }} use:mShake>
											<span class="err-dot" aria-hidden="true">!</span>{errors.sender}
										</p>
									{:else}
										<p class="field-hint hint-line" id="sender-hint">2–32 characters.</p>
									{/if}
								</div>

								<div class="field">
									<div class="field-top">
										<label class="field-label" for="recipient">Who is it for? <span class="req">required</span></label>
										<span class="char" class:warn={recipient.length > fieldLimits.recipient.max - 6}>{recipient.length}/{fieldLimits.recipient.max}</span>
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
										use:mFocus
									/>
									{#if errors.recipient}
										<p class="field-error hint-line" id="recipient-error" role="alert" use:mEnter={{ y: 4, blur: 0 }} use:mShake>
											<span class="err-dot" aria-hidden="true">!</span>{errors.recipient}
										</p>
									{:else}
										<p class="field-hint hint-line" id="recipient-hint">Name, nickname, or pet name all work.</p>
									{/if}
								</div>

								<div class="field">
									<div class="field-top">
										<label class="field-label" for="message">Your message <span class="req">required</span></label>
										<span class="char" class:warn={message.length > fieldLimits.message.max - 30}>{message.length}/{fieldLimits.message.max}</span>
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
										use:mFocus
									></textarea>
									{#if errors.message}
										<p class="field-error hint-line" id="message-error" role="alert" use:mEnter={{ y: 4, blur: 0 }} use:mShake>
											<span class="err-dot" aria-hidden="true">!</span>{errors.message}
										</p>
									{:else}
										<p class="field-hint hint-line" id="message-hint">3–280 characters.</p>
									{/if}

									<div class="samples">
										<span class="samples-label">Need inspo?</span>
										{#each samples as sample (sample)}
											<button type="button" class="sample" onclick={() => onSample(sample)} use:mPress={{ hoverScale: 1.03, pressScale: 0.97, lift: -1 }}>
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

							<div class="review" use:mStagger={{ y: 12, step: 0.05, selector: '.review-row' }}>
								<div class="review-row">
									<span class="review-label">Flowers</span>
									<div class="review-value">
										<ul class="review-flowers">
											{#each stems as stem (stem.key)}
												{@const flower = getFlower(stem.flower)}
												<li><img src={flower?.image} alt="" width="450" height="696" /><span>{flower?.name ?? 'Stem'}</span></li>
											{/each}
										</ul>
									</div>
									<button type="button" class="edit" onclick={() => goTo(1)} use:mPress={{ hoverScale: 1.05, pressScale: 0.96, lift: 0 }}>Edit</button>
								</div>

								<div class="review-row">
									<span class="review-label">Wrap</span>
									<div class="review-value">{selectedPaper.name} <span class="review-soft">paper</span></div>
									<button type="button" class="edit" onclick={() => goTo(1)} use:mPress={{ hoverScale: 1.05, pressScale: 0.96, lift: 0 }}>Edit</button>
								</div>

								<div class="review-row">
									<span class="review-label">Mood</span>
									<div class="review-value">{selectedBackground.name} <span class="review-soft">background</span></div>
									<button type="button" class="edit" onclick={() => goTo(1)} use:mPress={{ hoverScale: 1.05, pressScale: 0.96, lift: 0 }}>Edit</button>
								</div>

								<div class="review-row">
									<span class="review-label">From</span>
									<div class="review-value selectable">{sender.trim()}</div>
									<button type="button" class="edit" onclick={() => goTo(2)} use:mPress={{ hoverScale: 1.05, pressScale: 0.96, lift: 0 }}>Edit</button>
								</div>

								<div class="review-row">
									<span class="review-label">To</span>
									<div class="review-value selectable">{recipient.trim()}</div>
									<button type="button" class="edit" onclick={() => goTo(2)} use:mPress={{ hoverScale: 1.05, pressScale: 0.96, lift: 0 }}>Edit</button>
								</div>

								<div class="review-row message-row">
									<span class="review-label">Message</span>
									<div class="review-value review-message selectable">{message.trim()}</div>
									<button type="button" class="edit" onclick={() => goTo(2)} use:mPress={{ hoverScale: 1.05, pressScale: 0.96, lift: 0 }}>Edit</button>
								</div>
							</div>

							<div class="expiry" use:mEnter={{ y: 8, delay: 0.12, blur: 2 }}>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
									<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="2" />
								</svg>
								<div>
									<p class="expiry-main">This bouquet lasts 7 days.</p>
									<p class="expiry-sub">After that, your bouquet and message ghost automatically. Nothing sticks around longer.</p>
								</div>
							</div>

							{#if serverError}
								<p class="alert" role="alert" use:mEnter={{ y: 6, blur: 2 }} use:mShake>
									<span class="err-dot" aria-hidden="true">!</span>{serverError}
								</p>
							{/if}
						{/if}
					</div>
				{/key}

				<div class="panel-nav">
					<div>
						{#if step > 1}
							<button type="button" class="back" onclick={() => goTo(step - 1)} use:mPress={{ hoverScale: 1.02, pressScale: 0.97, lift: 0 }}>
								<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M14 8H4M8 3 3 8l5 5" stroke="currentColor" stroke-width="2" />
								</svg>
								Back
							</button>
						{/if}
					</div>

					{#if step < 3}
						<button type="button" class="btn btn-primary" onclick={next} use:mPress>
							{step === 1 ? 'Next: write your note' : 'Next: review'}
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M2 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="2" />
							</svg>
						</button>
					{:else}
						<button type="button" class="btn btn-primary" disabled={submitting} onclick={submit} use:mPress>
							{#if submitting}
								<span class="spinner" aria-hidden="true"></span> Building...
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

			<aside class="preview" aria-label="Bouquet preview" use:mEnter={{ y: 16, delay: 0.08, blur: 4 }}>
				<div class="preview-card">
					<div class="preview-top">
						<span class="preview-eyebrow">Preview</span>
						<span class="preview-live"><i></i>live</span>
					</div>

					<div class="preview-art">
						<BouquetBackground background={background} />
						<Bouquet flowers={selected} {paper} fallback={false} greenery={selected.length > 0} />
					</div>


					{#key selected.join(',') + '|' + paper + '|' + background + '|' + recipient + '|' + sender + '|' + (message ? 'm' : '')}
						<div class="preview-content" use:mEnter={{ y: 8, scale: 0.995, blur: 2, duration: 0.4 }}>
							{#if selected.length === 0}
								<p class="preview-empty">Pick some flowers and your bouquet will bloom right here.</p>
							{:else}
								<div class="preview-meta">
									<p class="pv-to">For <strong class="selectable">{previewFor}</strong></p>
									<p class="pv-from selectable">From {previewFrom}</p>
									{#if message.trim()}
										<p class="pv-msg selectable">“{message.trim()}”</p>
									{/if}
								</div>
							{/if}
						</div>
					{/key}
				</div>
				<p class="preview-note">This is a preview. Pick your options below. ↓</p>
			</aside>
		</div>

		<FloatingBouquet
			flowers={selected}
			{paper}
			{background}
			to={previewFor}
			from={previewFrom}
			message={message.trim()}
		/>
	{/if}
</section>

<style>
	.studio {
		position: relative;
		max-width: 1180px;
		margin: 0 auto;
		padding: clamp(1.6rem, 3.4vw, 2.6rem) 1.25rem 1rem;
		overflow: clip;
	}

	.studio-glow {
		position: absolute;
		inset: -6rem -10% auto;
		height: 32rem;
		background: radial-gradient(ellipse 54% 46% at 68% 18%, rgb(236 207 202 / 0.6), transparent 62%);
		pointer-events: none;
		z-index: -1;
	}

	.studio-head {
		max-width: 640px;
		margin-bottom: clamp(1.4rem, 3vw, 2rem);
	}

	.studio-head h1 {
		margin-top: 0.6rem;
		font-size: clamp(2.3rem, 5.6vw, 3.6rem);
		letter-spacing: -0.04em;
		line-height: 0.94;
	}

	.sub {
		margin-top: 0.85rem;
		max-width: 52ch;
		font-size: 0.92rem;
		line-height: 1.75;
		color: var(--color-ink-soft);
	}

	/* stepper */
	.stepper {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0;
		margin-bottom: 1.4rem;
		border: 1px solid var(--color-rule);
		border-radius: 12px;
		background: var(--color-paper);
		padding: 0;
		overflow: hidden;
		box-shadow: 0 8px 24px -20px rgb(25 17 16 / 0.35);
	}

	.stepper-track {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 3px;
		background: rgb(25 17 16 / 0.06);
		pointer-events: none;
	}

	.stepper-fill {
		display: block;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, var(--color-rose), var(--color-rose-light));
		transform-origin: left center;
		will-change: transform;
	}

	.stepper-item {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.5rem;
		border: 0;
		border-right: 1px solid var(--color-rule-soft);
		border-radius: 0;
		padding: 0.78rem 0.9rem 0.9rem;
		background: transparent;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		cursor: pointer;
		transition: background-color 240ms ease, color 240ms ease;
	}

	.stepper-item:last-child {
		border-right: 0;
	}

	.stepper-item:disabled {
		cursor: default;
	}

	.stepper-item.active {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.stepper-item.done {
		color: var(--color-sage-deep);
	}

	.stepper-item.done:hover {
		background: rgb(108 127 93 / 0.08);
	}

	.stepper-num {
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 1px solid currentColor;
		font-size: 0.56rem;
		flex-shrink: 0;
		transition: transform 240ms var(--ease-spring), background-color 240ms ease;
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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 460px) {
		.stepper-label {
			display: none;
		}
		.stepper-item.active .stepper-label {
			display: inline;
		}
		.stepper-item {
			justify-content: center;
		}
	}

	/* grid */
	.studio-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.4rem;
		align-items: start;
	}

	.studio-grid > * {
		min-width: 0;
	}

	.panel {
		min-width: 0;
		border: 1px solid var(--color-rule);
		border-radius: 14px;
		background: var(--color-paper);
		box-shadow: 0 14px 34px -26px rgb(25 17 16 / 0.45);
		padding: clamp(1rem, 2.4vw, 1.6rem);
	}

	.step-view {
		min-height: 120px;
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-rule-soft);
	}

	.panel-head h2 {
		font-size: clamp(1.35rem, 3vw, 1.7rem);
		letter-spacing: -0.035em;
	}

	.panel-head p {
		margin-top: 0.35rem;
		font-size: 0.84rem;
		line-height: 1.65;
		color: var(--color-ink-soft);
		max-width: 42ch;
	}

	.tally {
		display: grid;
		justify-items: center;
		line-height: 1;
		padding: 0.45rem 0.65rem;
		border: 1px solid var(--color-rule);
		border-radius: 10px;
		background: var(--color-paper-warm);
		flex-shrink: 0;
		transition: background-color 220ms ease, border-color 220ms ease, transform 300ms var(--ease-spring);
	}

	.tally.full {
		background: var(--color-blush);
		border-color: var(--color-rose-light);
		transform: scale(1.03);
	}

	.tally-num {
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--color-rose-deep);
	}

	.tally-num span {
		font-size: 0.7rem;
		color: var(--color-ink-faint);
	}

	.tally-label {
		margin-top: 0.2rem;
		font-family: var(--font-mono);
		font-size: 0.5rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	/* quick picks */
	.quick-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid var(--color-rule-soft);
	}

	.quick-label {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		margin-right: 0.3rem;
	}

	.chip {
		border: 1px solid var(--color-rule);
		border-radius: 999px;
		background: transparent;
		padding: 0.34rem 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 500;
		color: var(--color-ink-soft);
		cursor: pointer;
		transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease;
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

	/* picks */
	.pick-grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
		gap: 0.6rem;
	}

	.pick {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		border: 1px solid var(--color-rule);
		border-radius: 12px;
		background: var(--color-paper);
		padding: 0;
		text-align: left;
		overflow: hidden;
		cursor: pointer;
		transition: border-color 220ms ease, box-shadow 260ms ease, opacity 200ms ease, transform 260ms var(--ease-out);
	}

	.pick:hover:not(.locked):not(:disabled) {
		border-color: rgb(25 17 16 / 0.35);
		box-shadow: 0 10px 22px -16px rgb(25 17 16 / 0.45);
		transform: translateY(-2px);
	}

	.pick.selected {
		border-color: var(--color-ink);
		box-shadow: 0 0 0 2px rgb(25 17 16 / 0.08), 0 12px 24px -18px rgb(173 54 72 / 0.35);
	}

	.pick.locked {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.pick-art {
		display: grid;
		place-items: end center;
		height: 122px;
		background: radial-gradient(circle at 50% 88%, rgb(236 207 202 / 0.55), transparent 68%), var(--color-paper-warm);
		border-bottom: 1px solid var(--color-rule-soft);
		overflow: hidden;
		padding-top: 0.35rem;
		transition: background 220ms ease;
	}

	.pick.selected .pick-art {
		background: radial-gradient(circle at 50% 84%, rgb(223 154 166 / 0.55), transparent 70%), var(--color-blush-soft);
	}

	.pick-art img {
		height: 116px;
		width: auto;
		display: block;
		transition: transform 300ms var(--ease-spring);
	}

	.pick:hover:not(.locked):not(:disabled) .pick-art img {
		transform: translateY(-3px) scale(1.03);
	}

	.pick-meta {
		padding: 0.55rem 0.65rem 0.65rem;
	}

	.pick-name {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.3rem;
		font-family: var(--font-display);
		font-size: 1.02rem;
		font-weight: 500;
		letter-spacing: -0.025em;
	}

	.pick-tone {
		font-family: var(--font-mono);
		font-size: 0.46rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-rose-deep);
		border: 1px solid var(--color-rule-soft);
		border-radius: 999px;
		padding: 0.1rem 0.3rem;
		white-space: nowrap;
	}

	.pick-desc {
		margin-top: 0.22rem;
		font-size: 0.66rem;
		line-height: 1.45;
		color: var(--color-ink-faint);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.pick-check {
		position: absolute;
		top: 0.45rem;
		right: 0.45rem;
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--color-ink);
		color: var(--color-paper);
		opacity: 0;
		transform: scale(0.5);
		transition: opacity 180ms ease, transform 260ms var(--ease-spring);
	}

	.pick.selected .pick-check {
		opacity: 1;
		transform: scale(1);
	}

	.limit-note {
		margin-top: 0.85rem;
		font-size: 0.74rem;
		color: var(--color-ink-faint);
		transition: color 200ms ease;
	}

	.limit-note.full {
		color: var(--color-rose-deep);
		font-weight: 500;
	}

	.pick-count {
		position: absolute;
		top: 0.45rem;
		left: 0.45rem;
		min-width: 18px;
		height: 18px;
		padding: 0 0.3rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--color-rose);
		color: #fff7ef;
		font-family: var(--font-mono);
		font-size: 0.56rem;
		font-weight: 700;
		box-shadow: 0 2px 6px -2px rgb(25 17 16 / 0.5);
	}

	/* selected stems */
	.stems {
		margin-top: 1rem;
		padding-top: 0.9rem;
		border-top: 1px solid var(--color-rule-soft);
	}

	.stems-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 0.5rem;
	}

	.stems-head h3 {
		font-size: 0.95rem;
		letter-spacing: -0.02em;
	}

	.stems-summary {
		margin-top: 0.15rem;
		font-size: 0.7rem;
		line-height: 1.5;
		color: var(--color-ink-faint);
	}

	.stems-count {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.1em;
		color: var(--color-rose-deep);
		border: 1px solid var(--color-rule-soft);
		background: var(--color-blush-soft);
		border-radius: 999px;
		padding: 0.2rem 0.45rem;
		white-space: nowrap;
	}

	.stem-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.stem {
		display: inline-flex;
		align-items: center;
		border: 1px solid var(--color-rule);
		border-radius: 999px;
		background: var(--color-paper-warm);
		padding: 0.1rem 0.1rem 0.1rem 0.15rem;
		transition: border-color 160ms ease, background-color 160ms ease;
	}


	.stem-pick {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border: 0;
		background: none;
		padding: 0.1rem 0.15rem;
		font-size: 0.68rem;
		color: var(--color-ink-soft);
	}

	.stem-pick img {
		height: 22px;
		width: auto;
	}

	.stem-remove {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--color-ink-faint);
		font-size: 0.9rem;
		line-height: 1;
		cursor: pointer;
	}

	.stem-remove:hover {
		background: var(--color-blush);
		color: var(--color-rose-deep);
	}







	.notice-line {
		margin-top: 0.85rem;
	}

	.err-dot {
		display: inline-grid;
		place-items: center;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: var(--color-rose);
		color: #fff;
		font-size: 0.62rem;
		font-weight: 700;
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	/* fields */
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
		font-family: var(--font-mono);
		font-size: 0.56rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-rose);
		margin-left: 0.2rem;
	}

	.char {
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.06em;
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

	:global(.field-input) {
		border-radius: 10px;
	}

	.textarea {
		resize: vertical;
		min-height: 122px;
		line-height: 1.65;
	}

	.samples {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.65rem;
		align-items: center;
	}

	.samples-label {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		margin-right: 0.15rem;
	}

	.sample {
		border: 1px dashed rgb(25 17 16 / 0.18);
		border-radius: 999px;
		background: transparent;
		padding: 0.28rem 0.6rem;
		font-size: 0.7rem;
		color: var(--color-ink-soft);
		cursor: pointer;
		text-align: left;
		transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
	}

	.sample:hover {
		border-color: var(--color-rose);
		color: var(--color-rose-deep);
		background: var(--color-blush-soft);
	}

	/* review */
	.review {
		display: grid;
		gap: 0;
		border: 1px solid var(--color-rule-soft);
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 1rem;
		background: var(--color-paper-warm);
	}

	.review-row {
		display: grid;
		grid-template-columns: 64px 1fr auto;
		gap: 0.7rem;
		align-items: start;
		padding: 0.75rem 0.85rem;
		background: var(--color-paper);
		border-bottom: 1px solid var(--color-rule-soft);
	}

	.review-row:last-child {
		border-bottom: none;
	}

	.review-row.message-row {
		background: var(--color-blush-soft);
	}

	.review-label {
		font-family: var(--font-mono);
		font-size: 0.56rem;
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
		font-size: 0.96rem;
	}

	.review-soft {
		color: var(--color-ink-faint);
		font-weight: 400;
	}

	.paper-picker {
		margin-top: 1.1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-rule-soft);
	}

	.paper-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 0.7rem;
	}

	.paper-head h3 {
		font-size: 1rem;
		letter-spacing: -0.02em;
	}

	.paper-head p {
		margin-top: 0.2rem;
		font-size: 0.76rem;
		line-height: 1.55;
		color: var(--color-ink-soft);
	}

	.optional {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.paper-current {
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-rose-deep);
		border: 1px solid var(--color-rule-soft);
		border-radius: 999px;
		padding: 0.22rem 0.5rem;
		background: var(--color-blush-soft);
		white-space: nowrap;
	}

	.paper-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.55rem;
	}

	.paper-card {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		text-align: left;
		border: 1px solid var(--color-rule);
		border-radius: 12px;
		background: var(--color-paper);
		padding: 0.45rem 0.55rem;
		cursor: pointer;
		transition: border-color 220ms ease, box-shadow 240ms ease, transform 220ms var(--ease-out);
	}

	.paper-card:hover {
		border-color: rgb(25 17 16 / 0.3);
		box-shadow: 0 8px 18px -14px rgb(25 17 16 / 0.4);
	}

	.paper-card.selected {
		border-color: var(--color-ink);
		box-shadow: 0 0 0 2px rgb(25 17 16 / 0.08);
		background: var(--color-paper-warm);
	}

	.paper-swatch {
		width: 46px;
		height: 46px;
		border-radius: 10px;
		overflow: hidden;
		background: radial-gradient(circle at 50% 80%, rgb(236 207 202 / 0.45), transparent 70%), var(--color-cream);
		border: 1px solid var(--color-rule-soft);
		flex-shrink: 0;
		display: grid;
		place-items: end center;
	}

	.paper-swatch img {
		width: 120%;
		max-width: none;
		transform: translateY(8%);
		display: block;
	}

	.paper-meta {
		display: grid;
		gap: 0.08rem;
		min-width: 0;
	}

	.paper-name {
		font-family: var(--font-display);
		font-size: 0.98rem;
		font-weight: 500;
		letter-spacing: -0.02em;
	}

	.paper-desc {
		font-size: 0.64rem;
		line-height: 1.4;
		color: var(--color-ink-faint);
	}

	.paper-check {
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		display: grid;
		place-items: center;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--color-ink);
		color: var(--color-paper);
		opacity: 0;
		transform: scale(0.5);
		transition: opacity 180ms ease, transform 240ms var(--ease-spring);
	}

	.paper-card.selected .paper-check {
		opacity: 1;
		transform: scale(1);
	}

	.carousel-hint {
		display: none;
		margin: 0 0 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.54rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.bg-picker {
		margin-top: 1.1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-rule-soft);
	}

	.bg-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.55rem;
	}

	.bg-card {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		text-align: left;
		border: 1px solid var(--color-rule);
		border-radius: 12px;
		background: var(--color-paper);
		padding: 0.45rem 0.55rem;
		cursor: pointer;
		transition: border-color 220ms ease, box-shadow 240ms ease, transform 220ms var(--ease-out);
	}

	.bg-card:hover {
		border-color: rgb(25 17 16 / 0.3);
		box-shadow: 0 8px 18px -14px rgb(25 17 16 / 0.4);
	}

	.bg-card.selected {
		border-color: var(--color-ink);
		box-shadow: 0 0 0 2px rgb(25 17 16 / 0.08);
		background: var(--color-paper-warm);
	}

	.bg-thumb {
		position: relative;
		width: 46px;
		height: 46px;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--color-rule-soft);
		flex-shrink: 0;
	}

	.bg-card .paper-check {
		opacity: 0;
		transform: scale(0.5);
	}

	.bg-card.selected .paper-check {
		opacity: 1;
		transform: scale(1);
	}

	.review-flowers {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.review-flowers li {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border: 1px solid rgb(25 17 16 / 0.1);
		border-radius: 999px;
		background: var(--color-cream);
		padding: 0.14rem 0.4rem 0.14rem 0.18rem;
		font-size: 0.66rem;
	}

	.review-flowers img {
		height: 22px;
		width: auto;
	}

	.edit {
		border: none;
		background: none;
		padding: 0.15rem 0.2rem;
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--color-rose-deep);
		cursor: pointer;
		border-bottom: 1px solid transparent;
	}

	.edit:hover {
		border-bottom-color: var(--color-rose-deep);
	}

	.expiry {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		border: 1px dashed var(--color-rule);
		border-radius: 12px;
		background: transparent;
		padding: 0.8rem 0.9rem;
		color: var(--color-ink-soft);
	}

	.expiry svg {
		flex-shrink: 0;
		color: var(--color-rose);
		margin-top: 0.12rem;
	}

	.expiry-main {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.expiry-sub {
		margin-top: 0.15rem;
		font-size: 0.73rem;
		line-height: 1.55;
		color: var(--color-ink-faint);
	}

	.alert {
		margin-top: 0.85rem;
		display: flex;
		gap: 0.45rem;
		align-items: flex-start;
		border: 1px solid var(--color-rose-light);
		border-radius: 12px;
		background: var(--color-blush-soft);
		padding: 0.75rem 0.85rem;
		font-size: 0.78rem;
		color: var(--color-rose-deep);
	}

	/* nav */
	.panel-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin-top: 1.3rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--color-rule-soft);
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: none;
		background: none;
		padding: 0.45rem 0.2rem;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--color-ink-soft);
		cursor: pointer;
	}

	.back:hover {
		color: var(--color-ink);
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgb(255 247 239 / 0.35);
		border-top-color: #fff7ef;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* preview */
	.preview {
		min-width: 0;
		max-width: 350px;
		margin: 0 auto;
		width: 100%;
	}

	.preview-card {
		border: 1px solid var(--color-rule);
		border-radius: 14px;
		background: linear-gradient(180deg, var(--color-paper), #f7ecdd);
		box-shadow: 0 16px 36px -28px rgb(25 17 16 / 0.45);
		padding: 0.8rem 0.8rem 0.95rem;
	}

	.preview-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid rgb(25 17 16 / 0.1);
	}

	.preview-eyebrow {
		font-family: var(--font-mono);
		font-size: 0.55rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.preview-live {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		font-family: var(--font-mono);
		font-size: 0.52rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-sage-deep);
	}

	.preview-live i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-sage);
		animation: pulse-soft 2.4s ease-in-out infinite;
	}

	.preview-art {
		position: relative;
		isolation: isolate;
		margin: 0.4rem -0.25rem 0;
		padding: 0.35rem 0.25rem 0;
		border-radius: 12px;
		overflow: hidden;
	}

	.preview-art :global(.bouquet) {
		position: relative;
		z-index: 1;
	}

	.preview-empty {
		padding: 0.3rem 0.4rem 0.5rem;
		text-align: center;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-ink-faint);
	}

	.preview-meta {
		display: grid;
		gap: 0.15rem;
		padding: 0.55rem 0.2rem 0;
		border-top: 1px solid rgb(25 17 16 / 0.1);
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
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-faint);
	}

	.pv-msg {
		margin-top: 0.5rem;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.84rem;
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
		font-size: 0.72rem;
		color: var(--color-ink-faint);
	}

	/* success */
	.success {
		display: grid;
		gap: clamp(1.2rem, 3vw, 2.4rem);
		align-items: center;
		border: 1px solid var(--color-rule);
		border-radius: 16px;
		background: radial-gradient(circle at 10% 8%, rgb(236 207 202 / 0.7), transparent 48%), var(--color-paper);
		box-shadow: 0 18px 40px -30px rgb(25 17 16 / 0.4);
		padding: clamp(1.2rem, 3vw, 2.4rem);
	}

	.success-art {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		border: 1px solid var(--color-rule);
		border-radius: 14px;
		background: linear-gradient(180deg, var(--color-paper), #f7ecdd);
		box-shadow: 0 14px 30px -24px rgb(25 17 16 / 0.35);
		padding: 0.6rem;
		max-width: 380px;
		margin: 0 auto;
		width: 100%;
	}

	.success-art :global(.bouquet) {
		position: relative;
		z-index: 1;
	}

	.success-sticker {
		position: absolute;
		z-index: 2;
		left: 50%;
		bottom: 0.9rem;
		max-width: calc(100% - 1.2rem);
		overflow-wrap: anywhere;
		text-align: center;
		transform: translateX(-50%) rotate(-2deg);
		background: var(--color-blush-soft);
		color: var(--color-rose-deep);
		border: 1px solid rgb(109 29 41 / 0.22);
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.74rem;
		padding: 0.28rem 0.65rem;
		border-radius: 8px;
		white-space: nowrap;
		max-width: 90%;
		overflow: hidden;
		text-overflow: ellipsis;
		box-shadow: 0 6px 14px -10px rgb(25 17 16 / 0.55);
	}

	.success-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--color-sage);
		color: #fff;
		font-family: var(--font-mono);
		font-size: 0.52rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 0.28rem 0.55rem;
		border-radius: 8px;
	}

	.success-body h2 {
		margin: 0.6rem 0 0.5rem;
		font-size: clamp(1.6rem, 3.8vw, 2.3rem);
		letter-spacing: -0.035em;
	}

	.success-lede {
		font-size: 0.92rem;
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

	.success-body h2 {
		overflow-wrap: anywhere;
	}

	@media (min-width: 980px) {
		.studio-grid {
			grid-template-columns: minmax(0, 1fr) 22rem;
			gap: 1.6rem;
		}

		.preview {
			position: sticky;
			top: 88px;
			max-width: none;
		}
	}

	@media (max-width: 979px) {
		.preview {
			display: none;
		}

		.carousel-hint {
			display: block;
		}

		.pick-grid,
		.paper-grid,
		.bg-grid {
			display: grid;
			grid-auto-flow: column;
			grid-template-columns: none;
			grid-auto-columns: minmax(150px, 64%);
			gap: 0.5rem;
			overflow-x: auto;
			overflow-y: hidden;
			scroll-snap-type: x mandatory;
			scroll-padding-inline: 0.25rem;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
			padding: 0.4rem 0.25rem 0.7rem;
			margin-inline: -0.25rem;
		}

		.pick-grid::-webkit-scrollbar,
		.paper-grid::-webkit-scrollbar,
		.bg-grid::-webkit-scrollbar {
			display: none;
		}

		.pick-grid > li,
		.paper-grid > .paper-card,
		.bg-grid > .bg-card {
			scroll-snap-align: start;
		}
	}

	@media (max-width: 470px) {
		.pick-grid {
			grid-auto-columns: minmax(132px, 46%);
			gap: 0.4rem;
		}
		.paper-grid,
		.bg-grid {
			grid-auto-columns: minmax(220px, 84%);
		}
		.pick-art {
			height: 104px;
		}
		.pick-art img {
			height: 98px;
		}
		.pick-name {
			font-size: 0.94rem;
		}
		.pick-desc {
			font-size: 0.6rem;
		}
	}
</style>
