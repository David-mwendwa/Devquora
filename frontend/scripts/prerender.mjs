/**
 * Renders the public routes to real HTML after `vite build`.
 *
 * The app shipped as an empty <div id="root"> and one <title> for all fourteen
 * routes, so anything that reads a page without executing JavaScript — every
 * social unfurl, and search crawlers on their first pass — saw a blank
 * document called "Devquora". This writes each public route as its own
 * index.html with its own title, description, canonical and rendered markup;
 * main.jsx then hydrates over it instead of building it from scratch.
 *
 * Run through vite-node so the JSX, the path aliases and the env all resolve
 * exactly as they do in the real build.
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StrictMode, createElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Writable } from 'node:stream';
import App from '../src/App.jsx';
import { preloadRoute } from '../src/routes.jsx';
import {
  DISALLOW,
  PRERENDER_PATHS,
  SITE_URL,
  canonicalFor,
  metaForPath,
  titleFor,
} from './prerender-meta.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');
/*
 * The shell, with its authored comments stripped.
 *
 * HTML comments are not minified away: Vite copies index.html to the browser
 * verbatim, so view-source exposes every note about fonts, preconnects and
 * managed meta tags. That reasoning belongs in the repo, not in the response.
 *
 * Only the template is stripped, never the rendered body: React writes its own
 * `<!--$-->` and `<!--/$-->` Suspense markers into the HTML, and removing
 * those breaks hydration. Conditional comments are spared for the same reason.
 */
const template = readFileSync(join(dist, 'index.html'), 'utf8').replace(
  /\n?\s*<!--(?!\[if)[\s\S]*?-->/g,
  '',
);

// renderToString does not wait for Suspense boundaries to settle — it emits
// the fallback and moves on. onAllReady does wait, which is the whole point
// when every route in this app is behind React.lazy.
const renderToHtml = (element) =>
  new Promise((resolvePromise, rejectPromise) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _enc, cb) {
        html += chunk;
        cb();
      },
    });
    sink.on('finish', () => resolvePromise(html));
    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(sink);
      },
      onError: rejectPromise,
    });
  });

// Replaces the value of a tag index.html already carries. It throws rather
// than inserting a second one, because a page with two og:title tags lets the
// crawler choose, and silently adding tags here is how the template and the
// prerendered pages drift apart without anyone noticing.
const setMeta = (html, selector, attr, value) => {
  const pattern = new RegExp(`(<meta\\s+${selector}\\s+content=")([^"]*)(")`, 'i');
  if (!pattern.test(html)) {
    throw new Error(`prerender: no <meta ${selector}> in index.html to set ${attr}`);
  }
  return html.replace(pattern, `$1${value.replace(/"/g, '&quot;')}$3`);
};

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildPage = async (path) => {
  const route = metaForPath(path);
  const title = titleFor(route);
  const canonical = canonicalFor(path);

  await preloadRoute(path);
  // createElement rather than JSX: this file keeps the .mjs extension so Node
  // treats it as a module, and the JSX transform is not applied to .mjs.
  const markup = await renderToHtml(
    createElement(
      StrictMode,
      null,
      createElement(App, { router: MemoryRouter, routerProps: { initialEntries: [path] } })
    )
  );

  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, 'name="description"', 'description', route.description);
  html = setMeta(html, 'property="og:title"', 'og:title', title);
  html = setMeta(html, 'property="og:description"', 'og:description', route.description);
  html = setMeta(html, 'property="og:url"', 'og:url', canonical);
  html = setMeta(html, 'name="twitter:title"', 'twitter:title', title);
  html = setMeta(html, 'name="twitter:description"', 'twitter:description', route.description);
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/i,
    `<link rel="canonical" href="${canonical}" />`
  );

  if (route.noindex) {
    html = html.replace('</head>', '  <meta name="robots" content="noindex, follow" />\n  </head>');
  }

  // Stamped with the route it was rendered for. Netlify's SPA fallback answers
  // every path it has no file for with this same index.html, so a reader
  // opening /post/some-article receives the *landing page's* markup in the
  // root. Without this attribute main.jsx sees a non-empty root, hydrates, and
  // React finds an article where a feed was promised — mismatch, the markup is
  // thrown away, and every such page logs error #418 in production. The client
  // compares this against the current path and only adopts the markup when the
  // two agree.
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root" data-prerendered="${path}">${markup}</div>`
  );

  const outDir = path === '/' ? dist : join(dist, path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  return { path, bytes: markup.length };
};

const today = new Date().toISOString().slice(0, 10);

const sitemap = () => {
  const entries = PRERENDER_PATHS.filter((p) => !metaForPath(p).noindex)
    .map((p) => {
      const r = metaForPath(p);
      return [
        '  <url>',
        `    <loc>${canonicalFor(p)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${r.changefreq}</changefreq>`,
        `    <priority>${r.priority}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
};

// /post/ is crawlable but carries a noindex header — a Disallow here would
// stop the crawler fetching the page at all, and a directive it never reads
// cannot be obeyed. Blocking the crawl is what leaves a URL indexed on
// anchor text alone.
const robots = () =>
  ['User-agent: *', 'Allow: /', ...DISALLOW.map((p) => `Disallow: ${p}`), '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n');


/*
 * public/ is copied into dist untouched, so the notes in fonts.css, robots.txt
 * and the logo SVGs are served to anyone who opens them — a favicon is fetched
 * by every browser tab — for the same reason the shell's are stripped. fonts.css
 * is render-blocking as well, which puts those bytes on the critical path.
 *
 * dist/assets is skipped deliberately: Vite has already minified what it emits
 * there, and a blanket strip would take the `/*!` licence headers with it.
 */
const stripAssetComments = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'assets') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      stripAssetComments(full);
      continue;
    }
    const comments = entry.name.endsWith('.svg')
      ? /\n?\s*<!--[\s\S]*?-->/g
      : entry.name.endsWith('.css')
        ? /\n?\s*\/\*[\s\S]*?\*\//g
        : entry.name.endsWith('.txt')
          ? /^[ \t]*#.*$\n?/gm
          : null;
    if (!comments) continue;
    const text = readFileSync(full, 'utf8');
    const cleaned = text.replace(comments, '').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
    if (cleaned !== text) writeFileSync(full, cleaned);
  }
};

const run = async () => {
  const results = [];
  for (const path of PRERENDER_PATHS) results.push(await buildPage(path));
  writeFileSync(join(dist, 'sitemap.xml'), sitemap());
  writeFileSync(join(dist, 'robots.txt'), robots());
  for (const r of results) console.log(`  prerendered ${r.path.padEnd(10)} ${r.bytes} chars`);
  console.log(`  sitemap.xml + robots.txt written`);

  stripAssetComments(dist);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
