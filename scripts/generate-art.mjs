/**
 * Petalbit art generator.
 *
 * Renders high-density pixel art (petal shaping + lighting + colour ramps +
 * ordered dithering) into PNG files under /static/art.
 *
 * Run: npm run art
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/* ------------------------------------------------------------------ colour */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function hslToRgb(h, s, l) {
	h = ((h % 360) + 360) % 360;
	s = clamp01(s);
	l = clamp01(l);
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hp = h / 60;
	const x = c * (1 - Math.abs((hp % 2) - 1));
	let r = 0;
	let g = 0;
	let b = 0;
	if (hp < 1) [r, g, b] = [c, x, 0];
	else if (hp < 2) [r, g, b] = [x, c, 0];
	else if (hp < 3) [r, g, b] = [0, c, x];
	else if (hp < 4) [r, g, b] = [0, x, c];
	else if (hp < 5) [r, g, b] = [x, 0, c];
	else [r, g, b] = [c, 0, x];
	const m = l - c / 2;
	return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Build a pixel-art ramp (dark -> light) with warm highlights and cool shadows. */
function ramp(h, s, l0, l1, steps = 8, opts = {}) {
	const { hueShift = 10, satFalloff = 0.25, satBase = 0 } = opts;
	const out = [];
	for (let i = 0; i < steps; i++) {
		const t = steps === 1 ? 0 : i / (steps - 1);
		const l = l0 + (l1 - l0) * t;
		const shade = t;
		const ss = Math.max(0, s * (satBase || 1) * (1 - satFalloff * Math.max(0, shade - 0.55)));
		out.push(hslToRgb(h + hueShift * (shade - 0.5), ss, l));
	}
	return out;
}

function mix(a, b, t) {
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t)
	];
}

/* ------------------------------------------------------------------- noise */

function hash(x, y, seed = 1) {
	let n = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
	n = (n ^ (n >>> 13)) * 1274126177;
	n = n >>> 0;
	return (n ^ (n >>> 16)) / 4294967295;
}

function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const BAYER = [
	[0, 8, 2, 10],
	[12, 4, 14, 6],
	[3, 11, 1, 9],
	[15, 7, 13, 5]
].map((row) => row.map((v) => v / 16 - 0.5));

const LIGHT = (() => {
	const v = [-0.44, -0.62, 0.65];
	const len = Math.hypot(...v);
	return v.map((n) => n / len);
})();

function sampleRamp(rampColors, t, x, y, dither = 1, seed = 1, grain = 0.16) {
	const n = rampColors.length;
	let lvl = clamp01(t) * (n - 1);
	if (dither > 0) lvl += BAYER[y & 3][x & 3] * dither * 1.05;
	lvl += (hash(x, y, seed) - 0.5) * grain;
	const i = Math.max(0, Math.min(n - 1, Math.round(lvl)));
	return rampColors[i];
}

/* ------------------------------------------------------------------ canvas */

class Img {
	/** `s` = art units -> pixels. 2 renders sub-pixel geometry (2x sprites). */
	constructor(w, h, s = 1) {
		this.w = w;
		this.h = h;
		this.s = s;
		this.rgb = new Float32Array(w * h * 3);
		this.a = new Float32Array(w * h);
	}

	blend(x, y, color, alpha = 1) {
		if (alpha <= 0 || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
		const i = y * this.w + x;
		const da = this.a[i];
		const oa = alpha + da * (1 - alpha);
		if (oa <= 0) return;
		for (let c = 0; c < 3; c++) {
			this.rgb[i * 3 + c] = (color[c] * alpha + this.rgb[i * 3 + c] * da * (1 - alpha)) / oa;
		}
		this.a[i] = oa;
	}

	toPNG() {
		const { w, h } = this;
		const raw = Buffer.alloc((w * 4 + 1) * h);
		for (let y = 0; y < h; y++) {
			const row = y * (w * 4 + 1);
			raw[row] = 0;
			for (let x = 0; x < w; x++) {
				const i = y * w + x;
				const a = this.a[i];
				const o = row + 1 + x * 4;
				if (a < 0.55) {
					raw[o] = raw[o + 1] = raw[o + 2] = raw[o + 3] = 0;
					continue;
				}
				raw[o] = Math.round(clamp01(this.rgb[i * 3] / 255) * 255);
				raw[o + 1] = Math.round(clamp01(this.rgb[i * 3 + 1] / 255) * 255);
				raw[o + 2] = Math.round(clamp01(this.rgb[i * 3 + 2] / 255) * 255);
				raw[o + 3] = 255;
			}
		}
		return encodePNG(w, h, raw);
	}
}

/* --------------------------------------------------------------- png write */

const CRC_TABLE = (() => {
	const t = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c;
	}
	return t;
})();

function crc32(buf) {
	let c = -1;
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return (c ^ -1) >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length, 0);
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body), 0);
	return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, raw) {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

/* --------------------------------------------------------------- primitives */

/**
 * Superellipse "petal" with volume shading, rim darkening and optional veins.
 */
function petal(img, o) {
	const {
		cx,
		cy,
		rx,
		ry,
		rot = 0,
		power = 2,
		ramp,
		alpha = 1,
		rimPx = 1.2,
		rimMul = 0.5,
		veins = 0,
		veinStrength = 0.12,
		dither = 1,
		seed = 7,
		lightGain = 1,
		edgeFalloff = 0.5,
		insideWarm = 0,
		innerTip = 0,
		baseShade = 0,
		sheen = 0,
		grain = 0.16,
		notch = 0,
		translucent = 0,
		teeth = 0,
		toothDepth = 0.06
	} = o;

	const s = img.s;
	const CX = cx * s;
	const CY = cy * s;
	const RX = rx * s;
	const RY = ry * s;
	const cos = Math.cos(rot);
	const sin = Math.sin(rot);
	const reach = Math.max(RX, RY);
	const x0 = Math.max(0, Math.floor(CX - reach - 1));
	const x1 = Math.min(img.w - 1, Math.ceil(CX + reach + 1));
	const y0 = Math.max(0, Math.floor(CY - reach - 1));
	const y1 = Math.min(img.h - 1, Math.ceil(CY + reach + 1));
	const rim = rimPx * s;

	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const dx = x + 0.5 - CX;
			const dy = y + 0.5 - CY;
			const u = (dx * cos + dy * sin) / RX;
			const v = (-dx * sin + dy * cos) / RY;
			const au = Math.abs(u);
			const av = Math.abs(v);
			const r = Math.pow(Math.pow(au, power) + Math.pow(av, power), 1 / power);
			if (r > 1) continue;

			// notched tip (daisies, some rays): bite a wedge out of the tip
			if (notch > 0 && u > 0.55 && av < notch * (u - 0.55) / 0.45) continue;

			// toothed margin (rose and daisy leaves): wavy edge, not a hard blade
			if (teeth > 0) {
				const ang = Math.atan2(v, u);
				const wobble = 1 + toothDepth * (Math.abs(Math.sin(ang * teeth)) - 0.55);
				if (r > wobble) continue;
			}

			const z = Math.sqrt(Math.max(0, 1 - r * r));
			const nx = u * cos - v * sin;
			const ny = u * sin + v * cos;
			const diff = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + z * LIGHT[2]);
			let t = 0.5 + 0.5 * diff * lightGain;
			t = t * (0.72 + edgeFalloff * z) + 0.1 * z;

			// cupped petal: tips catch a little more light
			t += innerTip * Math.pow(r, 3) * 0.35;

			// ambient occlusion where the petal tucks under its neighbours
			if (baseShade > 0) t -= baseShade * Math.pow(1 - r, 1.6);

			// silky highlight running along the lit side of the cup
			if (sheen > 0) {
				const band = Math.exp(-Math.pow((r - 0.62) * 3.4, 2)) * Math.max(0, diff - 0.35);
				t += sheen * band;
			}

			if (veins > 0) {
				const ang = Math.atan2(v, u);
				const vv = Math.max(0, Math.sin(ang * veins));
				t -= veinStrength * Math.pow(vv, 2.2) * (0.35 + 0.65 * r);
			}
			if (insideWarm > 0) t += insideWarm * Math.pow(1 - r, 2);

			// dark rim keeps overlapping petals separated (pixel-art edge)
			const dEdge = (1 - r) * Math.min(RX, RY);
			if (dEdge < rim) t *= rimMul;

			const a = alpha * (translucent > 0 ? 1 - translucent * Math.pow(r, 3) : 1);
			img.blend(x, y, sampleRamp(ramp, t, x, y, dither, seed, grain), a);
		}
	}
}

