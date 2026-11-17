import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BOUQUET_PAPERS } from '../src/lib/data/papers.ts';
import { FLOWERS } from '../src/lib/data/flowers.ts';

/** Project root as a directory URL (trailing slash), so `/art/...` resolves. */
const BASE = new URL('..', import.meta.url);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IHDR = 0x49484452;
const PAPER_SIZE = { width: 1380, height: 990 };

/** Reads a PNG's signature and IHDR size, so a renamed placeholder can't pass. */
function readPng(relPath) {
	const buf = readFileSync(fileURLToPath(new URL(`static${relPath}`, BASE)));
	assert.ok(buf.subarray(0, 8).equals(PNG_SIGNATURE), `${relPath} is not a PNG`);
	assert.equal(buf.readUInt32BE(8), 13, `${relPath} has a malformed IHDR`);
	assert.equal(buf.readUInt32BE(12), PNG_IHDR, `${relPath} is missing IHDR`);
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function assertAsset(relPath, expected, label) {
	assert.ok(relPath.startsWith('/'), `${label} path must be absolute: ${relPath}`);
	let stats;
	try {
		stats = statSync(fileURLToPath(new URL(`static${relPath}`, BASE)));
	} catch {
		assert.fail(`${label} is missing on disk: ${relPath} (run \`npm run art\`)`);
	}
	assert.ok(stats.size > 0, `${label} is empty: ${relPath}`);
	const size = readPng(relPath);
	if (expected) {
		assert.equal(size.width, expected.width, `${label} width: ${relPath}`);
		assert.equal(size.height, expected.height, `${label} height: ${relPath}`);
	}
	return size;
}

test('every bouquet paper ships all of its artwork', () => {
	for (const paper of BOUQUET_PAPERS) {
		assertAsset(paper.paperImage, PAPER_SIZE, `${paper.id} paper`);
		assertAsset(paper.frontImage, PAPER_SIZE, `${paper.id} front`);
		if (paper.swatchImage) assertAsset(paper.swatchImage, null, `${paper.id} swatch`);
		if (paper.ribbonImage) assertAsset(paper.ribbonImage, PAPER_SIZE, `${paper.id} ribbon`);
	}
});

test('the fallback ribbon exists for papers without their own', () => {
	assertAsset('/art/bouquet-ribbon.png', PAPER_SIZE, 'fallback ribbon');
});

test('paper ids are unique', () => {
	const ids = BOUQUET_PAPERS.map((paper) => paper.id);
	assert.equal(new Set(ids).size, ids.length, `duplicate paper id in ${ids.join(', ')}`);
});

test('every flower sprite exists', () => {
	for (const flower of FLOWERS) {
		assertAsset(flower.image, null, `${flower.id} sprite`);
	}
});
