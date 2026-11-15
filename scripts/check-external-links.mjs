#!/usr/bin/env node
/**
 * Scheduled external-link check for journal content and repository docs.
 *
 * This is intentionally separate from pull request CI: third-party sites can be
 * slow, rate-limited, or temporarily unavailable. Run: npm run links:check
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONTENT_DIR = join(ROOT, 'content/blog');
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 4;
const RETRIES = 1;
const USER_AGENT =
	'PetalbitLinkChecker/1.0 (+https://petalbit.vercel.app; scheduled external-link check)';
const OWN_HOSTS = new Set(['petalbit.app', 'www.petalbit.app', 'petalbit.vercel.app']);
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/g;

const files = [
	...readdirSync(CONTENT_DIR)
		.filter((name) => name.endsWith('.md'))
		.sort()
		.map((name) => join(CONTENT_DIR, name)),
	...(['README.md', 'AGENTS.md'].map((name) => join(ROOT, name)).filter(existsSync) ?? [])
];

function cleanUrl(raw) {
	let value = raw.replace(/[.,;:!?]+$/, '');
	while (
		value.endsWith(')') &&
		(value.match(/\)/g)?.length ?? 0) > (value.match(/\(/g)?.length ?? 0)
	) {
		value = value.slice(0, -1);
	}
	return value;
}

function stripCode(source) {
	return source
		.replace(/```[\s\S]*?```/g, '')
		.replace(/~~~[\s\S]*?~~~/g, '')
		.replace(/`[^`\n]+`/g, '');
}

const links = new Map();
for (const file of files) {
	const display = relative(ROOT, file);
	const source = stripCode(readFileSync(file, 'utf8'));

	for (const match of source.matchAll(URL_PATTERN)) {
		let url;
		try {
			url = new URL(cleanUrl(match[0]));
		} catch {
			console.warn(`  ! ignored malformed URL in ${display}: ${match[0]}`);
			continue;
		}
		if (!['http:', 'https:'].includes(url.protocol)) continue;
		if (OWN_HOSTS.has(url.hostname) || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
			continue;
		}

		url.hash = '';
		const key = url.href;
		if (!links.has(key)) links.set(key, new Set());
		links.get(key).add(display);
	}
}

if (!links.size) {
	console.log('External link check: no external links found.');
	process.exit(0);
}

function classify(status) {
	if (status === 401 || status === 403 || status === 429) return 'blocked';
	if (status >= 200 && status < 400) return 'ok';
	return 'broken';
}

async function request(url) {
	const response = await fetch(url, {
		redirect: 'follow',
		signal: AbortSignal.timeout(TIMEOUT_MS),
		headers: {
			'user-agent': USER_AGENT,
			accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			range: 'bytes=0-0'
		}
	});
	await response.body?.cancel();
	return { status: response.status, finalUrl: response.url };
}

async function check(url) {
	let lastError;

	for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
		try {
			const result = await request(url);
			if (result.status >= 500 && attempt < RETRIES) {
				await new Promise((resolve) => setTimeout(resolve, 1_000));
				continue;
			}
			return { ...result, verdict: classify(result.status), error: null };
		} catch (error) {
			lastError = error;
			if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 1_000));
		}
	}

	return {
		status: null,
		finalUrl: url,
		verdict: 'broken',
		error: lastError?.message ?? 'request failed'
	};
}

async function runPool(entries) {
	const results = new Array(entries.length);
	let next = 0;

	async function worker() {
		while (next < entries.length) {
			const index = next;
			next += 1;
			const [url, sources] = entries[index];
			const result = await check(url);
			results[index] = { url, sources, ...result };
			const status = result.status ?? 'ERR';
			const icon = result.verdict === 'ok' ? '✓' : result.verdict === 'blocked' ? '!' : '✖';
			console.log(`  ${icon} ${url} [${status}]`);
		}
	}

	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));
	return results;
}

console.log(
	`External link check: ${links.size} unique URL(s) from ${new Set([...links.values()].flatMap((set) => [...set])).size} file(s).`
);

const results = await runPool([...links.entries()]);
const broken = results.filter((result) => result.verdict === 'broken');
const blocked = results.filter((result) => result.verdict === 'blocked');
const passed = results.filter((result) => result.verdict === 'ok');

if (blocked.length) {
	console.log('\nBlocked or rate-limited (not treated as broken):');
	for (const result of blocked) {
		console.log(`  ! ${result.url} [${result.status}] — ${[...result.sources].join(', ')}`);
	}
}

if (broken.length) {
	console.error('\nBroken external links:');
	for (const result of broken) {
		const detail = result.status ? `HTTP ${result.status}` : result.error;
		console.error(`  ✖ ${result.url} — ${detail}`);
		for (const source of result.sources) console.error(`    in ${source}`);
	}
	console.error(
		`\nSummary: ${passed.length} passed, ${blocked.length} blocked, ${broken.length} broken.`
	);
	process.exit(1);
}

console.log(
	`\nSummary: ${passed.length} passed, ${blocked.length} blocked, ${broken.length} broken.`
);