/** Tapered capsule along a polyline, used for stems and ribbons. */
function stroke(img, pts, o) {
	const {
		width = 3,
		widthEnd = width,
		ramp,
		alpha = 1,
		dither = 0.8,
		seed = 3,
		round = true,
		shade = 0.9,
		highlight = 0
	} = o;
	const scale = img.s;
	pts = pts.map(([px, py]) => [px * scale, py * scale]);
	const w0 = width * scale;
	const w1 = widthEnd * scale;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const [px, py] of pts) {
		minX = Math.min(minX, px);
		minY = Math.min(minY, py);
		maxX = Math.max(maxX, px);
		maxY = Math.max(maxY, py);
	}
	const pad = Math.max(w0, w1) + 2;
	const x0 = Math.max(0, Math.floor(minX - pad));
	const x1 = Math.min(img.w - 1, Math.ceil(maxX + pad));
	const y0 = Math.max(0, Math.floor(minY - pad));
	const y1 = Math.min(img.h - 1, Math.ceil(maxY + pad));

	// cumulative length for width interpolation
	const segs = [];
	let total = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const [ax, ay] = pts[i];
		const [bx, by] = pts[i + 1];
		const len = Math.hypot(bx - ax, by - ay);
		segs.push({ ax, ay, bx, by, len, start: total });
		total += len;
	}

	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			let best = null;
			for (const s of segs) {
				const vx = s.bx - s.ax;
				const vy = s.by - s.ay;
				const wx = x + 0.5 - s.ax;
				const wy = y + 0.5 - s.ay;
				const len2 = vx * vx + vy * vy || 1;
				const h = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
				const px = s.ax + vx * h;
				const py = s.ay + vy * h;
				const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
				const along = (s.start + s.len * h) / (total || 1);
				const w = w0 + (w1 - w0) * along;
				const cover = w / 2 + 0.5 - d;
				if (cover > 0 && (!best || cover > best.cover)) {
					best = { cover, d, w, nx: -vy / (s.len || 1), ny: vx / (s.len || 1), along };
				}
			}
			if (!best) continue;
			if (!round && best.cover < 0.5) continue;
			const diff = 0.5 + 0.5 * (best.nx * LIGHT[0] + best.ny * LIGHT[1]);
			let t = 0.35 + 0.55 * diff;
			if (best.d > best.w / 2 - 1.1 * scale) t *= 0.55; // rim
			if (highlight > 0 && best.cover > 0.6) {
				const side = best.nx * LIGHT[0] + best.ny * LIGHT[1];
				if (side > 0.45) t += highlight * (best.cover - 0.5);
			}
			img.blend(x, y, sampleRamp(ramp, t * shade, x, y, dither, seed), alpha * Math.min(1, best.cover));
		}
	}
}

/** Filled polygon with a flat-ish vertical gradient (paper, ribbons). */
function poly(img, points, o) {
	const { ramp, alpha = 1, dither = 0.7, seed = 5, shadeFn = null } = o;
	const s = img.s;
	points = points.map(([px, py]) => [px * s, py * s]);
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const [px, py] of points) {
		minX = Math.min(minX, px);
		minY = Math.min(minY, py);
		maxX = Math.max(maxX, px);
		maxY = Math.max(maxY, py);
	}
	for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(img.h - 1, Math.ceil(maxY)); y++) {
		for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(img.w - 1, Math.ceil(maxX)); x++) {
			if (!pointInPoly(x + 0.5, y + 0.5, points)) continue;
			let t = 0.5;
			if (shadeFn) t = shadeFn(x / s, y / s);
			img.blend(x, y, sampleRamp(ramp, clamp01(t), x, y, dither, seed), alpha);
		}
	}
}

function pointInPoly(x, y, pts) {
	let inside = false;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [xi, yi] = pts[i];
		const [xj, yj] = pts[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

/* --------------------------------------------------------------- palettes */

const P = {
	stem: ramp(120, 0.3, 0.16, 0.56, 10, { hueShift: 18, satFalloff: 0.15 }),
	stemDeep: ramp(130, 0.34, 0.12, 0.42, 7, { hueShift: 12 }),
	leaf: ramp(126, 0.34, 0.13, 0.55, 10, { hueShift: 26 }),
	leafRib: ramp(122, 0.26, 0.32, 0.68, 8, { hueShift: 18 }),
	leafVein: ramp(128, 0.3, 0.2, 0.46, 6),
	rosePale: ramp(346, 0.42, 0.5, 0.95, 10, { hueShift: 6 }),
	roseShadow: ramp(340, 0.55, 0.12, 0.46, 8),
	peonyDeep: ramp(352, 0.5, 0.2, 0.62, 8),
	disc: ramp(20, 0.5, 0.1, 0.4, 8),
	discWarm: ramp(26, 0.62, 0.24, 0.58, 8),
	pollen: ramp(48, 0.9, 0.46, 0.97, 7),
	anther: ramp(28, 0.62, 0.26, 0.62, 7),
	lilacDeep: ramp(272, 0.5, 0.2, 0.56, 8),
	lilacPale: ramp(282, 0.36, 0.5, 0.93, 9, { hueShift: 6 }),
	sagePale: ramp(126, 0.16, 0.45, 0.85, 8, { hueShift: 12 }),
	euc: ramp(155, 0.15, 0.46, 0.8, 9, { hueShift: 10, satFalloff: 0.1 }),
	eucPale: ramp(162, 0.12, 0.56, 0.88, 9, { hueShift: 8, satFalloff: 0.08 }),
	eucDeep: ramp(158, 0.22, 0.3, 0.56, 8),
	rose: ramp(344, 0.52, 0.2, 0.86, 9, { hueShift: 8 }),
	roseDeep: ramp(344, 0.5, 0.16, 0.7, 8),
	blush: ramp(350, 0.55, 0.3, 0.93, 9, { hueShift: 6 }),
	cream: ramp(36, 0.5, 0.42, 0.97, 8, { hueShift: 10 }),
	white: ramp(45, 0.16, 0.5, 0.99, 8, { hueShift: 14 }),
	gold: ramp(44, 0.78, 0.32, 0.93, 9, { hueShift: 8 }),
	sun: ramp(38, 0.85, 0.28, 0.88, 9, { hueShift: 6 }),
	seed: ramp(20, 0.45, 0.12, 0.46, 7),
	lilac: ramp(276, 0.42, 0.26, 0.86, 8, { hueShift: 10 }),
	peony: ramp(348, 0.48, 0.24, 0.9, 9, { hueShift: 8 }),
	sage: ramp(128, 0.19, 0.3, 0.78, 8, { hueShift: 14 }),

	orchidPale: ramp(334, 0.32, 0.55, 0.98, 9, { hueShift: 6 }),
	orchid: ramp(328, 0.44, 0.34, 0.9, 9, { hueShift: 8 }),
	orchidPetal: ramp(330, 0.46, 0.42, 0.95, 9, { hueShift: 7 }),
	orchidDeep: ramp(316, 0.56, 0.24, 0.62, 8),
	orchidLip: ramp(306, 0.6, 0.28, 0.66, 8),
	orchidThroat: ramp(44, 0.76, 0.5, 0.97, 8),
	iris: ramp(268, 0.44, 0.26, 0.86, 9, { hueShift: 10 }),
	irisDeep: ramp(272, 0.5, 0.16, 0.56, 8),
	irisPale: ramp(280, 0.28, 0.56, 0.95, 9, { hueShift: 8 }),
	beard: ramp(46, 0.85, 0.5, 0.98, 7),
	paper: ramp(34, 0.24, 0.55, 0.95, 8, { hueShift: 8 }),
	ribbon: ramp(352, 0.42, 0.22, 0.82, 8, { hueShift: 8 })
};

/* ---------------------------------------------------------------- flowers */

const W = 150;
const H = 232;
const CX = 75;
const BASE = H - 4;
/** Supersampling: geometry is authored in art units, rasterised at 2x. */
const SS = 3;

function canvas() {
	return new Img(W * SS, H * SS, SS);
}

function stemPath(topY, bend = 0, width = 4.6) {
	// gentle S curve from bloom base to the canvas base
	const pts = [];
	for (let i = 0; i <= 10; i++) {
		const t = i / 10;
		const y = topY + (BASE - topY) * t;
		const x = CX + bend * Math.sin(t * Math.PI * 0.9) * 6 + bend * t * 1.4;
		pts.push([x, y]);
	}
	pts.topY = topY;
	pts.width = width;
	return pts;
}

function drawStem(img, pts) {
	// the stalk runs a little way up inside the bloom, so there is never a gap
	// between the flower and its stem once the head is painted over it
	stroke(img, [[pts[0][0], pts.topY - 12], ...pts], {
		width: pts.width,
		widthEnd: pts.width * 1.2,
		ramp: P.stem,
		seed: 11,
		shade: 0.98,
		highlight: 0.55
	});
}

function stemFor(img, topY, bend = 0, width = 4.6) {
	const pts = stemPath(topY, bend, width);
	drawStem(img, pts);
	return pts;
}

/**
 * Leaf blade: pointed, slightly cupped, dark rim, midrib and lateral veins.
 * `notate` adds the serrated margin roses and daisies have.
 */
function leaf(img, x, y, len, width, rot, ramp = P.leaf, opts = {}) {
	const { veins = 4, seed = 21, serrate = 0, blunt = false } = opts;
	const cos = Math.cos(rot);
	const sin = Math.sin(rot);

	petal(img, {
		cx: x,
		cy: y,
		rx: len,
		ry: width,
		rot,
		power: blunt ? 2.05 : 1.45,
		ramp,
		teeth: serrate > 0 ? 16 : 0,
		toothDepth: serrate > 0 ? 0.075 : 0,
		rimPx: 1,
		rimMul: 0.52,
		baseShade: 0.22,
		innerTip: 0.08,					veins,
					veinStrength: 0.07,
					dither: 0.85,
		seed
	});

	// midrib
	stroke(
		img,
		[
			[x - cos * len * 0.86, y - sin * len * 0.86],
			[x + cos * len * 0.84, y + sin * len * 0.84]
		],
		{ width: 1, widthEnd: 0.6, ramp: P.leafRib, seed: seed + 5, round: false, shade: 1.12 }
	);

	// lateral veins fanning from the midrib to the margin
	for (let i = 0; i < veins; i++) {
		const a = -0.42 + (i / Math.max(1, veins - 1)) * 0.94;
		const bx = x + cos * a * len;
		const by = y + sin * a * len;
		const half = width * Math.sqrt(Math.max(0.1, 1 - a * a)) * 0.72;
		for (const side of [-1, 1]) {
			stroke(
				img,
				[
					[bx, by],
					[bx + (-sin * side * half + cos * 0.14 * len), by + (cos * side * half + sin * 0.14 * len)]
				],
				{ width: 0.55, ramp: P.leafVein, seed: seed + 9 + i, round: false, shade: 1.18 }
			);
		}
	}
}

/** Horizontal position of the stalk at a given y. */
function stemXAt(pts, y) {
	for (let i = 1; i < pts.length; i++) {
		const [x0, y0] = pts[i - 1];
		const [x1, y1] = pts[i];
		if (y <= y1 || i === pts.length - 1) {
			const t = y1 === y0 ? 0 : clamp01((y - y0) / (y1 - y0));
			return x0 + (x1 - x0) * t;
		}
	}
	return pts[pts.length - 1][0];
}

/** Stalk thickness at a given y, matching stemFor's taper. */
function stemWidthAt(pts, y) {
	const topY = pts.topY ?? pts[0][1];
	const t = clamp01((y - topY) / (BASE - topY));
	return (pts.width ?? 4.6) * (1 + 0.2 * t);
}

/**
 * Grows a leaf out of the stalk. The blade's pointed base is tucked inside the
 * stem and a short petiole is painted over the joint, so leaf and stalk read as
 * one plant instead of two shapes floating near each other.
 */
function leafOnStem(img, pts, o) {
	const {
		y,
		side = -1,
		angle = 0.6,
		len = 24,
		width = 8,
		ramp = P.leaf,
		opts = {},
		seed = 21
	} = o;

	const sx = stemXAt(pts, y);
	const half = stemWidthAt(pts, y) * 0.5;
	const rot = side < 0 ? Math.PI + angle : -angle;
	const dx = Math.cos(rot);
	const dy = Math.sin(rot);

	leaf(img, sx + dx * len * 0.94, y + dy * len * 0.94, len, width, rot, ramp, { ...opts, seed });

	// petiole: starts at the heart of the stem and runs into the blade's midrib
	stroke(
		img,
		[
			[sx - side * half * 0.2, y],
			[sx + dx * len * 0.52, y + dy * len * 0.52]
		],
		{
			width: Math.max(1.4, width * 0.17),
			widthEnd: 1.1,
			ramp: P.stem,
			seed: seed + 3,
			shade: 1.06,
			dither: 0.6
		}
	);
}

function leavesAt(img, pts, rotBase = 0, o = {}) {
	// alternate leaves on two nodes, angled up toward the light
	const len = o.len ?? 24;
	leafOnStem(img, pts, {
		y: pts.topY + (BASE - pts.topY) * 0.46,
		side: -1,
		angle: 0.62 + rotBase,
		len,
		width: len * 0.36,
		opts: { serrate: 1, veins: 4, seed: 31 }
	});
	leafOnStem(img, pts, {
		y: pts.topY + (BASE - pts.topY) * 0.7,
		side: 1,
		angle: 0.58 + rotBase,
		len: len - 3,
		width: (len - 3) * 0.34,
		opts: { serrate: 1, veins: 3, seed: 41 }
	});
}

function roseHead(img, cx, cy, R, rampOuter = P.rose, rampInner = P.roseDeep, seed = 3) {
	const rand = rng(seed);

	// the head itself casts a soft shadow onto the calyx below it
	petal(img, {
		cx,
		cy: cy + R * 0.14,
		rx: R * 1.0,
		ry: R * 0.94,
		ramp: P.roseShadow,
		alpha: 0.3,
		rimPx: 0,
		dither: 0.4,
		grain: 0.06,
		seed: seed - 2
	});

	// outermost guard petals, rolled back with a darker underside
	for (let i = 0; i < 7; i++) {
		const a = (i / 7) * Math.PI * 2 + 0.3;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.5,
			cy: cy + Math.sin(a) * R * 0.48,
			rx: R * 0.58,
			ry: R * 0.47,
			rot: a + 1.15,
			power: 1.65,
			ramp: rampOuter,
			rimPx: 1.6,
			rimMul: 0.46,
			baseShade: 0.26,
			sheen: 0.1,
			veins: 3,
			veinStrength: 0.06,
			dither: 0.9,
			seed: seed + i
		});
	}

	// second ring, offset by half a petal so the overlaps stagger
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2 + 0.82 + rand() * 0.12;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.3,
			cy: cy + Math.sin(a) * R * 0.29,
			rx: R * 0.49,
			ry: R * 0.37,
			rot: a + 1.38,
			power: 1.7,
			ramp: rampOuter,
			rimPx: 1.4,
			rimMul: 0.5,
			baseShade: 0.3,
			sheen: 0.14,
			veins: 3,
			veinStrength: 0.08,
			seed: seed + 20 + i
		});
	}

	// inner cup: petals curl inward and get progressively warmer
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2 - 0.4;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.17,
			cy: cy + Math.sin(a) * R * 0.16,
			rx: R * 0.4,
			ry: R * 0.28,
			rot: a + 2.05,
			power: 1.75,
			ramp: rampInner,
			rimPx: 1.2,
			rimMul: 0.55,
			baseShade: 0.26,
			insideWarm: 0.14,
			sheen: 0.12,
			seed: seed + 40 + i
		});
	}

	// the spiral heart: short crescents that wrap the bud
	for (let i = 0; i < 4; i++) {
		const a = i * 1.95 + 0.35 + rand() * 0.3;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.085,
			cy: cy + Math.sin(a) * R * 0.08,
			rx: R * 0.27,
			ry: R * 0.18,
			rot: a + 0.2,
			power: 1.8,
			ramp: rampInner,
			rimPx: 1.1,
			rimMul: 0.48,
			baseShade: 0.2,
			insideWarm: 0.18,
			seed: seed + 60 + i
		});
	}

	// tip of the furled bud
	petal(img, {
		cx,
		cy,
		rx: R * 0.14,
		ry: R * 0.12,
		ramp: rampInner,
		rimPx: 0.8,
		rimMul: 0.6,
		insideWarm: 0.25,
		seed: seed + 80
	});
}

