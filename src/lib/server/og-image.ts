import { PNG } from 'pngjs';
import type { Bouquet } from '$lib/types';
import { getBouquetBackground } from '$lib/data/backgrounds';
import { getBouquetPaper } from '$lib/data/papers';
import { getFlower } from '$lib/data/flowers';

const W = 1200;
const H = 630;

type Bitmap = { width: number; height: number; data: Buffer };
type Rgb = [number, number, number];

const assetCache = new Map<string, Promise<Bitmap>>();

async function loadBitmap(origin: string, path: string): Promise<Bitmap> {
	const href = new URL(path, origin).href;
	const cached = assetCache.get(href);
	if (cached) return cached;

	const pending = fetch(href).then(async (res) => {
		if (!res.ok) throw new Error(`asset ${path} returned ${res.status}`);
		return PNG.sync.read(Buffer.from(await res.arrayBuffer())) as Bitmap;
	});

	assetCache.set(href, pending);
	try {
		return await pending;
	} catch (cause) {
		assetCache.delete(href);
		throw cause;
	}
}

const FONT: Record<string, string> = {
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
	"'": '00100 00100 00000 00000 00000 00000 00000',
	'.': '00000 00000 00000 00000 00000 00100 00100',
	'&': '01100 10010 10100 01000 10101 10010 01101'
};

const INK: Rgb = [43, 31, 34];
const ROSE: Rgb = [158, 69, 86];
const MUTED: Rgb = [134, 114, 104];
const CREAM: Rgb = [255, 250, 242];
const BLUSH: Rgb = [236, 207, 202];

const PALETTES: Record<string, { top: Rgb; bottom: Rgb; glow: Rgb; glow2: Rgb }> = {
	flowery: { top: [255, 248, 240], bottom: [240, 213, 208], glow: [255, 238, 224], glow2: [246, 216, 216] },
	warp: { top: [253, 244, 236], bottom: [229, 218, 238], glow: [255, 236, 224], glow2: [232, 216, 246] },
	liquid: { top: [247, 249, 244], bottom: [226, 231, 241], glow: [228, 243, 245], glow2: [233, 219, 242] },
	wave: { top: [249, 245, 234], bottom: [211, 228, 239], glow: [255, 251, 234], glow2: [218, 236, 246] },
	rain: { top: [246, 244, 239], bottom: [214, 226, 234], glow: [244, 248, 250], glow2: [220, 231, 238] },
	cloudy: { top: [253, 249, 238], bottom: [226, 233, 238], glow: [255, 250, 234], glow2: [238, 243, 244] }
};

function mix(a: Rgb, b: Rgb, t: number): Rgb {
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t)
	];
}

function createCanvas(): Buffer {
	return Buffer.alloc(W * H * 4);
}

function blend(out: Buffer, x: number, y: number, color: Rgb, alpha = 255) {
	if (x < 0 || y < 0 || x >= W || y >= H || alpha <= 0) return;
	const i = (y * W + x) * 4;
	const a = Math.min(1, alpha / 255);
	const inv = 1 - a;
	out[i] = Math.round(color[0] * a + out[i] * inv);
	out[i + 1] = Math.round(color[1] * a + out[i + 1] * inv);
	out[i + 2] = Math.round(color[2] * a + out[i + 2] * inv);
	out[i + 3] = Math.max(out[i + 3], Math.round(alpha));
}

function fillRect(out: Buffer, x0: number, y0: number, x1: number, y1: number, color: Rgb, alpha = 255) {
	const left = Math.max(0, Math.floor(Math.min(x0, x1)));
	const right = Math.min(W, Math.ceil(Math.max(x0, x1)));
	const top = Math.max(0, Math.floor(Math.min(y0, y1)));
	const bottom = Math.min(H, Math.ceil(Math.max(y0, y1)));
	for (let y = top; y < bottom; y += 1) {
		for (let x = left; x < right; x += 1) blend(out, x, y, color, alpha);
	}
}

function circle(out: Buffer, cx: number, cy: number, radius: number, color: Rgb, alpha = 255) {
	const r2 = radius * radius;
	for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
		for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
			const dx = x - cx;
			const dy = y - cy;
			if (dx * dx + dy * dy <= r2) blend(out, x, y, color, alpha);
		}
	}
}

