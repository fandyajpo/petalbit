#!/usr/bin/env node
/**
 * Theme quality gate: validates the daily schedule, checks every palette's
 * critical foreground/background pairs against WCAG 2.2 AA, and reports raw
 * colors that bypass the semantic token system.
 *
 * Run with `npm run theme:check`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const cssPath = join(root, 'src/lib/theme/time-themes.css');
const configPath = join(root, 'src/lib/theme/time-theme.ts');
const css = readFileSync(cssPath, 'utf8');
const config = readFileSync(configPath, 'utf8');

const expectedStarts = {
	midnight: 0,
	dawn: 300,
	morning: 420,
	'late-morning': 600,
	midday: 690,
	afternoon: 810,
	golden: 930,
	sunset: 1050,
	evening: 1110,
	night: 1260
};

const failures = [];
const warnings = [];

/* ------------------------------------------------------------- schedule */
const schedule = [];
for (const match of config.matchAll(/id:\s*'([^']+)'[\s\S]*?start:\s*([^,\n]+)/g)) {
	const value = Function(`return (${match[2].trim()})`)();
	schedule.push({ id: match[1], start: value });
}

if (schedule.length !== 10) {
	failures.push(`Schedule has ${schedule.length} periods, expected 10.`);
}

for (const [index, theme] of schedule.entries()) {
	const expected = expectedStarts[theme.id];
	if (expected === undefined) {
		failures.push(`Unknown theme id "${theme.id}" in schedule.`);
		continue;
	}
	if (theme.start !== expected) {
		failures.push(
			`${theme.id} starts at ${theme.start} minutes, expected ${expected} (${String(Math.floor(expected / 60)).padStart(2, '0')}:${String(expected % 60).padStart(2, '0')}).`
		);
	}
	if (index > 0 && theme.start <= schedule[index - 1].start) {
		failures.push(`Schedule is not strictly increasing at "${theme.id}".`);
	}
}

for (const id of Object.keys(expectedStarts)) {
	if (!schedule.some((theme) => theme.id === id)) failures.push(`Schedule is missing "${id}".`);
}

/* -------------------------------------------------------------- palettes */
const blocks = new Map();
for (const match of css.matchAll(/\[data-time-theme='([^']+)'\]\s*\{([\s\S]*?)\n\}/g)) {
	const vars = new Map();
	for (const line of match[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
		vars.set(`--${line[1]}`, line[2]);
	}
	blocks.set(match[1], vars);
}

for (const { id } of schedule) {
	if (!blocks.has(id)) failures.push(`No CSS palette found for "${id}".`);
}
for (const id of blocks.keys()) {
	if (!schedule.some((theme) => theme.id === id)) {
		failures.push(`CSS palette "${id}" has no schedule entry.`);
	}
}

function parseHex(hex) {
	let value = hex.replace('#', '');
	if (value.length === 3) value = value.split('').map((c) => c + c).join('');
	if (value.length !== 6) return null;
	return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function luminance(hex) {
	const rgb = parseHex(hex);
	if (!rgb) return null;
	const linear = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a, b) {
	const la = luminance(a);
	const lb = luminance(b);
	if (la === null || lb === null) return null;
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const checks = [
	['--color-ink', '--color-paper', 4.5, 'body text on paper'],
	['--color-ink', '--color-bone', 4.5, 'body text on page'],
	['--color-ink', '--color-paper-warm', 4.5, 'body text on raised paper'],
	['--color-ink', '--color-blush-soft', 4.5, 'body text on blush surface'],
	['--color-ink-soft', '--color-paper', 4.5, 'secondary text on paper'],
	['--color-ink-soft', '--color-bone', 4.5, 'secondary text on page'],
	['--color-ink-faint', '--color-paper', 4.5, 'muted text on paper'],
	['--color-ink-faint', '--color-bone', 4.5, 'muted text on page'],
	['--color-rose', '--color-paper', 4.5, 'rose text on paper'],
	['--color-rose-deep', '--color-paper', 4.5, 'deep rose text on paper'],
	['--color-rose-deep', '--color-blush-soft', 4.5, 'deep rose text on blush'],
	['--color-sage-deep', '--color-paper', 4.5, 'sage text on paper'],
	['--color-on-accent', '--color-rose', 4.5, 'button label on rose'],
	['--color-on-accent', '--color-rose-hover', 4.5, 'button hover label'],
	['--color-on-sage', '--color-sage-deep', 4.5, 'badge label on sage'],
	['--color-inverse-ink', '--color-inverse-surface', 4.5, 'footer text on footer'],
	['--color-inverse-muted', '--color-inverse-surface', 4.5, 'footer muted text'],
	['--color-success-deep', '--color-paper', 4.5, 'success text on paper'],
	['--color-warning-deep', '--color-paper', 4.5, 'warning text on paper'],
	['--color-error-deep', '--color-paper', 4.5, 'error text on paper'],
	['--color-info-deep', '--color-paper', 4.5, 'info text on paper'],
	['--color-focus', '--color-paper', 3.0, 'focus ring on paper'],
	['--color-focus', '--color-bone', 3.0, 'focus ring on page']
];

console.log('\nTime theme contrast audit (WCAG 2.2 AA)\n');
console.log(
	['Theme'.padEnd(14), 'Pairs', 'Min ratio', 'Result'].join('  ')
);
console.log('-'.repeat(56));

for (const { id } of schedule) {
	const vars = blocks.get(id);
	if (!vars) continue;

	let min = Infinity;
	let failed = 0;
	for (const [fg, bg, minimum] of checks) {
		const ratio = contrast(vars.get(fg), vars.get(bg));
		if (ratio === null) {
			failures.push(`${id}: missing ${fg} or ${bg} for contrast check.`);
			failed += 1;
			continue;
		}
		min = Math.min(min, ratio);
		if (ratio < minimum) {
			failed += 1;
			failures.push(
				`${id}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1, needs ${minimum.toFixed(1)}:1`
			);
		}
	}

	console.log(
		[
			id.padEnd(14),
			String(checks.length).padStart(5),
			`${min.toFixed(2)}:1`.padStart(9),
			failed === 0 ? 'PASS' : `FAIL (${failed})`
		].join('  ')
	);
}

/* --------------------------------------------------------- hardcoded scan */
const illustrationFiles = new Set([
	'src/lib/components/Bouquet.svelte',
	'src/lib/components/BouquetBackground.svelte',
	'src/lib/components/FlowerTunnel.svelte',
	'src/lib/components/FloatingPetals.svelte',
	'src/lib/components/PixelButterfly.svelte',
	'src/lib/components/FlowerTicker.svelte',
	'src/lib/components/Brand.svelte',
	'src/routes/b/[id]/+page.svelte' // physical envelope + bouquet presentation
]);

function walk(dir) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) walk(path);
		else if (path.endsWith('.svelte')) inspect(path);
	}
}

function inspect(path) {
	const file = relative(root, path).replaceAll('\\', '/');
	if (illustrationFiles.has(file)) return;
	const source = readFileSync(path, 'utf8');
	if (/#[0-9a-fA-F]{3,8}\b|rgb\(/.test(source)) {
		warnings.push(`${file} still contains raw colors; confirm they are decorative.`);
	}
}
walk(join(root, 'src'));

if (warnings.length) {
	console.log('\nRaw color notes:');
	for (const warning of warnings) console.log(`  - ${warning}`);
}

if (failures.length) {
	console.error(`\n${failures.length} theme issue(s):`);
	for (const failure of failures) console.error(`  ✗ ${failure}`);
	process.exit(1);
}

console.log('\n✓ All 10 periods cover the day and all contrast checks pass.\n');