/* -- individual flowers ---------------------------------------------------- */

function drawRose() {
	const img = canvas();
	const pts = stemPath(124, 0.4);
	leafOnStem(img, pts, { y: 166, side: -1, angle: 0.7, len: 24, width: 8.8, opts: { serrate: 1, veins: 4, seed: 31 } });
	leafOnStem(img, pts, { y: 190, side: 1, angle: 0.62, len: 22, width: 8, opts: { serrate: 1, veins: 3, seed: 41 } });
	leafOnStem(img, pts, { y: 213, side: -1, angle: 0.68, len: 19, width: 7, opts: { serrate: 1, veins: 3, seed: 45 } });
	drawStem(img, pts);
	// calyx: five pointed sepals clasping the base of the bloom
	petal(img, {
		cx: CX + 1,
		cy: 119,
		rx: 10,
		ry: 6,
		ramp: P.stemDeep,
		rimPx: 0.8,
		seed: 77
	});
	for (let i = 0; i < 5; i++) {
		const a = Math.PI / 2 + (i - 2) * 0.52;
		petal(img, {
			cx: CX + 1 + Math.cos(a) * 6.4,
			cy: 117 + Math.sin(a) * 2.2,
			rx: 8.5,
			ry: 2.9,
			rot: a,
			power: 1.5,
			ramp: i % 2 === 0 ? P.stemDeep : P.stem,
			trimPx: 0.5,
			trimMul: 0.64,
			seed: 76 + i
		});
	}
	roseHead(img, CX + 1, 70, 48, P.rose, P.roseDeep, 5);
	// thorns: hooked prickles growing out of the cane, not floating beside it
	const thorns = [
		{ y: 150, side: 1 },
		{ y: 176, side: -1 },
		{ y: 200, side: 1 }
	];
	for (const [i, t] of thorns.entries()) {
		const sx = stemXAt(pts, t.y);
		const half = stemWidthAt(pts, t.y) * 0.5;
		petal(img, {
			cx: sx + t.side * (half + 1.1),
			cy: t.y,
			rx: 3.2,
			ry: 1.5,
			rot: t.side < 0 ? Math.PI + 0.34 : -0.3,
			power: 1.25,
			ramp: P.stemDeep,
			rimPx: 0.4,
			rimMul: 0.7,
			seed: 90 + i
		});
	}
	return img;
}

