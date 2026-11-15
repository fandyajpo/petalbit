#!/usr/bin/env node
/**
 * Lightweight editorial checks for the Petalbit Journal.
 *
 * Validates frontmatter, internal links, route targets, and image files without
 * building the app. Run: npm run content:check
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');
const CONTENT_DIR = join(ROOT, 'content/blog');
const ROUTES_DIR = join(ROOT, 'src/routes');
const STATIC_DIR = join(ROOT, 'static');

const CATEGORY_IDS = new Set([
	'flower-meanings',
	'romantic-expressions',
	'digital-gifting',
	'pixel-art'
]);
const CATEGORY_TITLES = new Set([
	'Flower Meanings',
	'Romantic Expressions',
	'Digital Gifting',
	'Pixel Art & Creativity'
]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

const errors = [];
const stats = {
	articles: 0,
	published: 0,
	drafts: 0,
	images: 0,
	links: 0,
	anchors: 0,
	external: 0
};

function fail(file, message) {
	errors.push(`${file}: ${message}`);
}

function isRecord(value) {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function checkString(file, key, value, { min = 1, max = Infinity, pattern, message } = {}) {
	if (typeof value !== 'string') {
		fail(file, `${key} must be a string`);
		return false;
	}
	const trimmed = value.trim();
	if (trimmed.length < min) {
		fail(file, `${key} must be at least ${min} characters`);
		return false;
	}
	if (trimmed.length > max) {
		fail(file, `${key} must be at most ${max} characters`);
		return false;
	}
	if (pattern && !pattern.test(trimmed)) {
		fail(file, `${key} ${message ?? 'has an invalid format'}`);
		return false;
	}
	return true;
}

function validDate(value) {
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function decodeEntities(value) {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ');
}

function headingId(text) {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function headingText(markdown) {
	return decodeEntities(
		markdown
			.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
			.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
			.replace(/<[^>]+>/g, '')
			.replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
			.replace(/[`*_~]/g, '')
			.replace(/\s+#+\s*$/, '')
			.trim()
	);
}

function collectHeadingIds(body) {
	const ids = new Set();
	const seen = new Map();
	let index = 0;
	const withoutCode = body.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '');

	for (const line of withoutCode.split(/\r?\n/)) {
		const match = line.match(/^(#{2,3})\s+(.+?)\s*$/);
		if (!match) continue;

		const text = headingText(match[2]);
		const base = headingId(text) || `section-${index + 1}`;
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		ids.add(count === 0 ? base : `${base}-${count + 1}`);
		index += 1;
	}

	return ids;
}

function decodeFragment(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function readImageSize(buffer) {
	if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
		return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
	}

	if (
		buffer.length >= 30 &&
		buffer.toString('ascii', 0, 4) === 'RIFF' &&
		buffer.toString('ascii', 8, 12) === 'WEBP'
	) {
		const chunk = buffer.toString('ascii', 12, 16);
		if (chunk === 'VP8X') {
			return {
				width: buffer.readUIntLE(24, 3) + 1,
				height: buffer.readUIntLE(27, 3) + 1
			};
		}
		if (chunk === 'VP8L' && buffer[20] === 0x2f) {
			const bits = buffer.readUInt32LE(21);
			return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
		}
		if (chunk === 'VP8 ' && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
			return {
				width: buffer.readUInt16LE(26) & 0x3fff,
				height: buffer.readUInt16LE(28) & 0x3fff
			};
		}
	}

	return null;
}

function staticFileFor(urlPath) {
	let decoded;
	try {
		decoded = decodeURIComponent(urlPath);
	} catch {
		return null;
	}
	if (!decoded.startsWith('/')) return null;
	const absolute = resolve(STATIC_DIR, `.${decoded}`);
	if (absolute !== STATIC_DIR && !absolute.startsWith(`${STATIC_DIR}${sep}`)) return null;
	return absolute;
}

function checkImage(file, url, expected = {}) {
	const absolute = staticFileFor(url);
	if (!absolute || !existsSync(absolute) || !statSync(absolute).isFile()) {
		fail(file, `missing image ${url}`);
		return;
	}

	stats.images += 1;
	const size = readImageSize(readFileSync(absolute));
	if (!size) {
		fail(file, `could not read image dimensions for ${url}`);
		return;
	}
	if (expected.width && (size.width !== expected.width || size.height !== expected.height)) {
		fail(
			file,
			`${url} is ${size.width}x${size.height}; expected ${expected.width}x${expected.height}`
		);
	}
}

function collectRoutes() {
	const routes = [];

	function walk(directory) {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const absolute = join(directory, entry.name);
			if (entry.isDirectory()) {
				walk(absolute);
				continue;
			}
			if (entry.name !== '+page.svelte' && entry.name !== '+server.ts') continue;

			const relativeDir = relative(ROUTES_DIR, dirname(absolute));
			const segments = relativeDir
				.split(sep)
				.filter(Boolean)
				.filter((segment) => !/^\(.+\)$/.test(segment))
				.map((segment) => {
					const dynamic = segment.match(/^\[(?:\.\.\.)?(.+)\]$/);
					return dynamic ? `:${dynamic[1]}${segment.startsWith('[...') ? '*' : ''}` : segment;
				});

			routes.push(segments.length ? `/${segments.join('/')}` : '/');
		}
	}

	walk(ROUTES_DIR);
	return [...new Set(routes)];
}

function matchRoute(pathname) {
	const parts = pathname.split('/').filter(Boolean);

	for (const route of routePatterns) {
		const pattern = route.split('/').filter(Boolean);
		const params = {};
		let matched = true;

		for (let index = 0; index < pattern.length; index += 1) {
			const segment = pattern[index];
			if (segment.startsWith(':')) {
				const name = segment.slice(1).replace(/\*$/, '');
				if (segment.endsWith('*')) {
					params[name] = parts.slice(index).join('/');
					return parts.length > index ? { route, params } : null;
				}
				if (!parts[index]) {
					matched = false;
					break;
				}
				params[name] = parts[index];
				continue;
			}
			if (segment !== parts[index]) {
				matched = false;
				break;
			}
		}

		if (matched && pattern.length === parts.length) return { route, params };
	}

	return null;
}

function validateCover(file, coverImage) {
	if (typeof coverImage !== 'string') return;
	if (!/^\/images\/blog\/[a-z0-9-]+\.webp$/.test(coverImage)) {
		fail(file, 'coverImage must be a WebP under /images/blog/');
		return;
	}

	const stem = coverImage.replace(/\.webp$/, '');
	checkImage(file, coverImage, { width: 1200, height: 630 });
	for (const variant of [
		{ suffix: '-400.webp', width: 400, height: 210 },
		{ suffix: '-600.webp', width: 600, height: 315 },
		{ suffix: '-900.webp', width: 900, height: 473 }
	]) {
		checkImage(file, `${stem}${variant.suffix}`, variant);
	}
	checkImage(file, `${stem}-og.png`, { width: 1200, height: 630 });
}

function validateFrontmatter(file, filenameSlug, data) {
	if (!isRecord(data)) {
		fail(file, 'frontmatter must be a YAML mapping');
		return;
	}

	const slugValid = checkString(file, 'slug', data.slug, {
		pattern: SLUG_PATTERN,
		message: 'must use lowercase words separated by hyphens'
	});
	if (slugValid && data.slug !== filenameSlug) {
		fail(file, `slug "${data.slug}" must match the filename "${filenameSlug}"`);
	}

	checkString(file, 'title', data.title, { min: 8, max: 120 });
	checkString(file, 'description', data.description, { min: 50, max: 220 });
	checkString(file, 'coverImageAlt', data.coverImageAlt, { min: 12, max: 180 });
	checkString(file, 'seoTitle', data.seoTitle, { min: 12, max: 70 });
	checkString(file, 'seoDescription', data.seoDescription, { min: 80, max: 170 });
	if (data.author !== undefined) checkString(file, 'author', data.author, { min: 2, max: 80 });

	if (typeof data.category !== 'string') {
		fail(file, 'category must be a string');
	} else if (!CATEGORY_IDS.has(data.category) && !CATEGORY_TITLES.has(data.category)) {
		fail(file, `unknown category "${data.category}"`);
	}

	if (typeof data.publishedAt !== 'string' || !DATE_PATTERN.test(data.publishedAt)) {
		fail(file, 'publishedAt must use YYYY-MM-DD');
	} else if (!validDate(data.publishedAt)) {
		fail(file, `publishedAt "${data.publishedAt}" is not a valid date`);
	}

	if (data.featured !== undefined && typeof data.featured !== 'boolean') {
		fail(file, 'featured must be true or false');
	}
	if (data.draft !== undefined && typeof data.draft !== 'boolean') {
		fail(file, 'draft must be true or false');
	}

	if (!Array.isArray(data.keywords) || data.keywords.length < 3 || data.keywords.length > 12) {
		fail(file, 'keywords must contain 3–12 entries');
	} else {
		for (const keyword of data.keywords) {
			if (typeof keyword !== 'string' || keyword.trim().length < 2) {
				fail(file, 'each keyword must be a string of at least 2 characters');
				break;
			}
		}
	}

	if (data.related !== undefined) {
		if (!Array.isArray(data.related) || data.related.length > 5) {
			fail(file, 'related must be an array of at most 5 slugs');
		} else {
			const seen = new Set();
			for (const related of data.related) {
				if (typeof related !== 'string' || !SLUG_PATTERN.test(related)) {
					fail(file, `related "${related}" is not a valid slug`);
				} else if (related === filenameSlug) {
					fail(file, 'related cannot point to the article itself');
				} else if (seen.has(related)) {
					fail(file, `related contains "${related}" more than once`);
				}
				seen.add(related);
			}
		}
	}

	if (
		data.readingTime !== undefined &&
		(!Number.isInteger(data.readingTime) || data.readingTime < 1 || data.readingTime > 30)
	) {
		fail(file, 'readingTime must be an integer between 1 and 30');
	}

	validateCover(file, data.coverImage);
}

function validateLinks(file, body, publishedSlugs, currentSlug, headingsBySlug) {
	const withoutCode = body
		.replace(/```[\s\S]*?```/g, '')
		.replace(/~~~[\s\S]*?~~~/g, '')
		.replace(/`[^`\n]+`/g, '');

	const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
	for (const match of withoutCode.matchAll(imagePattern)) {
		const target = match[2];
		if (/^https?:\/\//i.test(target)) continue;
		if (!target.startsWith('/')) {
			fail(file, `image path "${target}" must be root-relative`);
			continue;
		}
		checkImage(file, target);
	}

	const linkPattern = /(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
	for (const match of withoutCode.matchAll(linkPattern)) {
		const target = match[1];

		if (/^(mailto|tel):/i.test(target)) continue;
		if (target.startsWith('#')) {
			const fragment = decodeFragment(target.slice(1));
			const headings = currentSlug ? headingsBySlug.get(currentSlug) : null;
			if (fragment && headings) {
				if (!headings.has(fragment)) {
					fail(file, `internal link "${target}" points to a missing heading`);
				} else {
					stats.anchors += 1;
				}
			}
			continue;
		}
		if (/^https?:\/\//i.test(target) || target.startsWith('//')) {
			try {
				new URL(target, 'https://petalbit.app');
			} catch {
				fail(file, `invalid external link "${target}"`);
				continue;
			}
			stats.external += 1;
			continue;
		}

		if (!target.startsWith('/')) {
			fail(file, `internal link "${target}" must be root-relative`);
			continue;
		}

		const url = new URL(target, 'https://petalbit.app');
		const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
		const route = matchRoute(pathname);

		if (route?.params.slug && !publishedSlugs.has(route.params.slug)) {
			fail(file, `internal link "${target}" points to a missing or unpublished article`);
			continue;
		}

		if (!route) {
			const staticFile = staticFileFor(pathname);
			if (!staticFile || !existsSync(staticFile) || !statSync(staticFile).isFile()) {
				fail(file, `internal link "${target}" does not match a route or static file`);
				continue;
			}
		}

		const category = url.searchParams.get('category');
		if (category && !CATEGORY_IDS.has(category)) {
			fail(file, `internal link "${target}" uses unknown category "${category}"`);
			continue;
		}

		const fragment = url.hash ? decodeFragment(url.hash.slice(1)) : '';
		if (fragment && route?.params.slug) {
			const headings = headingsBySlug.get(route.params.slug);
			if (headings && !headings.has(fragment)) {
				fail(
					file,
					`internal link "${target}" points to a missing heading in the target article`
				);
				continue;
			}
			if (headings) stats.anchors += 1;
		}

		stats.links += 1;
	}
}

const routePatterns = collectRoutes();
const filenames = readdirSync(CONTENT_DIR)
	.filter((name) => name.endsWith('.md'))
	.sort();

if (!filenames.length) {
	console.error('No Markdown articles found in content/blog.');
	process.exit(1);
}

const articles = [];
for (const filename of filenames) {
	const file = `content/blog/${filename}`;
	const absolute = join(CONTENT_DIR, filename);
	const raw = readFileSync(absolute, 'utf8');
	const match = raw.match(FRONTMATTER);
	if (!match) {
		fail(file, 'missing YAML frontmatter');
		continue;
	}

	let data;
	try {
		data = parseYaml(match[1]);
	} catch (error) {
		fail(file, `invalid YAML: ${error.message}`);
		continue;
	}

	const filenameSlug = filename.replace(/\.md$/, '');
	validateFrontmatter(file, filenameSlug, data);

	articles.push({
		file,
		body: match[2],
		headingIds: collectHeadingIds(match[2]),
		slug: typeof data?.slug === 'string' ? data.slug : null,
		related: Array.isArray(data?.related) ? data.related : [],
		draft: data?.draft === true
	});
	stats.articles += 1;
	if (data?.draft === true) stats.drafts += 1;
}

const bySlug = new Map();
for (const article of articles) {
	if (!article.slug) continue;
	if (bySlug.has(article.slug)) {
		fail(article.file, `duplicate slug "${article.slug}"`);
		continue;
	}
	bySlug.set(article.slug, article);
}

for (const article of articles) {
	for (const related of article.related) {
		const target = bySlug.get(related);
		if (!target) {
			fail(article.file, `related article "${related}" does not exist`);
		} else if (target.draft) {
			fail(article.file, `related article "${related}" is a draft`);
		}
	}
}

const publishedSlugs = new Set(
	articles.filter((article) => !article.draft && article.slug).map((article) => article.slug)
);
stats.published = publishedSlugs.size;

const headingsBySlug = new Map();
for (const article of articles) {
	if (article.slug && !headingsBySlug.has(article.slug)) {
		headingsBySlug.set(article.slug, article.headingIds);
	}
}

for (const article of articles) {
	validateLinks(article.file, article.body, publishedSlugs, article.slug, headingsBySlug);
}

if (errors.length) {
	console.error(`\nBlog content check failed with ${errors.length} issue(s):\n`);
	for (const error of errors) console.error(`  ✖ ${error}`);
	process.exit(1);
}

console.log('Blog content check passed.');
console.log(
	`  ${stats.articles} articles (${stats.published} published, ${stats.drafts} drafts)`
);
console.log(`  ${stats.images} image files verified`);
console.log(
	`  ${stats.links} internal links and ${stats.anchors} heading anchors verified; ${stats.external} external links not fetched`
);
