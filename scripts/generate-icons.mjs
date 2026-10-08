import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'src/lib/assets/icon.svg'), 'utf8');
const iconDir = join(root, 'static/icons');

/** Fail loudly when icon.svg no longer contains the markup the variants rely on. */
function replaceOnce(svg, search, replacement) {
	// Counting guards against a match inside a comment or an attribute string:
	// replacing the wrong occurrence still succeeds, but silently produces
	// wrong icons.
	const occurrences = svg.split(search).length - 1;
	if (occurrences === 0) throw new Error(`icon.svg is missing expected markup: ${search}`);
	if (occurrences > 1)
		throw new Error(`icon.svg has ambiguous markup (${occurrences}x): ${search}`);
	return svg.replace(search, replacement);
}

/** Maskable icons get masked to a circle: square corners out, glyph in the safe zone. */
const maskable = replaceOnce(
	replaceOnce(source, 'rx="112"', 'rx="0"'),
	'<g id="glyph">',
	'<g id="glyph" transform="translate(256 256) scale(0.8) translate(-256 -256)">'
);

/** iOS applies its own rounded mask and dislikes transparency. */
const fullBleed = replaceOnce(source, 'rx="112"', 'rx="0"');

const targets = [
	{ file: 'icon-192.png', size: 192, svg: source },
	{ file: 'icon-512.png', size: 512, svg: source },
	{ file: 'icon-maskable-512.png', size: 512, svg: maskable },
	{ file: 'apple-touch-icon.png', size: 180, svg: fullBleed, background: '#fdf6e9' }
];

await mkdir(iconDir, { recursive: true });

for (const { file, size, svg, background } of targets) {
	// The icon is shapes only, so rendering never depends on system fonts.
	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: size },
		font: { loadSystemFonts: false },
		...(background ? { background } : {})
	});
	await writeFile(join(iconDir, file), resvg.render().asPng());
	console.log(`generated static/icons/${file} (${size}x${size})`);
}