function drawPeony() {
	const img = canvas();
	const pts = stemPath(128, -0.5);
	leavesAt(img, pts, 0.08, { len: 23 });
	drawStem(img, pts);
	const cx = CX - 1;
	const cy = 76;
	const R = 50;
	const rand = rng(9);

	petal(img, {
		cx,
		cy: cy + R * 0.12,
		rx: R * 1.0,
		ry: R * 0.94,
		ramp: P.peonyDeep,
		alpha: 0.45,
		rimPx: 0,
		dither: 0.4,
		seed: 8
	});

	// ruffled, loosely packed petals: the outer rings face outward and pale out
	const rings = [
		{ n: 10, off: 0.4, off2: 0.56, rx: 0.5, ry: 0.34, ramp: P.blush, rim: 0.5, shade: 0.22 },
		{ n: 10, off: 0.62, off2: 0.46, rx: 0.46, ry: 0.32, ramp: P.blush, rim: 0.54, shade: 0.24 },
		{ n: 9, off: 0.28, off2: 0.36, rx: 0.42, ry: 0.3, ramp: P.rosePale, rim: 0.58, shade: 0.26 },
		{ n: 8, off: 0.05, off2: 0.26, rx: 0.38, ry: 0.27, ramp: P.cream, rim: 0.62, shade: 0.28 },
		{ n: 6, off: -0.2, off2: 0.15, rx: 0.32, ry: 0.22, ramp: P.cream, rim: 0.66, shade: 0.3 }
	];
	for (const [ri, ring] of rings.entries()) {
		for (let i = 0; i < ring.n; i++) {
			const a = (i / ring.n) * Math.PI * 2 + ring.off + rand() * 0.16;
			const wob = 0.9 + rand() * 0.22;
			petal(img, {
				cx: cx + Math.cos(a) * R * ring.off2 * 0.92,
				cy: cy + Math.sin(a) * R * ring.off2 * 0.82,
				rx: R * ring.rx * wob,
				ry: R * ring.ry * (0.92 + rand() * 0.16),
				rot: a + 1.35 + (rand() - 0.5) * 0.18,
				power: 1.6,
				ramp: ring.ramp,
				rimPx: 1.3,
				rimMul: ring.rim,
				baseShade: ring.shade,
				sheen: 0.1,
				veins: 3,
				veinStrength: 0.07,
				insideWarm: ri > 2 ? 0.12 : 0.04,
				seed: 30 + ri * 20 + i
			});
		}
	}
	// dense, crumpled heart with a warm glow
	for (let i = 0; i < 7; i++) {
		const a = rand() * Math.PI * 2;
		const rr = rand() * R * 0.16;
		petal(img, {
			cx: cx + Math.cos(a) * rr,
			cy: cy + Math.sin(a) * rr,
			rx: R * (0.14 + rand() * 0.1),
			ry: R * (0.1 + rand() * 0.08),
			rot: a,
			ramp: P.rosePale,
			rimPx: 0.9,
			rimMul: 0.55,
			insideWarm: 0.2,
			seed: 160 + i
		});
	}
	petal(img, { cx, cy, rx: R * 0.09, ry: R * 0.075, ramp: P.cream, rimPx: 0.6, rimMul: 0.75, insideWarm: 0.25, seed: 61 });
	return img;
}

function drawTulip() {
	const img = canvas();
	const pts = stemPath(134, 0.55);
	// long blade leaf, plus two smaller ones alternating down the stalk
	leafOnStem(img, pts, { y: 172, side: -1, angle: 1.02, len: 32, width: 9, opts: { veins: 4, seed: 77 } });
	leafOnStem(img, pts, { y: 196, side: 1, angle: 0.6, len: 23, width: 8, opts: { veins: 3, seed: 78 } });
	leafOnStem(img, pts, { y: 217, side: -1, angle: 0.7, len: 19, width: 7, opts: { veins: 3, seed: 79 } });
	drawStem(img, pts);
	const cx = CX;
	const cy = 88;
	const R = 42;

	petal(img, { cx, cy: cy + R * 0.97, rx: R * 0.15, ry: R * 0.14, ramp: P.stemDeep, rimPx: 0.8, seed: 70 });

	// back three tepals: tall, rounded, cooler in shade
	petal(img, { cx, cy: cy, rx: R * 0.52, ry: R * 1.0, power: 2.05, ramp: P.cream, rimPx: 1.6, rimMul: 0.44, baseShade: 0.16, sheen: 0.1, veins: 3, veinStrength: 0.04, seed: 71 });
	petal(img, { cx: cx - R * 0.43, cy: cy + R * 0.06, rx: R * 0.33, ry: R * 0.92, rot: -0.3, power: 2.0, ramp: P.cream, rimPx: 1.6, rimMul: 0.5, baseShade: 0.2, sheen: 0.08, veins: 3, veinStrength: 0.04, seed: 72 });
	petal(img, { cx: cx + R * 0.43, cy: cy + R * 0.06, rx: R * 0.33, ry: R * 0.92, rot: 0.3, power: 2.0, ramp: P.cream, rimPx: 1.6, rimMul: 0.46, baseShade: 0.22, sheen: 0.08, veins: 3, veinStrength: 0.04, seed: 73 });

	// shadowed inside of the cup
	petal(img, { cx, cy: cy + R * 0.18, rx: R * 0.32, ry: R * 0.66, ramp: P.peonyDeep, alpha: 0.34, rimPx: 0, dither: 0.5, seed: 79 });

	// front three tepals, shorter: cream centre, pale blush and white either side
	petal(img, { cx, cy: cy + R * 0.24, rx: R * 0.33, ry: R * 0.8, power: 2.0, ramp: P.cream, rimPx: 1.5, rimMul: 0.48, baseShade: 0.26, sheen: 0.18, veins: 3, veinStrength: 0.07, seed: 76 });
	petal(img, { cx: cx - R * 0.26, cy: cy + R * 0.18, rx: R * 0.3, ry: R * 0.8, rot: -0.12, power: 2.0, ramp: P.cream, rimPx: 1.5, rimMul: 0.5, baseShade: 0.26, sheen: 0.16, veins: 3, veinStrength: 0.06, seed: 74 });
	petal(img, { cx: cx + R * 0.26, cy: cy + R * 0.18, rx: R * 0.3, ry: R * 0.8, rot: 0.12, power: 2.0, ramp: P.cream, rimPx: 1.5, rimMul: 0.56, baseShade: 0.24, sheen: 0.16, veins: 3, veinStrength: 0.06, seed: 75 });
	return img;
}
function drawDaisy() {
	const img = canvas();
	const pts = stemPath(126, -0.35);
	leavesAt(img, pts, -0.08, { len: 20 });
	drawStem(img, pts);
	const cx = CX;
	const cy = 82;
	const R = 44;
	const rand = rng(17);

	// the disc throws a shadow onto the petals behind it
	petal(img, { cx, cy: cy + 3, rx: R * 0.42, ry: R * 0.4, ramp: P.seed, alpha: 0.35, rimPx: 0, seed: 79 });

	// two staggered rows of slender petals, slightly rotated
	for (let row = 0; row < 2; row++) {
		const n = row === 0 ? 16 : 15;
		const off = row === 0 ? 0.06 : 0.06 + Math.PI / n;
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2 + off;
			const len = R * (row === 0 ? 0.62 : 0.56) * (0.94 + rand() * 0.12);
			petal(img, {
				cx: cx + Math.cos(a) * len * 0.62,
				cy: cy + Math.sin(a) * len * 0.62,
				rx: len,
				ry: R * (row === 0 ? 0.145 : 0.13),
				rot: a + (rand() - 0.5) * 0.05,
				power: 1.9,
				ramp: P.white,
				rimPx: 0.9,
				rimMul: row === 0 ? 0.62 : 0.7,
				baseShade: 0.18,
				sheen: 0.1,
				veins: 1,
				veinStrength: 0.09,
				seed: 80 + row * 40 + i
			});
		}
	}

	// raised golden centre: darker rim, lit dome, seed texture
	petal(img, { cx, cy, rx: R * 0.37, ry: R * 0.35, ramp: P.gold, rimPx: 1.6, rimMul: 0.46, baseShade: 0.2, seed: 130 });
	petal(img, { cx, cy, rx: R * 0.3, ry: R * 0.285, ramp: P.sun, rimPx: 0, dither: 0.7, seed: 131 });
	for (let i = 0; i < 120; i++) {
		const a = rand() * Math.PI * 2;
		const rr = Math.sqrt(rand()) * R * 0.26;
		const px = Math.round(cx + Math.cos(a) * rr);
		const py = Math.round(cy + Math.sin(a) * rr);
		const lit = -Math.cos(a) * 0.6 - Math.sin(a) * 0.8;
		img.blend(px, py, lit > 0 ? P.pollen[5] : P.seed[2], lit > 0 ? 0.5 : 0.45);
	}
	return img;
}