function drawBitmap(out: Buffer, img: Bitmap, dx: number, dy: number, dw: number, dh: number) {
	const left = Math.max(0, Math.floor(dx));
	const right = Math.min(W, Math.ceil(dx + dw));
	const top = Math.max(0, Math.floor(dy));
	const bottom = Math.min(H, Math.ceil(dy + dh));
	for (let y = top; y < bottom; y += 1) {
		const sy = Math.min(img.height - 1, Math.floor(((y - dy) / dh) * img.height));
		for (let x = left; x < right; x += 1) {
			const sx = Math.min(img.width - 1, Math.floor(((x - dx) / dw) * img.width));
			const si = (sy * img.width + sx) * 4;
			const alpha = img.data[si + 3];
			if (alpha === 0) continue;
			blend(
				out,
				x,
				y,
				[img.data[si], img.data[si + 1], img.data[si + 2]],
				alpha
			);
		}
	}
}

/** Draw an image rotated around its bottom-center anchor. */
function drawStem(
	out: Buffer,
	img: Bitmap,
	cx: number,
	bottom: number,
	height: number,
	angleDeg: number
) {
	const width = (img.width / img.height) * height;
	const rad = (angleDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const reach = height * Math.abs(sin) + width * 0.5 + 4;
	const left = Math.max(0, Math.floor(cx - reach));
	const right = Math.min(W, Math.ceil(cx + reach));
	const top = Math.max(0, Math.floor(bottom - height - reach * 0.5));
	const bottomY = Math.min(H, Math.ceil(bottom + reach * 0.5));

	for (let y = top; y < bottomY; y += 1) {
		for (let x = left; x < right; x += 1) {
			const dx = x - cx;
			const dy = y - bottom;
			const lx = dx * cos + dy * sin;
			const ly = -dx * sin + dy * cos;
			if (lx < -width / 2 || lx > width / 2 || ly > 0 || ly < -height) continue;
			const sx = Math.min(img.width - 1, Math.max(0, Math.floor(((lx + width / 2) / width) * img.width)));
			const sy = Math.min(img.height - 1, Math.max(0, Math.floor(((ly + height) / height) * img.height)));
			const si = (sy * img.width + sx) * 4;
			const alpha = img.data[si + 3];
			if (alpha === 0) continue;
			blend(out, x, y, [img.data[si], img.data[si + 1], img.data[si + 2]], alpha);
		}
	}
}

function glyphRows(char: string): string[] {
	const glyph = FONT[char] ?? FONT[' '];
	return glyph.split(' ');
}

function textWidth(text: string, scale: number): number {
	return Math.max(0, text.length * 6 * scale - scale);
}

function fitScale(text: string, maxWidth: number, preferred: number): number {
	let scale = preferred;
	while (scale > 1 && textWidth(text, scale) > maxWidth) scale -= 1;
	return scale;
}

function drawText(
	out: Buffer,
	text: string,
	cx: number,
	top: number,
	scale: number,
	color: Rgb,
	alpha = 255
) {
	const clean = text.toUpperCase();
	const width = textWidth(clean, scale);
	let x = Math.round(cx - width / 2);
	for (const char of clean) {
		const rows = glyphRows(char);
		for (let row = 0; row < rows.length; row += 1) {
			for (let col = 0; col < rows[row].length; col += 1) {
				if (rows[row][col] === '1') {
					fillRect(out, x + col * scale, top + row * scale, x + (col + 1) * scale, top + (row + 1) * scale, color, alpha);
				}
			}
		}
		x += 6 * scale;
	}
}

function paintBackground(out: Buffer, kind: string) {
	const palette = PALETTES[kind] ?? PALETTES.flowery;
	const glowX = W * 0.26;
	const glowY = H * 0.12;
	const glow2X = W * 0.86;
	const glow2Y = H * 0.86;

	for (let y = 0; y < H; y += 1) {
		const base = mix(palette.top, palette.bottom, y / H);
		for (let x = 0; x < W; x += 1) {
			const d1 = Math.hypot(x - glowX, y - glowY);
			const d2 = Math.hypot(x - glow2X, y - glow2Y);
			const a1 = Math.max(0, 1 - d1 / (W * 0.55)) ** 2;
			const a2 = Math.max(0, 1 - d2 / (W * 0.5)) ** 2;
			const color = mix(mix(base, palette.glow, a1 * 0.55), palette.glow2, a2 * 0.4);
			blend(out, x, y, color, 255);
		}
	}

	// Soft bokeh, mirroring the live background.
	const dots = [
		[0.12, 0.22, 80],
		[0.24, 0.76, 58],
		[0.47, 0.14, 46],
		[0.62, 0.66, 92],
		[0.9, 0.46, 44]
	];
	for (const [px, py, radius] of dots) {
		circle(out, px * W, py * H, radius, [255, 253, 246], 28);
	}

	// Fine grain keeps the large flat washes from looking synthetic.
	let seed = 0x9e3779b9;
	const rand = () => {
		seed ^= seed << 13;
		seed ^= seed >>> 17;
		seed ^= seed << 5;
		return (seed >>> 0) / 4294967296;
	};
	for (let i = 0; i < 26_000; i += 1) {
		const x = Math.floor(rand() * W);
		const y = Math.floor(rand() * H);
		const shade = rand() > 0.5 ? 255 : 70;
		blend(out, x, y, [shade, shade, shade], 7);
	}
}

function paintCard(out: Buffer, bouquet: Bouquet, stems: number) {
	const left = 686;
	const right = 1128;
	const top = 132;
	const bottom = 506;

	fillRect(out, left + 12, top + 14, right + 12, bottom + 14, BLUSH, 255);
	fillRect(out, left, top, right, bottom, CREAM, 255);
	fillRect(out, left, top, right, top + 3, INK, 255);
	fillRect(out, left, top, left + 3, bottom, INK, 255);
	fillRect(out, right - 3, top, right, bottom, INK, 255);
	fillRect(out, left, bottom - 3, right, bottom, INK, 255);

	const cx = (left + right) / 2;
	fillRect(out, left + 34, top + 34, right - 34, top + 35, INK, 40);

	drawText(out, 'PETALBIT', cx, top + 52, 3, INK);
	fillRect(out, left + 34, top + 90, right - 34, top + 91, INK, 40);

	drawText(out, 'FOR', cx, top + 118, 2, MUTED);

	const name = (bouquet.recipient || 'YOU').toUpperCase();
	const nameScale = fitScale(name, right - left - 70, 8);
	drawText(out, name, cx, top + 150, nameScale, ROSE, 255);

	const ruleY = top + 150 + nameScale * 7 + 26;
	fillRect(out, cx - 26, ruleY, cx + 26, ruleY + 2, INK, 90);

	const sender = `FROM ${(bouquet.sender || 'A FRIEND').toUpperCase()}`;
	const senderScale = fitScale(sender, right - left - 56, 2);
	drawText(out, sender, cx, ruleY + 26, senderScale, MUTED);

	drawText(out, `${stems} STEMS`, cx, bottom - 52, 2, MUTED);
}

export async function renderBouquetOg(bouquet: Bouquet, origin: string): Promise<Buffer> {
	const out = createCanvas();
	const kind = getBouquetBackground(bouquet.background).kind;
	paintBackground(out, kind);

	const centerX = 372;
	const bottom = 588;

	const paper = getBouquetPaper(bouquet.paper);
	try {
		const paperImg = await loadBitmap(origin, paper.paperImage);
		const paperHeight = 360;
		const paperWidth = (paperImg.width / paperImg.height) * paperHeight;
		drawBitmap(out, paperImg, centerX - paperWidth / 2, bottom - paperHeight, paperWidth, paperHeight);
	} catch {
		/* the bouquet still renders without its wrap */
	}

	const ids = bouquet.flowers.filter((id) => getFlower(id)).slice(0, 7);
	const n = ids.length;
	const fan = ids.map((id, i) => {
		const pos = n === 1 ? 0 : i / (n - 1) - 0.5;
		return {
			id,
			pos,
			angle: pos * 58,
			height: 384 - Math.abs(pos) * 52,
			x: centerX + pos * 290,
			y: bottom - 30 + Math.abs(pos) * 14
		};
	});

	// Edge blooms sit behind, the centre ones on top.
	const ordered = [...fan].sort((a, b) => Math.abs(b.pos) - Math.abs(a.pos));
	for (const stem of ordered) {
		const flower = getFlower(stem.id);
		if (!flower) continue;
		try {
			const img = await loadBitmap(origin, flower.image);
			drawStem(out, img, stem.x, stem.y, stem.height, stem.angle);
		} catch {
			/* skip a missing bloom */
		}
	}

	try {
		const logo = await loadBitmap(origin, '/art/logo-mark.png');
		circle(out, centerX, 548, 40, CREAM, 255);
		circle(out, centerX, 548, 39, INK, 255);
		circle(out, centerX, 548, 36, BLUSH, 255);
		drawBitmap(out, logo, centerX - 24, 524, 48, 48);
	} catch {
		/* logo is decorative */
	}

	paintCard(out, bouquet, Math.max(1, n));

	const png = new PNG({ width: W, height: H });
	png.data = out;
	return PNG.sync.write(png);
}
