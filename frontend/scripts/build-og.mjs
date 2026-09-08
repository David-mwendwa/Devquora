import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Rasterises scripts/og-card.svg into public/og.jpg — the 1200x630 image every
 * unfurler renders when a Devquora link is shared.
 *
 * JPEG rather than PNG: the card is mostly large soft gradients, which is
 * PNG's worst case and JPEG's best, and an unfurl image is fetched by every
 * service that renders a shared link.
 *
 * The step that matters is the font inlining. A rasteriser cannot fetch a
 * webfont — true of a *linked* font, false of an embedded one. QuickLook
 * renders through WebKit, which honours an @font-face whose src is a base64
 * woff2 in the document itself, so the faces are read off disk and injected
 * here and the card is set in the same Inter and JetBrains Mono as the site
 * rather than in whatever the rasteriser would otherwise fall back to.
 *
 * They are injected rather than pasted into the SVG because the base64 runs to
 * ~100KB, which would bury the artwork anyone editing this needs to read. The
 * SVG keeps a single empty <style id="fonts" /> element as the seam.
 *
 * The subsets are latin-only, matching public/fonts/fonts.css. The card's copy
 * is ASCII, so the range covers it — but a glyph outside the subset falls back
 * silently, so look at the image after changing the wording.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const FACES = [
  { family: 'Inter', file: 'Inter.woff2', weight: '400 800' },
  { family: 'JetBrains Mono', file: 'JetBrainsMono.woff2', weight: '400 600' },
];

const fontCss = FACES.map(({ family, file, weight }) => {
  const data = readFileSync(join(root, 'public/fonts', file)).toString('base64');
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2');}`;
}).join('\n');

const SEAM = '<style id="fonts" />';
const svgPath = join(root, 'scripts/og-card.svg');
const svg = readFileSync(svgPath, 'utf8');
if (!svg.includes(SEAM)) {
  throw new Error(`og-card.svg is missing its font seam: ${SEAM}`);
}

const work = mkdtempSync(join(tmpdir(), 'devquora-og-'));
const src = join(work, 'og-card.svg');
writeFileSync(src, svg.replace(SEAM, `<style>${fontCss}</style>`));

// qlmanage rasterises into a square, which is why the source is 1200x1200 with
// the card in a band; sips then crops that band back out at 1200x630.
execFileSync('qlmanage', ['-t', '-s', '1200', '-o', work, src], { stdio: 'ignore' });
execFileSync(
  'sips',
  [
    '-c', '630', '1200',
    join(work, 'og-card.svg.png'),
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', '90',
    '--out', join(root, 'public/og.jpg'),
  ],
  { stdio: 'ignore' }
);

console.log('public/og.jpg regenerated');