function drawSunflower() {
	const img = canvas();
	const pts = stemPath(130, 0.3, 5.4);
	leafOnStem(img, pts, { y: 172, side: -1, angle: 0.66, len: 33, width: 12.5, opts: { veins: 5, seed: 55 } });
	leafOnStem(img, pts, { y: 200, side: 1, angle: 0.6, len: 29, width: 11, opts: { veins: 4, seed: 65 } });
	drawStem(img, pts);
	const cx = CX;
	const cy = 80;
	const R = 50;
	const rand = rng(23);

	// green calyx turning the head away from the stem
	for (let i = 0; i < 10; i++) {
		const a = (i / 10) * Math.PI * 2;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.5,
			cy: cy + R * 0.32 + Math.sin(a) * R * 0.3,
			rx: R * 0.34,
			ry: R * 0.16,
			rot: a * 0.5 + Math.PI / 2,
			power: 1.4,
			ramp: P.stemDeep,
			rimPx: 1,
			seed: 135 + i
		});
	}

	// two rows of pointed ray petals, the back row longer and deeper
	for (let row = 0; row < 2; row++) {
		const n = row === 0 ? 23 : 21;
		const off = row === 0 ? 0 : Math.PI / n;
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2 + off + (rand() - 0.5) * 0.04;
			const len = R * (row === 0 ? 0.62 : 0.54) * (0.92 + rand() * 0.14);
			petal(img, {
				cx: cx + Math.cos(a) * len * 0.6,
				cy: cy + Math.sin(a) * len * 0.6,
				rx: len,
				ry: R * (row === 0 ? 0.135 : 0.125),
				rot: a,
				power: 1.55,
				ramp: row === 0 ? P.gold : P.sun,
				rimPx: 1,
				rimMul: row === 0 ? 0.62 : 0.7,
				baseShade: 0.2,
				sheen: 0.12,
				veins: 2,
				veinStrength: 0.07,
				seed: 140 + row * 40 + i
			});
		}
	}

	// seed disc with a raised rim
	petal(img, { cx, cy, rx: R * 0.42, ry: R * 0.4, ramp: P.discWarm, rimPx: 2, rimMul: 0.4, seed: 200 });
	petal(img, { cx, cy, rx: R * 0.37, ry: R * 0.35, ramp: P.disc, rimPx: 0, dither: 0.8, seed: 201 });

	// florets on a golden-angle spiral, each with a lit crown
	const N = 300;
	const GA = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < N; i++) {
		const rr = Math.sqrt(i / N) * R * 0.36;
		const a = i * GA;
		const px = cx + Math.cos(a) * rr;
		const py = cy + Math.sin(a) * rr;
		const t = 1 - rr / (R * 0.36);
		petal(img, {
			cx: px,
			cy: py,
			rx: 1.55 * (0.8 + t * 0.5),
			ry: 1.4 * (0.8 + t * 0.5),
			power: 1.6,
			ramp: t > 0.55 ? P.gold : P.discWarm,
			rimPx: 0.35,
			rimMul: 0.55,
			dither: 0.4,
			grain: 0.05,
			seed: 300 + i
		});
		if (i % 3 === 0) {
			img.blend(Math.round(px - 0.6), Math.round(py - 0.6), P.pollen[5], 0.5);
		}
	}
	return img;
}
function drawLily() {
	const img = canvas();
	const pts = stemPath(118, -0.3);
	leafOnStem(img, pts, { y: 178, side: -1, angle: 0.75, len: 31, width: 10, opts: { veins: 4, seed: 57 } });
	leafOnStem(img, pts, { y: 204, side: 1, angle: 0.66, len: 26, width: 8.5, opts: { veins: 3, seed: 67 } });
	drawStem(img, pts);
	const cx = CX;
	const cy = 82;
	const R = 46;
	const rand = rng(31);

	// six broad tepals; the lower ones droop, the upper pair stands taller
	const order = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (-5 * Math.PI) / 6];
	for (const [i, a] of order.entries()) {
		const droop = Math.sin(a) * 0.12;
		const long = i === 0 ? 1 : Math.sin(a) > 0.5 ? 0.9 : 0.96;
		const reach = R * 0.43 * long;
		petal(img, {
			cx: cx + Math.cos(a - droop) * reach,
			cy: cy + Math.sin(a - droop) * reach,
			rx: R * 0.56 * long,
			ry: R * 0.25 * long,
			rot: a - droop + Math.PI,
			power: 1.4,
			ramp: i % 2 === 0 ? P.white : P.cream,
			rimPx: 1.1,
			rimMul: 0.46,
			baseShade: 0.3,
			sheen: 0.2,
			veins: 3,
			veinStrength: 0.1,
			insideWarm: 0.14,
			seed: 210 + i
		});
		// soft pink wash toward the tip
		petal(img, {
			cx: cx + Math.cos(a - droop) * R * 0.78 * long,
			cy: cy + Math.sin(a - droop) * R * 0.78 * long,
			rx: R * 0.26,
			ry: R * 0.17,
			rot: a,
			power: 1.5,
			ramp: P.blush,
			alpha: 0.58,
			rimPx: 0,
			dither: 0.5,
			seed: 240 + i
		});
	}

	// inner tepals cup the throat
	for (let i = 0; i < 3; i++) {
		const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + 0.85;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.2,
			cy: cy + Math.sin(a) * R * 0.2,
			rx: R * 0.28,
			ry: R * 0.17,
			rot: a + Math.PI,
			power: 1.55,
			ramp: P.cream,
			rimPx: 1,
			rimMul: 0.52,
			baseShade: 0.24,
			insideWarm: 0.24,
			seed: 220 + i
		});
	}

	// green-gold throat
	petal(img, { cx, cy: cy + 1, rx: R * 0.16, ry: R * 0.13, ramp: P.gold, rimPx: 0.8, rimMul: 0.62, insideWarm: 0.34, seed: 225 });

	// freckles spilling out of the throat
	for (let i = 0; i < 54; i++) {
		const a = rand() * Math.PI * 2;
		const rr = 3 + rand() * 13;
		petal(img, {
			cx: cx + Math.cos(a) * rr,
			cy: cy + 1 + Math.sin(a) * rr * 0.9,
			rx: 0.75,
			ry: 0.62,
			power: 1.5,
			ramp: P.anther,
			alpha: 0.8,
			rimPx: 0,
			seed: 226 + i
		});
	}

	// six long filaments arching out of the throat, heavy anthers at the tips
	for (let i = 0; i < 6; i++) {
		const a = -Math.PI / 2 + (rand() - 0.5) * 2.2;
		const len = 15 + rand() * 8;
		const ex = cx + Math.cos(a) * len;
		const ey = cy + 1 + Math.sin(a) * len;
		stroke(
			img,
			[
				[cx, cy + 2],
				[cx + Math.cos(a) * len * 0.55, cy + 2 + Math.sin(a) * len * 0.55 - 2],
				[ex, ey]
			],
			{ width: 1, widthEnd: 0.8, ramp: P.cream, seed: 230 + i, shade: 1.14 }
		);
		petal(img, {
			cx: ex,
			cy: ey,
			rx: 3.2,
			ry: 1.8,
			rot: a + Math.PI / 2,
			power: 1.4,
			ramp: P.anther,
			rimPx: 0.4,
			seed: 236 + i
		});
	}

	// pistil
	stroke(img, [[cx, cy + 2], [cx + 1.2, cy - 11]], { width: 1.2, widthEnd: 0.9, ramp: P.leafRib, seed: 241 });
	petal(img, { cx: cx + 1.4, cy: cy - 12.5, rx: 2.3, ry: 1.9, ramp: P.leaf, rimPx: 0.5, seed: 242 });
	return img;
}
function drawLavender() {
	const img = canvas();
	const pts = stemPath(100, 0.25);
	leafOnStem(img, pts, { y: 160, side: -1, angle: 0.95, len: 23, width: 6.6, opts: { veins: 3, seed: 71 } });
	leafOnStem(img, pts, { y: 194, side: 1, angle: 0.88, len: 20, width: 6, opts: { veins: 3, seed: 72 } });
	drawStem(img, pts);
	const cx = CX;
	const rand = rng(41);

	const spikes = [
		{ dx: 0, top: 20, len: 84, w: 1, lean: 0.4 },
		{ dx: -11, top: 40, len: 68, w: 0.82, lean: -1.2 },
		{ dx: 11, top: 30, len: 74, w: 0.86, lean: 1.1 }
	];

	for (const s of spikes) {
		// short fork off the crown, hidden by the florets and leaves
		stroke(
			img,
			[
				[cx + 1, 116],
				[cx + s.dx * 0.55, s.top + s.len + 6],
				[cx + s.dx + s.lean * 2, s.top + s.len - 8]
			],
			{ width: 2.4, widthEnd: 1.5, ramp: P.stem, seed: 250, highlight: 0.4 }
		);

		// dense whorls of florets: deep at the base, pale at the tip
		const whorls = 11;
		for (let j = 0; j < whorls; j++) {
			const t = j / (whorls - 1);
			const y = s.top + t * s.len;
			const x = cx + s.dx + s.lean * t * 2;
			const spread = (5.4 - t * 2) * s.w;
			const ramp = t < 0.18 ? P.lilacDeep : t > 0.7 ? P.lilacPale : P.lilac;

			// small bracts low on the spike
			if (j < 2) {
				for (const side of [-1, 1]) {
					petal(img, {
						cx: x + side * spread * 0.9,
						cy: y + 3,
						rx: 4.6 * s.w,
						ry: 1.1 * s.w,
						rot: side * 0.7 + Math.PI / 2,
						power: 1.4,
						ramp: P.sagePale,
						rimPx: 0.4,
						seed: 270 + j * 3 + side
					});
				}
			}

			// a centre floret hides the stalk, four more ring it
			petal(img, {
				cx: x,
				cy: y,
				rx: 3.4 * s.w,
				ry: 2.7 * s.w,
				power: 1.6,
				ramp,
				rimPx: 0.5,
				rimMul: 0.62,
				seed: 279 + j * 10
			});
			for (let k = 0; k < 4; k++) {
				const a = (k / 4) * Math.PI * 2 + j * 0.8;
				petal(img, {
					cx: x + Math.cos(a) * spread * 0.72,
					cy: y + Math.sin(a) * spread * 0.5,
					rx: 3.2 * s.w * (0.85 + rand() * 0.3),
					ry: 2.5 * s.w,
					rot: a * 0.4,
					power: 1.7,
					ramp,
					rimPx: 0.6,
					rimMul: 0.6,
					baseShade: 0.18,
					sheen: 0.12,
					dither: 0.8,
					seed: 280 + j * 10 + k
				});
			}
		}

		// tip bud, slightly darker so the spike reads as a point
		petal(img, {
			cx: cx + s.dx + s.lean * 2,
			cy: s.top - 3,
			rx: 2.9,
			ry: 4.4,
			ramp: P.lilac,
			rimPx: 0.6,
			rimMul: 0.66,
			seed: 300 + Math.round(s.dx)
		});
	}
	return img;
}
function drawEucalyptus() {
	const img = canvas();
	const topY = 30;
	const spine = [];
	for (let i = 0; i <= 10; i++) {
		const t = i / 10;
		spine.push([CX + Math.sin(t * 2.1) * 6 - 2, topY + (BASE - topY) * t]);
	}
	stroke(img, spine, { width: 2.8, widthEnd: 4, ramp: P.stem, seed: 310, highlight: 0.5 });

	// paired silver-blue coin leaves on short stalks, shrinking toward the tip
	const nodes = [
		{ t: 0.1, size: 10, tilt: 0.46, skew: 0.06 },
		{ t: 0.23, size: 11, tilt: -0.5, skew: -0.08 },
		{ t: 0.36, size: 12, tilt: 0.42, skew: 0.1 },
		{ t: 0.5, size: 12.8, tilt: -0.44, skew: -0.06 },
		{ t: 0.64, size: 12.2, tilt: 0.38, skew: 0.08 },
		{ t: 0.77, size: 11, tilt: -0.36, skew: -0.05 },
		{ t: 0.88, size: 9.4, tilt: 0.32, skew: 0.04 }
	];

	nodes.forEach((n, i) => {
		const sy = topY + (BASE - topY) * n.t;
		const sx = CX + Math.sin(n.t * 2.1) * 6 - 2;

		for (const side of [1, -1]) {
			const size = n.size * (side > 0 ? 1 : 0.9);
			const lx = sx + side * (size * 0.9 + 6);
			const ly = sy - size * 0.34 + n.skew * 10;
			const rot = side * n.tilt + n.skew * side;

			// stalk
			stroke(img, [[sx, sy], [lx - side * size * 0.3, ly + size * 0.52]], {
				width: 1.3,
				widthEnd: 1,
				ramp: P.stem,
				seed: 312 + i * 2 + side
			});

			// shade under the blade
			petal(img, {
				cx: lx + 1,
				cy: ly + size * 0.34,
				rx: size * 1.06,
				ry: size * 0.62,
				rot,
				power: 1.7,
				ramp: P.eucDeep,
				rimPx: 0,
				seed: 315 + i * 2 + side
			});
			// matte blade: soft top light, no strong sheen, faint centre crease
			petal(img, {
				cx: lx,
				cy: ly,
				rx: size * 1.06,
				ry: size * 0.62,
				rot,
				power: 1.7,
				ramp: side > 0 ? P.euc : P.eucPale,
				rimPx: 1,
				rimMul: 0.92,
				baseShade: 0.06,
				sheen: 0,
				veins: 1,
				veinStrength: 0.05,
				dither: 0.6,
				grain: 0.1,
				seed: 318 + i * 2 + side
			});
		}
	});

	// tip bud
	petal(img, { cx: CX - 2, cy: topY - 4, rx: 3.8, ry: 5.8, ramp: P.euc, rimPx: 0.9, seed: 340 });
	return img;
}
/* ------------------------------------------------------------- decorative */

