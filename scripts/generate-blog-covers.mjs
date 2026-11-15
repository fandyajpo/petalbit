/**
 * Petalbit blog cover generator.
 *
 * Composes existing flower sprites onto editorial paper fields and writes
 * responsive WebP covers plus a 1200x630 PNG social card to static/images/blog.
 *
 * Requires the `cwebp` binary from libwebp.
 *
 * Run: npm run blog:covers
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const ROOT = resolve(import.meta.dirname, '..');
const W = 1200;
const H = 630;

const FONT = {
	A: '01110 10001 10001 11111 10001 10001 10001',
	B: '11110 10001 10001 11110 10001 10001 11110',
	C: '01111 10000 10000 10000 10000 10000 01111',
	D: '11110 10001 10001 10001 10001 10001 11110',
	E: '11111 10000 10000 11110 10000 10000 11111',
	F: '11111 10000 10000 11110 10000 10000 10000',
	G: '01111 10000 10000 10111 10001 10001 01111',
	H: '10001 10001 10001 11111 10001 10001 10001',
	I: '11111 00100 00100 00100 00100 00100 11111',
	J: '00111 00010 00010 00010 00010 10010 01100',
	K: '10001 10010 10100 11000 10100 10010 10001',
	L: '10000 10000 10000 10000 10000 10000 11111',
	M: '10001 11011 10101 10101 10001 10001 10001',
	N: '10001 11001 10101 10011 10001 10001 10001',
	O: '01110 10001 10001 10001 10001 10001 01110',
	P: '11110 10001 10001 11110 10000 10000 10000',
	Q: '01110 10001 10001 10001 10101 10010 01101',
	R: '11110 10001 10001 11110 10100 10010 10001',
	S: '01111 10000 10000 01110 00001 00001 11110',
	T: '11111 00100 00100 00100 00100 00100 00100',
	U: '10001 10001 10001 10001 10001 10001 01110',
	V: '10001 10001 10001 10001 10001 01010 00100',
	W: '10001 10001 10001 10101 10101 10101 01010',
	X: '10001 10001 01010 00100 01010 10001 10001',
	Y: '10001 10001 01010 00100 00100 00100 00100',
	Z: '11111 00001 00010 00100 01000 10000 11111',
	'0': '01110 10001 10011 10101 11001 10001 01110',
	'1': '00100 01100 00100 00100 00100 00100 01110',
	'2': '01110 10001 00001 00010 00100 01000 11111',
	'3': '11110 00001 00001 01110 00001 00001 11110',
	'4': '00010 00110 01010 10010 11111 00010 00010',
	'5': '11111 10000 10000 11110 00001 00001 11110',
	'6': '01110 10000 10000 11110 10001 10001 01110',
	'7': '11111 00001 00010 00100 01000 01000 01000',
	'8': '01110 10001 10001 01110 10001 10001 01110',
	'9': '01110 10001 10001 01111 00001 00001 01110',
	' ': '00000 00000 00000 00000 00000 00000 00000',
	'-': '00000 00000 00000 11111 00000 00000 00000',
	'/': '00001 00010 00010 00100 01000 01000 10000',
	'.': '00000 00000 00000 00000 00000 00100 00100'
};

const COVERS = [
	{
		slug: 'language-of-flowers',
		number: '01',
		label: 'FLOWER MEANINGS',
		paper: [248, 239, 225],
		paper2: [240, 219, 205],
		tint: [226, 177, 167],
		accent: [128, 48, 62],
		ink: [42, 30, 34],
		soft: [255, 250, 242],
		flowers: [
			{ id: 'iris', x: 420, h: 500, a: -12, alpha: 0.95 },
			{ id: 'peony', x: 680, h: 470, a: 4 },
			{ id: 'mawar', x: 830, h: 540, a: 10 },
			{ id: 'daisy', x: 540, h: 390, a: -2, alpha: 0.92 }
		]
	},
	{
		slug: 'flowers-and-feelings',
		number: '02',
		label: 'FLOWER MEANINGS',
		paper: [235, 232, 213],
		paper2: [213, 219, 197],
		tint: [184, 198, 164],
		accent: [84, 102, 70],
		ink: [44, 48, 38],
		soft: [250, 247, 232],
		flowers: [
			{ id: 'daisy', x: 320, h: 430, a: -13 },
			{ id: 'matahari', x: 490, h: 530, a: -6 },
			{ id: 'iris', x: 650, h: 480, a: 1 },
			{ id: 'lavender', x: 790, h: 440, a: 7 },
			{ id: 'eukaliptus', x: 900, h: 410, a: 14, alpha: 0.9 }
		]
	},
	{
		slug: 'say-i-miss-you',
		number: '03',
		label: 'ROMANTIC EXPRESSIONS',
		paper: [220, 213, 225],
		paper2: [194, 184, 206],
		tint: [152, 133, 169],
		accent: [72, 55, 88],
		ink: [50, 41, 60],
		soft: [246, 239, 246],
		flowers: [
			{ id: 'mawar', x: 735, h: 560, a: 7, alpha: 0.98 },
			{ id: 'lavender', x: 910, h: 430, a: 18, alpha: 0.82 }
		]
	},
	{
		slug: 'sweet-messages-for-someone',
		number: '04',
		label: 'ROMANTIC EXPRESSIONS',
		paper: [247, 222, 207],
		paper2: [239, 195, 183],
		tint: [231, 165, 151],
		accent: [151, 55, 66],
		ink: [69, 36, 38],
		soft: [255, 247, 237],
		flowers: [
			{ id: 'tulip', x: 380, h: 500, a: -11 },
			{ id: 'daisy', x: 545, h: 410, a: -3 },
			{ id: 'peony', x: 700, h: 520, a: 5 },
			{ id: 'mawar', x: 860, h: 470, a: 13, alpha: 0.94 }
		]
	},
	{
		slug: 'digital-flowers',
		number: '05',
		label: 'DIGITAL GIFTING',
		paper: [224, 229, 234],
		paper2: [201, 211, 222],
		tint: [159, 178, 203],
		accent: [68, 91, 126],
		ink: [39, 50, 66],
		soft: [248, 250, 251],
		grid: true,
		flowers: [
			{ id: 'iris', x: 650, h: 520, a: -4 },
			{ id: 'daisy', x: 490, h: 430, a: -12, alpha: 0.94 },
			{ id: 'eukaliptus', x: 820, h: 480, a: 12, alpha: 0.86 }
		]
	},
	{
		slug: 'beauty-of-temporary-things',
		number: '06',
		label: 'DIGITAL GIFTING',
		paper: [39, 33, 47],
		paper2: [26, 23, 34],
		tint: [93, 69, 86],
		accent: [236, 207, 202],
		ink: [241, 232, 218],
		soft: [247, 238, 226],
		dark: true,
		flowers: [
			{ id: 'peony', x: 805, h: 545, a: 4, alpha: 0.95 },
			{ id: 'lavender', x: 980, h: 410, a: 15, alpha: 0.55 }
		]
	},
	{
		slug: 'charm-of-pixel-art',
		number: '07',
		label: 'PIXEL ART',
		paper: [244, 235, 205],
		paper2: [233, 214, 167],
		tint: [220, 167, 72],
		accent: [54, 83, 109],
		ink: [41, 38, 34],
		soft: [255, 250, 236],
		blocks: true,
		flowers: [
			{ id: 'iris', x: 760, h: 520, a: 5 },
			{ id: 'matahari', x: 570, h: 460, a: -9, alpha: 0.9 },
			{ id: 'bakung', x: 920, h: 440, a: 16, alpha: 0.84 }
		]
	},
	{
		slug: 'create-digital-bouquet',
		number: '08',
		label: 'PIXEL ART',
		paper: [247, 233, 214],
		paper2: [237, 214, 185],
		tint: [217, 178, 162],
		accent: [141, 55, 66],
		ink: [48, 34, 35],
		soft: [255, 249, 239],
		flowers: [
			{ id: 'mawar', x: 520, h: 480, a: -13 },
			{ id: 'peony', x: 640, h: 520, a: -4 },
			{ id: 'tulip', x: 760, h: 460, a: 4 },
			{ id: 'daisy', x: 870, h: 400, a: 12, alpha: 0.94 },
			{ id: 'lavender', x: 950, h: 360, a: 20, alpha: 0.8 }
		]
	}
];

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t)
	];
}

function canvas() {
	return Buffer.alloc(W * H * 4);
}

function blend(out, x, y, color, alpha = 255) {
	if (x < 0 || y < 0 || x >= W || y >= H || alpha <= 0) return;
	const i = (y * W + x) * 4;
	const a = Math.min(1, alpha / 255);
	const inv = 1 - a;
	out[i] = Math.round(color[0] * a + out[i] * inv);
	out[i + 1] = Math.round(color[1] * a + out[i + 1] * inv);
	out[i + 2] = Math.round(color[2] * a + out[i + 2] * inv);
	out[i + 3] = Math.max(out[i + 3], Math.round(alpha));
}

function fillRect(out, x0, y0, x1, y1, color, alpha = 255) {
	const left = Math.max(0, Math.floor(Math.min(x0, x1)));
	const right = Math.min(W, Math.ceil(Math.max(x0, x1)));
	const top = Math.max(0, Math.floor(Math.min(y0, y1)));
	const bottom = Math.min(H, Math.ceil(Math.max(y0, y1)));
	for (let y = top; y < bottom; y += 1) {
		for (let x = left; x < right; x += 1) blend(out, x, y, color, alpha);
	}
}

function circle(out, cx, cy, radius, color, alpha = 255) {
	const r2 = radius * radius;
	for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
		for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
			const dx = x - cx;
			const dy = y - cy;
			if (dx * dx + dy * dy <= r2) blend(out, x, y, color, alpha);
		}
	}
}

function paintBackground(out, cover) {
	for (let y = 0; y < H; y += 1) {
		const base = mix(cover.paper, cover.paper2, y / H);
		for (let x = 0; x < W; x += 1) {
			const glow = Math.max(0, 1 - Math.hypot(x - W * 0.26, y - H * 0.2) / (W * 0.6)) ** 2;
			blend(out, x, y, mix(base, cover.soft, glow * 0.24), 255);
		}
	}

	// A large botanical field, cropped like a printed plate.
	fillRect(out, 690, 86, 1090, H, cover.tint, cover.dark ? 48 : 88);
	circle(out, 890, 86, 200, cover.tint, cover.dark ? 48 : 88);
	fillRect(out, 690, 80, 1090, 84, cover.accent, 60);

	if (cover.grid) {
		for (let x = 706; x < 1090; x += 28) fillRect(out, x, 90, x + 1, H - 58, cover.accent, 18);
		for (let y = 110; y < H - 58; y += 28) fillRect(out, 690, y, 1090, y + 1, cover.accent, 18);
	}

	if (cover.blocks) {
		fillRect(out, 730, 112, 820, 202, [213, 94, 76], 210);
		fillRect(out, 830, 112, 884, 202, [64, 111, 139], 190);
		fillRect(out, 894, 112, 1010, 202, [226, 179, 79], 220);
		fillRect(out, 1010, 202, 1088, 294, [113, 84, 128], 150);
	}

	// Paper grain and dither.
	let seed = 0x1f123bb5;
	const rand = () => {
		seed ^= seed << 13;
		seed ^= seed >>> 17;
		seed ^= seed << 5;
		return (seed >>> 0) / 4294967296;
	};
	for (let i = 0; i < 22000; i += 1) {
		const x = Math.floor(rand() * W);
		const y = Math.floor(rand() * H);
		blend(out, x, y, rand() > 0.5 ? [255, 255, 255] : [30, 25, 25], cover.dark ? 9 : 6);
	}

	// Thin registration frame.
	fillRect(out, 38, 38, W - 38, 39, cover.ink, 110);
	fillRect(out, 38, H - 39, W - 38, H - 38, cover.ink, 110);
	fillRect(out, 38, 38, 39, H - 38, cover.ink, 110);
	fillRect(out, W - 39, 38, W - 38, H - 38, cover.ink, 110);

	// Corner marks.
	for (const [x, y, sx, sy] of [
		[38, 38, 1, 1],
		[W - 38, 38, -1, 1],
		[38, H - 38, 1, -1],
		[W - 38, H - 38, -1, -1]
	]) {
		fillRect(out, x, y, x + sx * 28, y + sy * 2, cover.ink, 180);
		fillRect(out, x, y, x + sx * 2, y + sy * 28, cover.ink, 180);
	}

	// Large ghosted issue number.
	drawText(out, cover.number, 150, 392, 34, cover.accent, cover.dark ? 25 : 22);
}

function drawText(out, text, left, top, scale, color, alpha = 255) {
	let x = left;
	for (const char of text.toUpperCase()) {
		const rows = (FONT[char] ?? FONT[' ']).split(' ');
		for (let row = 0; row < rows.length; row += 1) {
			for (let col = 0; col < rows[row].length; col += 1) {
				if (rows[row][col] === '1') {
					fillRect(
						out,
						x + col * scale,
						top + row * scale,
						x + (col + 1) * scale,
						top + (row + 1) * scale,
						color,
						alpha
					);
				}
			}
		}
		x += 6 * scale;
	}
}

function load(imgPath) {
	return PNG.sync.read(readFileSync(resolve(ROOT, 'static/art/flowers', `${imgPath}.png`)));
}

function sample(img, x, y) {
	const x0 = clamp(Math.floor(x), 0, img.width - 1);
	const y0 = clamp(Math.floor(y), 0, img.height - 1);
	const x1 = Math.min(img.width - 1, x0 + 1);
	const y1 = Math.min(img.height - 1, y0 + 1);
	const fx = clamp(x - x0, 0, 1);
	const fy = clamp(y - y0, 0, 1);
	const at = (sx, sy) => {
		const i = (sy * img.width + sx) * 4;
		return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
	};
	const a = at(x0, y0);
	const b = at(x1, y0);
	const c = at(x0, y1);
	const d = at(x1, y1);
	const top = a.map((v, i) => v + (b[i] - v) * fx);
	const bottom = c.map((v, i) => v + (d[i] - v) * fx);
	return top.map((v, i) => v + (bottom[i] - v) * fy);
}

function drawFlower(out, img, stem) {
	const height = stem.h;
	const width = (img.width / img.height) * height;
	const bottom = H - 10;
	const rad = (stem.a * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const reach = height * Math.abs(sin) + width * 0.5 + 20;
	const left = Math.max(0, Math.floor(stem.x - reach));
	const right = Math.min(W, Math.ceil(stem.x + reach));
	const top = Math.max(0, Math.floor(bottom - height - reach * 0.5));
	const bottomY = Math.min(H, Math.ceil(bottom + reach * 0.5));

	// Soft grounding shadow.
	circle(out, stem.x, H - 26, 72, [20, 16, 16], 16);

	for (let y = top; y < bottomY; y += 1) {
		for (let x = left; x < right; x += 1) {
			const dx = x - stem.x;
			const dy = y - bottom;
			const lx = dx * cos + dy * sin;
			const ly = -dx * sin + dy * cos;
			if (lx < -width / 2 || lx > width / 2 || ly > 0 || ly < -height) continue;
			const sx = ((lx + width / 2) / width) * img.width;
			const sy = ((ly + height) / height) * img.height;
			const [r, g, b, a] = sample(img, sx, sy);
			if (a < 8) continue;
			blend(out, x, y, [r, g, b], (a / 255) * (stem.alpha ?? 1) * 255);
		}
	}
}

function drawDetails(out, cover) {
	// Crop marks and little confetti pixels keep the plate feeling printed.
	const rand = (n) => {
		let x = Math.sin(n * 91.17 + 13.3) * 43758.5453;
		return x - Math.floor(x);
	};
	for (let i = 0; i < 14; i += 1) {
		const x = 250 + rand(i) * 700;
		const y = 110 + rand(i + 20) * 380;
		const size = rand(i + 40) > 0.75 ? 5 : 3;
		fillRect(out, x, y, x + size, y + size, cover.accent, 90);
	}

	// Masthead.
	drawText(out, 'PETALBIT', 58, 56, 2, cover.ink, 235);
	drawText(out, 'JOURNAL', W - 58 - 6 * 2 * 7 + 2, 56, 2, cover.ink, 235);
	fillRect(out, 58, 86, 214, 88, cover.ink, 140);

	// Footer label.
	drawText(out, cover.label, 58, H - 82, 2, cover.ink, 220);
	drawText(out, `NO ${cover.number}`, 58, H - 58, 1, cover.ink, 145);
	drawText(out, 'A LITTLE JOURNAL OF FEELINGS AND FLOWERS', 260, H - 58, 1, cover.ink, 120);

	// A small flower seal.
	const cx = W - 98;
	const cy = H - 78;
	circle(out, cx, cy, 18, cover.soft, cover.dark ? 40 : 220);
	circle(out, cx, cy, 17, cover.ink, 120);
	circle(out, cx, cy, 5, cover.accent, 230);
	fillRect(out, cx - 2, cy - 17, cx + 2, cy - 7, cover.accent, 180);
	fillRect(out, cx - 17, cy - 2, cx - 7, cy + 2, cover.accent, 180);
	fillRect(out, cx + 7, cy - 2, cx + 17, cy + 2, cover.accent, 180);
	fillRect(out, cx - 2, cy + 7, cx + 2, cy + 17, cover.accent, 180);
}

const OUT_DIR = resolve(ROOT, 'static/images/blog');
const SIZES = [
	{ suffix: '', width: 1200, height: 630 },
	{ suffix: '-900', width: 900, height: 473 },
	{ suffix: '-600', width: 600, height: 315 },
	{ suffix: '-400', width: 400, height: 210 }
];

try {
	execFileSync('cwebp', ['-version'], { stdio: 'ignore' });
} catch {
	throw new Error('cwebp is required to generate WebP covers. Install libwebp.');
}

mkdirSync(OUT_DIR, { recursive: true });

for (const cover of COVERS) {
	const out = canvas();
	paintBackground(out, cover);
	for (const stem of cover.flowers) {
		drawFlower(out, load(stem.id), stem);
	}
	drawDetails(out, cover);

	const png = new PNG({ width: W, height: H });
	png.data = out;
	const source = resolve(OUT_DIR, `${cover.slug}-source.png`);
	writeFileSync(source, PNG.sync.write(png, { colorType: 6, inputColorType: 6, deflateLevel: 9 }));

	for (const size of SIZES) {
		const output = resolve(OUT_DIR, `${cover.slug}${size.suffix}.webp`);
		execFileSync(
			'cwebp',
			[
				'-quiet',
				'-q',
				'82',
				'-m',
				'6',
				'-metadata',
				'none',
				'-resize',
				String(size.width),
				String(size.height),
				source,
				'-o',
				output
			],
			{ stdio: 'pipe' }
		);
	}

	// Social scrapers are most reliable with a conventional raster fallback.
	copyFileSync(source, resolve(OUT_DIR, `${cover.slug}-og.png`));
	rmSync(source);
	rmSync(resolve(OUT_DIR, `${cover.slug}.png`), { force: true });
	rmSync(resolve(OUT_DIR, `${cover.slug}-card.png`), { force: true });
	console.log(`wrote ${cover.slug}.webp + responsive sizes + og.png`);
}
