// Checks that the prerendered pages are real, and that the app adopts them.
//
// Two different things can go wrong here and neither is visible in a browser:
//
//   1. The static HTML comes out empty — renderToString instead of onAllReady,
//      or a render-time crash. The page still looks perfect a moment later
//      when React mounts, and is worthless to every crawler and unfurler.
//   2. The HTML is right but React throws it away on hydration and rebuilds
//      it, because the route's lazy chunk was not ready and Suspense rendered
//      a fallback against a full page of markup. The result is also correct,
//      and is the entire cost of prerendering with none of the benefit.
//
// scripts/verify-build.mjs covers the first from the files on disk. This
// covers the second, which needs a real browser.
//
// It serves dist/ itself rather than using `vite preview`, because the two
// disagree about exactly the thing being tested: preview answers /about with
// the SPA shell, while Netlify answers it with about/index.html. Testing
// against preview would hydrate the landing page's markup into the about
// route and report the resulting mismatch as a bug in the app.
//
// The API is not running during this test, so every page settles into its
// error or empty state. That is deliberate — hydration happens before those
// effects resolve, so the check is unaffected, and it keeps the test from
// depending on a database.
//
// Needs a production build:
//   npm run build && node tests/prerender.test.mjs

const EXEC_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const PORT = Number(process.env.PORT ?? 4179);
const WEB = `http://localhost:${PORT}`;

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  console.log('playwright-core not installed — skipping prerender test');
  process.exit(0);
}

const { existsSync } = await import('fs');
const executablePath = EXEC_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.log('no chromium binary found — skipping prerender test');
  process.exit(0);
}

const ROUTES = ['/', '/explore', '/about', '/login', '/signup'];

// Routes the build does NOT prerender. Netlify answers these with the SPA
// fallback, which is index.html — the landing page's markup, in the root. They
// are here because that is exactly the case that broke: main.jsx saw a
// non-empty root and hydrated, reconciling an article against a feed, and
// every one of these pages logged React #418 in production while quietly
// throwing the markup away. A prerendered-only test cannot see it.
const FALLBACK_ROUTES = ['/post/some-article-that-does-not-exist', '/dashboard'];

/*
 * A static server that resolves paths the way Netlify does: an existing file
 * first, then <path>/index.html, and only then the SPA shell through the
 * unforced /* redirect. That order is the whole reason the prerendered pages
 * are reachable, so the test uses it rather than trusting that it holds.
 */
const { createServer } = await import('node:http');
const { readFile } = await import('node:fs/promises');
const { join, extname, normalize } = await import('node:path');

const dist = new URL('../dist/', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

const send = async (res, file) => {
  const body = await readFile(file);
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(body);
};

const server = createServer(async (req, res) => {
  // normalize collapses any "..", so a request cannot escape dist/.
  const path = normalize(decodeURIComponent(new URL(req.url, WEB).pathname));
  for (const candidate of [join(dist, path), join(dist, path, 'index.html'), join(dist, 'index.html')]) {
    try {
      await send(res, candidate);
      return;
    } catch {
      /* try the next one */
    }
  }
  res.writeHead(404).end();
});
await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch({ executablePath });
const failures = [];

for (const route of [...ROUTES, ...FALLBACK_ROUTES]) {
  const prerendered = ROUTES.includes(route);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto(WEB + route, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // Hydration mismatches are reported as React error #418/#423 in a production
  // build, and as "Hydration failed" / "did not match" in development.
  const hydrationErrors = errors.filter((text) => /hydrat|#418|#423|did not match/i.test(text));
  if (hydrationErrors.length) failures.push(`${route}: hydration mismatch — ${hydrationErrors[0]}`);

  const text = await page.evaluate(() => document.getElementById('root')?.innerText ?? '');
  if (text.trim().length < 40) failures.push(`${route}: root rendered ${text.trim().length} chars of text`);

  // The stamp is what tells the client whether the markup it was served
  // belongs to this URL. A prerendered route must carry its own path; a
  // fallback route carries "/" and must therefore mount fresh.
  const stamp = await page.evaluate(() => document.getElementById('root')?.dataset.prerendered ?? null);
  if (prerendered && stamp !== route) {
    failures.push(`${route}: data-prerendered is ${JSON.stringify(stamp)}, expected ${JSON.stringify(route)}`);
  }

  // The self-hosted faces must be the ones in use, from our own origin.
  const fontRequests = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('.woff2'))
      .map((entry) => entry.name)
  );
  if (fontRequests.some((url) => url.includes('gstatic.com'))) {
    failures.push(`${route}: still fetching fonts from Google`);
  }

  const title = await page.title();
  if (!title.includes('Devquora')) failures.push(`${route}: unexpected title ${JSON.stringify(title)}`);

  console.log(
    `  ${prerendered ? 'prerendered' : 'fallback   '} ${route.padEnd(38)} ${String(text.trim().length).padStart(5)} chars · ${title}`
  );
  await context.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'}\n`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  process.exit(1);
}

console.log(`\n  ${ROUTES.length} prerendered routes hydrate cleanly, ${FALLBACK_ROUTES.length} fallback routes mount without a mismatch`);