function drawOrchid() {
	const img = canvas();
	const pts = stemPath(106, -0.52, 4.2);

	// broad, fleshy paddle leaves clasping the base — blunt tips, not blades
	leafOnStem(img, pts, { y: 172, side: -1, angle: 0.3, len: 24, width: 10, opts: { blunt: true, veins: 4, seed: 601 } });
	leafOnStem(img, pts, { y: 196, side: 1, angle: 0.34, len: 21, width: 9, opts: { blunt: true, veins: 4, seed: 611 } });
	leafOnStem(img, pts, { y: 218, side: -1, angle: 0.26, len: 17, width: 8, opts: { blunt: true, veins: 3, seed: 621 } });
	drawStem(img, pts);

	// broad, fleshy paddle leaves clasping the base — blunt tips, not blades
	const cx = CX + 1;
	const cy = 74;
	const R = 41;
	const rand = rng(37);

	// the stalk runs straight into the bloom, so no second green line shows

	// one unopened bud on a short stalk that starts inside the stem
	stroke(img, [[CX - 1, 133], [CX - 19, 122]], { width: 1.5, widthEnd: 1, ramp: P.stem, seed: 632 });

	// bud, wrapping over the end of its stalk
	stroke(img, [[CX - 21, 120], [CX - 21, 112]], { width: 1.2, widthEnd: 1, ramp: P.stem, seed: 633 });
	petal(img, {
		cx: CX - 21,
		cy: 113,
		rx: 5.4,
		ry: 8.2,
		rot: -0.5,
		power: 1.9,
		ramp: P.orchid,
		trimPx: 0.8,
		trimMul: 0.58,
		baseShade: 0.24,
		sheen: 0.14,
		veins: 2,
		veinStrength: 0.06,
		seed: 631
	});

	// dorsal sepal: tall, narrow, cupped forward
	petal(img, {
		cx,
		cy: cy - R * 0.42,
		rx: R * 0.5,
		ry: R * 0.17,
		rot: -Math.PI / 2,
		power: 1.9,
		ramp: P.orchidPetal,
		rimPx: 0.9,
		rimMul: 0.58,
		baseShade: 0.22,
		sheen: 0.16,
		veins: 3,
		veinStrength: 0.05,
		seed: 640
	});

	// lateral sepals sweeping down and out
	for (const side of [-1, 1]) {
		const a = Math.PI / 2 + side * 0.85;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.42,
			cy: cy + Math.sin(a) * R * 0.42,
			rx: R * 0.6,
			ry: R * 0.16,
			rot: a,
			power: 1.75,
			ramp: P.orchid,
			rimPx: 0.9,
			rimMul: 0.56,
			baseShade: 0.24,
			sheen: 0.1,
			veins: 3,
			veinStrength: 0.08,
			seed: 641 + side
		});
	}

	// two broad round lateral petals — the widest part of the silhouette
	for (const side of [-1, 1]) {
		const a = -Math.PI / 2 + side * 1.0;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.4,
			cy: cy + Math.sin(a) * R * 0.34,
			rx: R * 0.6,
			ry: R * 0.38,
			rot: a,
			power: 1.45,
			ramp: P.orchidPetal,
			rimPx: 1,
			rimMul: 0.54,
			baseShade: 0.26,
			sheen: 0.18,
			veins: 4,
			veinStrength: 0.12,
			insideWarm: 0.1,
			seed: 650 + side
		});
	}

	// magenta speckles clustering toward the throat
	for (let i = 0; i < 30; i++) {
		const a = rand() * Math.PI * 2;
		const rr = 2.5 + rand() * 9;
		petal(img, {
			cx: cx + Math.cos(a) * rr,
			cy: cy + Math.sin(a) * rr * 0.9,
			rx: 0.65 + rand() * 0.35,
			ry: 0.55 + rand() * 0.3,
			power: 1.6,
			ramp: P.orchidDeep,
			alpha: 0.42,
			rimPx: 0,
			seed: 660 + i
		});
	}

	// throat: warm yellow with the column rising out of it
	petal(img, { cx, cy: cy + R * 0.14, rx: R * 0.17, ry: R * 0.13, ramp: P.orchidThroat, rimPx: 0.6, rimMul: 0.6, insideWarm: 0.2, seed: 670 });

	// lip: a small spade hanging under the column, with pale frilled edges
	for (const side of [-1, 1]) {
		petal(img, {
			cx: cx + side * R * 0.16,
			cy: cy + R * 0.22,
			rx: R * 0.16,
			ry: R * 0.09,
			rot: side * 0.95,
			power: 1.5,
			ramp: P.orchidPetal,
			rimPx: 0.7,
			rimMul: 0.5,
			baseShade: 0.22,
			seed: 671 + side
		});
	}
	// the two dark eyes at the mouth of the lip
	for (const side of [-1, 1]) {
		petal(img, {
			cx: cx + side * R * 0.1,
			cy: cy + R * 0.2,
			rx: R * 0.075,
			ry: R * 0.06,
			ramp: P.orchidDeep,
			rimPx: 0,
			seed: 673 + side
		});
	}
	petal(img, {
		cx,
		cy: cy + R * 0.38,
		rx: R * 0.22,
		ry: R * 0.27,
		rot: Math.PI / 2,
		power: 1.5,
		ramp: P.orchidLip,
		rimPx: 0.9,
		rimMul: 0.48,
		baseShade: 0.3,
		sheen: 0.16,
		veins: 3,
		veinStrength: 0.12,
		seed: 674
	});
	// pale frilled tip curling under the lip
	petal(img, {
		cx,
		cy: cy + R * 0.58,
		rx: R * 0.14,
		ry: R * 0.08,
		power: 1.4,
		ramp: P.orchidPale,
		alpha: 0.85,
		rimPx: 0,
		dither: 0.4,
		seed: 675
	});

	// column and its yellow anther cap
	petal(img, { cx, cy: cy + R * 0.04, rx: R * 0.1, ry: R * 0.14, power: 1.8, ramp: P.white, rimPx: 0.7, rimMul: 0.7, sheen: 0.22, seed: 680 });
	petal(img, { cx, cy: cy - R * 0.06, rx: R * 0.07, ry: R * 0.065, ramp: P.orchidThroat, rimPx: 0.5, rimMul: 0.8, seed: 681 });
	return img;
}

function drawIris() {
	const img = canvas();
	const pts = stemPath(102, 0.34, 4.4);
	// sword leaves: tall, narrow, mostly upright, few veins
	leafOnStem(img, pts, { y: 166, side: -1, angle: 1.22, len: 30, width: 5.6, opts: { veins: 2, seed: 700 } });
	leafOnStem(img, pts, { y: 190, side: 1, angle: 1.26, len: 27, width: 5.2, opts: { veins: 2, seed: 710 } });
	leafOnStem(img, pts, { y: 214, side: -1, angle: 1.34, len: 23, width: 4.8, opts: { veins: 1, seed: 720 } });
	drawStem(img, pts);

	const cx = CX + 1;
	const cy = 69;
	const R = 42;
	const rand = rng(53);

	// narrow sheath hugging the stem below the bloom
	petal(img, { cx: CX + 1, cy: 118, rx: 13, ry: 3.9, rot: -1.45, power: 1.9, ramp: P.sage, rimPx: 0.6, rimMul: 0.62, baseShade: 0.2, veins: 2, veinStrength: 0.05, seed: 705 });
	petal(img, { cx: CX + 1, cy: 111, rx: 8, ry: 2.8, rot: -1.15, power: 1.9, ramp: P.sage, rimPx: 0.5, rimMul: 0.7, seed: 707 });
	// the stalk continues into the flower; the sheath hides the joint

	// three falls: broad, drooping, deepest at the rim
	for (let i = 0; i < 3; i++) {
		const a = Math.PI / 2 + (i - 1) * 0.98;
		const len = R * (i === 1 ? 1 : 0.94);
		petal(img, {
			cx: cx + Math.cos(a) * len * 0.44,
			cy: cy + Math.sin(a) * len * 0.42,
			rx: len * 0.64,
			ry: R * 0.33,
			rot: a,
			power: 1.55,
			ramp: P.iris,
			rimPx: 1.2,
			rimMul: 0.44,
			baseShade: 0.3,
			sheen: 0.14,
			veins: 4,
			veinStrength: 0.1,
			seed: 730 + i
		});
		// mottled pale patch toward the throat
		petal(img, {
			cx: cx + Math.cos(a) * len * 0.3,
			cy: cy + Math.sin(a) * len * 0.3,
			rx: len * 0.24,
			ry: R * 0.15,
			rot: a,
			power: 1.7,
			ramp: P.irisPale,
			alpha: 0.5,
			rimPx: 0,
			dither: 0.5,
			seed: 733 + i
		});
		// golden beard: a solid ridge with a few short hairs at its tip
		petal(img, {
			cx: cx + Math.cos(a) * len * 0.42,
			cy: cy + Math.sin(a) * len * 0.42,
			rx: len * 0.3,
			ry: R * 0.055,
			rot: a,
			power: 1.4,
			ramp: P.beard,
			rimPx: 0.4,
			rimMul: 0.8,
			seed: 738 + i
		});
		for (let k = 0; k < 3; k++) {
			const ha = a + (k - 1) * 0.16;
			stroke(
				img,
				[
					[cx + Math.cos(ha) * len * 0.6, cy + Math.sin(ha) * len * 0.6],
					[cx + Math.cos(ha) * len * 0.74, cy + Math.sin(ha) * len * 0.74]
				],
				{ width: 0.6, ramp: P.beard, seed: 742 + i * 4 + k, shade: 1.02 }
			);
		}
	}
	// fine veining inside each fall, kept clear of the silhouettes
	for (let i = 0; i < 16; i++) {
		const a = Math.PI / 2 + (rand() - 0.5) * 1.4;
		const s0 = 0.34 + rand() * 0.14;
		const s1 = s0 + 0.12 + rand() * 0.12;
		stroke(
			img,
			[
				[cx + Math.cos(a) * R * s0, cy + Math.sin(a) * R * s0 * 0.94],
				[cx + Math.cos(a) * R * s1, cy + Math.sin(a) * R * s1 * 0.94]
			],
			{ width: 0.6, ramp: P.irisDeep, seed: 780 + i, shade: 0.9 }
		);
	}

	// three upright standards: spatulate, wider at the top
	for (let i = 0; i < 3; i++) {
		const a = -Math.PI / 2 + (i - 1) * 0.6;
		petal(img, {
			cx: cx + Math.cos(a) * R * 0.36,
			cy: cy + Math.sin(a) * R * 0.36,
			rx: R * 0.58,
			ry: R * 0.23,
			rot: a,
			power: 2.05,
			ramp: P.irisDeep,
			rimPx: 1,
			rimMul: 0.5,
			baseShade: 0.26,
			sheen: 0.16,
			veins: 2,
			veinStrength: 0.07,
			insideWarm: 0.04,
			seed: 750 + i
		});
		// lit outer edge of each standard
		stroke(
			img,
			[
				[cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3],
				[cx + Math.cos(a) * R * 0.84, cy + Math.sin(a) * R * 0.84]
			],
			{ width: 1.3, widthEnd: 0.7, ramp: P.irisPale, seed: 760 + i, shade: 1.05 }
		);
	}

	// throat and the two little style arms curled over it
	petal(img, { cx, cy: cy + R * 0.08, rx: R * 0.17, ry: R * 0.13, ramp: P.irisPale, rimPx: 0.5, rimMul: 0.8, insideWarm: 0.2, seed: 770 });
	for (const side of [-1, 1]) {
		petal(img, {
			cx: cx + side * R * 0.13,
			cy: cy + R * 0.02,
			rx: R * 0.14,
			ry: R * 0.07,
			rot: -Math.PI / 2 + side * 0.9,
			power: 1.6,
			ramp: P.iris,
			rimPx: 0.6,
			rimMul: 0.6,
			seed: 771 + side
		});
	}
	return img;
}

function drawPetalSprite(color, seed) {
	const img = new Img(22 * SS, 26 * SS, SS);
	petal(img, { cx: 11, cy: 13, rx: 9.5, ry: 6.2, rot: 0.5, power: 1.8, ramp: color, rimPx: 1, rimMul: 0.7, seed });
	return img;
}

function drawBouquetPaper() {
	const w = 460;
	const h = 330;
	const img = new Img(w, h);
	const tieX = w / 2;
	const tieY = h - 6;
	const topY = 86;
	const halfTop = 150;

	// fanned sheets of paper
	const sheets = 11;
	for (let i = 0; i < sheets; i++) {
		const t = i / (sheets - 1);
		const edge = Math.abs(t - 0.5) * 2;
		const tipX = tieX + (t - 0.5) * halfTop * 2 * 0.96;
		const rimY = topY + edge * 30 + hash(i, 7, 401) * 12;
		const pts = [
			[tieX, tieY],
			[tipX - 30, rimY],
			[tipX + 30, rimY + 4]
		];
		const shade = 0.44 + 0.38 * (1 - edge) + (i % 2) * 0.05;
		poly(img, pts, {
			ramp: P.paper,
			shadeFn: (x, y) => {
				const d = Math.abs(x - tieX) / (halfTop + 30);
				return clamp01(shade - d * 0.16 + (1 - (tieY - y) / (tieY - topY)) * 0.05);
			},
			seed: 400 + i
		});
	}

	// side flaps for volume
	for (const side of [-1, 1]) {
		const pts = [
			[tieX, tieY],
			[tieX + side * halfTop * 1.02, topY + 44],
			[tieX + side * halfTop * 0.6, topY + 18],
			[tieX + side * 26, tieY - 26]
		];
		poly(img, pts, {
			ramp: P.paper,
			shadeFn: (x) => 0.32 + (1 - Math.abs(x - tieX) / halfTop) * 0.4,
			seed: 420 + side
		});
	}

	return img;
}

function drawBouquetRibbon() {
	const w = 460;
	const h = 330;
	const img = new Img(w, h);
	const tieX = w / 2;
	const tieY = h - 6;
	const bandY = tieY - 96;
	const bandPts = [
		[tieX - 42, bandY - 12],
		[tieX + 42, bandY - 12],
		[tieX + 52, bandY + 14],
		[tieX - 52, bandY + 14]
	];
	poly(img, bandPts, {
		ramp: P.ribbon,
		shadeFn: (x, y) => 0.42 + 0.35 * (1 - Math.abs(x - tieX) / 60) - (y - bandY) * 0.004,
		seed: 430
	});

	// bow loops
	for (const side of [-1, 1]) {
		petal(img, {
			cx: tieX + side * 34,
			cy: bandY - 4,
			rx: 34,
			ry: 17,
			rot: side * 0.35,
			power: 1.9,
			ramp: P.ribbon,
			rimPx: 1.4,
			rimMul: 0.6,
			seed: 440 + side
		});
	}
	// hanging tails
	for (const side of [-1, 1]) {
		poly(
			img,
			[
				[tieX + side * 4, bandY + 6],
				[tieX + side * 26, bandY + 10],
				[tieX + side * (side > 0 ? 40 : 44), bandY + 66],
				[tieX + side * (side > 0 ? 20 : 26), bandY + 58]
			],
			{
				ramp: P.ribbon,
				shadeFn: (x) => 0.34 + 0.28 * (1 - Math.abs(x - tieX) / 60),
				seed: 450 + side
			}
		);
	}
	// knot
	petal(img, { cx: tieX, cy: bandY + 1, rx: 13, ry: 11, ramp: P.ribbon, rimPx: 1.2, rimMul: 0.55, seed: 460 });
	return img;
}

function drawLogoMark() {
	const img = new Img(96, 96);
	roseHead(img, 48, 50, 34, P.rose, P.roseDeep, 77);
	return img;
}

function drawFavicon() {
	const img = new Img(64, 64);
	// rounded-ish cream tile
	for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
			const cx = 31.5;
			const cy = 31.5;
			const d = Math.max(Math.abs(x + 0.5 - cx), Math.abs(y + 0.5 - cy));
			const corner = Math.hypot(Math.max(0, Math.abs(x + 0.5 - cx) - 22), Math.max(0, Math.abs(y + 0.5 - cy) - 22));
			if (d <= 30 && corner <= 10) {
				const t = 0.86 - (y / 64) * 0.08;
				img.blend(x, y, sampleRamp(P.paper, t, x, y, 0.5, 9), 1);
			}
		}
	}
	roseHead(img, 32, 34, 22, P.rose, P.roseDeep, 78);
	return img;
}

/* ---------------------------------------------------------- contact sheet */

function sheet(images, cols, cellW, cellH, bg) {
	const rows = Math.ceil(images.length / cols);
	const img = new Img(cols * cellW, rows * cellH);
	for (let y = 0; y < img.h; y++) {
		for (let x = 0; x < img.w; x++) {
			img.blend(x, y, bg, 1);
		}
	}
	images.forEach((src, i) => {
		const ox = (i % cols) * cellW + Math.floor((cellW - src.w) / 2);
		const oy = Math.floor(i / cols) * cellH + Math.floor((cellH - src.h) / 2);
		for (let y = 0; y < src.h; y++) {
			for (let x = 0; x < src.w; x++) {
				const si = y * src.w + x;
				if (src.a[si] < 0.5) continue;
				const dxx = ox + x;
				const dyy = oy + y;
				if (dxx < 0 || dyy < 0 || dxx >= img.w || dyy >= img.h) continue;
				img.blend(dxx, dyy, [src.rgb[si * 3], src.rgb[si * 3 + 1], src.rgb[si * 3 + 2]], 1);
			}
		}
	});
	return img;
}

/* ----------------------------------------------------------------- og card */

/** Nearest-neighbour blit with rotation about the sprite's bottom centre. */
function blitTransformed(dst, src, opts) {
	const { cx, cy, scale = 1, angle = 0, dx = 0, dy = 0, alpha = 1 } = opts;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const ax = cx + dx;
	const ay = cy + dy;
	const toDest = ([x, y]) => {
		const lx = (x - src.w / 2) * scale;
		const ly = (y - src.h) * scale;
		return [ax + lx * cos - ly * sin, ay + lx * sin + ly * cos];
	};
	const corners = [
		[0, 0],
		[src.w, 0],
		[0, src.h],
		[src.w, src.h]
	].map(toDest);
	const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[0]))));
	const maxX = Math.min(dst.w - 1, Math.ceil(Math.max(...corners.map((c) => c[0]))));
	const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[1]))));
	const maxY = Math.min(dst.h - 1, Math.ceil(Math.max(...corners.map((c) => c[1]))));

	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			const px = x + 0.5 - ax;
			const py = y + 0.5 - ay;
			const sx = (px * cos + py * sin) / scale + src.w / 2 - 0.5;
			const sy = (-px * sin + py * cos) / scale + src.h - 0.5;
			const x0 = Math.floor(sx);
			const y0 = Math.floor(sy);
			const fx = sx - x0;
			const fy = sy - y0;
			let r = 0;
			let g = 0;
			let b = 0;
			let wsum = 0;
			let asum = 0;
			for (let oy = 0; oy < 2; oy++) {
				for (let ox = 0; ox < 2; ox++) {
					const xx = x0 + ox;
					const yy = y0 + oy;
					if (xx < 0 || yy < 0 || xx >= src.w || yy >= src.h) continue;
					const i = yy * src.w + xx;
					const sa = src.a[i];
					if (sa < 0.04) continue;
					const w = (ox ? fx : 1 - fx) * (oy ? fy : 1 - fy);
					if (w <= 0) continue;
					r += src.rgb[i * 3] * w * sa;
					g += src.rgb[i * 3 + 1] * w * sa;
					b += src.rgb[i * 3 + 2] * w * sa;
					asum += sa * w;
					wsum += w * sa;
				}
			}
			if (wsum <= 0.0001) continue;
			dst.blend(x, y, [r / wsum, g / wsum, b / wsum], alpha * (asum / Math.max(wsum, 0.0001)));
		}
	}
}

function drawOgImage(paper, ribbon, sprites) {
	const w = 1200;
	const h = 630;
	const img = new Img(w, h);
	const cream = [247, 240, 231];
	const blush = [242, 214, 212];
	const rose = [233, 168, 179];

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const gx = (x - w / 2) / 470;
			const gy = (y - 330) / 330;
			const glow = Math.max(0, 1 - Math.hypot(gx, gy));
			const base = mix(cream, blush, clamp01(glow * 0.8 + (1 - y / h) * 0.05));
			const warm = mix(base, rose, Math.max(0, glow - 0.6) * 0.4);
			img.blend(x, y, warm, 1);
			if (x % 4 === 0 && y % 4 === 0) img.blend(x, y, mix(warm, [43, 31, 34], 0.05), 1);
		}
	}

	/* Mirrors the geometry in src/lib/components/Bouquet.svelte so the share
	   card matches the bouquet people see on the site. */
	const stageW = 600;
	const stageH = stageW * 1.02;
	const cx = w / 2;
	const stageTop = h - 4 - stageH;
	const paperScale = stageW / 460;
	const paperBottom = stageTop + stageH * 0.985;
	const flowerScale = (stageW * 0.43) / sprites.mawar.w;
	const flowerBottom = stageTop + stageH * 0.86;
	const sprigScale = (stageW * 0.4) / sprites.eukaliptus.w;
	const sprigBottom = stageTop + stageH * 0.85;

	blitTransformed(img, paper, { cx, cy: paperBottom, scale: paperScale });
	blitTransformed(img, sprites.eukaliptus, {
		cx,
		cy: sprigBottom,
		scale: sprigScale,
		angle: (-36 * Math.PI) / 180,
		dx: -0.07 * stageW
	});
	blitTransformed(img, sprites.eukaliptus, {
		cx,
		cy: sprigBottom,
		scale: sprigScale * 0.96,
		angle: (35 * Math.PI) / 180,
		dx: 0.07 * stageW
	});

	const spread = (58 * Math.PI) / 180;
	const slots = [
		{ id: 'daisy', pos: -0.5 },
		{ id: 'matahari', pos: 0.5 },
		{ id: 'tulip', pos: -0.25 },
		{ id: 'peony', pos: 0.25 },
		{ id: 'mawar', pos: 0 }
	];
	for (const { id, pos } of slots) {
		const depth = Math.abs(pos) * 2;
		blitTransformed(img, sprites[id], {
			cx,
			cy: flowerBottom,
			scale: flowerScale * (1 - depth * 0.13),
			angle: pos * spread,
			dx: pos * 0.05 * stageW * 0.43
		});
	}

	blitTransformed(img, ribbon, { cx, cy: paperBottom, scale: paperScale });

	const petalsOg = [
		['og-petal-2', 130, 96, 3, 0.5, -20],
		['og-petal-4', 248, 500, 2.4, 0.42, 40],
		['og-petal-1', 1040, 120, 2.8, 0.5, 15],
		['og-petal-3', 1112, 430, 2.2, 0.4, -35],
		['og-petal-2', 920, 556, 2, 0.5, 60]
	];
	for (const [id, x, y, scale, alpha, deg] of petalsOg) {
		const sprite = sprites[id];
		if (!sprite) continue;
		blitTransformed(img, sprite, {
			cx: x,
			cy: y + sprite.h * scale,
			scale,
			angle: (deg * Math.PI) / 180,
			alpha
		});
	}

	return img;
}

/* ------------------------------------------------------------------- build */

function zoom(src, factor) {
	const out = new Img(src.w * factor, src.h * factor);
	for (let y = 0; y < src.h; y++) {
		for (let x = 0; x < src.w; x++) {
			const i = y * src.w + x;
			if (src.a[i] < 0.5) continue;
			const c = [src.rgb[i * 3], src.rgb[i * 3 + 1], src.rgb[i * 3 + 2]];
			for (let dy = 0; dy < factor; dy++) {
				for (let dx = 0; dx < factor; dx++) {
					out.blend(x * factor + dx, y * factor + dy, c, 1);
				}
			}
		}
	}
	return out;
}

function save(relPath, img) {
	const full = resolve(ROOT, relPath);
	mkdirSync(dirname(full), { recursive: true });
	writeFileSync(full, img.toPNG());
	console.log(`  ${relPath}  ${img.w}x${img.h}`);
}

const flowers = [
	['mawar', drawRose()],
	['peony', drawPeony()],
	['tulip', drawTulip()],
	['daisy', drawDaisy()],
	['matahari', drawSunflower()],
	['bakung', drawLily()],
	['anggrek', drawOrchid()],
	['iris', drawIris()],
	['lavender', drawLavender()],
	['eukaliptus', drawEucalyptus()]
];

console.log('Rendering Petalbit art…');
for (const [id, img] of flowers) save(`static/art/flowers/${id}.png`, img);

const paperSheet = drawBouquetPaper();
const ribbonSheet = drawBouquetRibbon();
save('static/art/bouquet-paper.png', paperSheet);
save('static/art/bouquet-ribbon.png', ribbonSheet);
save('static/art/logo-mark.png', drawLogoMark());
save('static/favicon.png', drawFavicon());

const petals = [
	drawPetalSprite(P.rose, 501),
	drawPetalSprite(P.blush, 502),
	drawPetalSprite(P.cream, 503),
	drawPetalSprite(P.lilac, 504)
];
petals.forEach((img, i) => save(`static/art/petal-${i + 1}.png`, img));

const ogSprites = Object.fromEntries(flowers);
petals.forEach((sprite, i) => {
	ogSprites[`og-petal-${i + 1}`] = sprite;
});
save('static/og.png', drawOgImage(paperSheet, ribbonSheet, ogSprites));

save('static/art/_sheet.png', sheet(flowers.map((f) => f[1]), 4, W * SS + 10, H * SS + 6, [247, 240, 231]));

// review sheet with a light backdrop for eyeballing silhouettes
const review = sheet(flowers.map((f) => f[1]), 4, W * SS + 10, H * SS + 6, [247, 240, 231]);
save('scripts/review/sheet-2x.png', review);
console.log('Done.');
