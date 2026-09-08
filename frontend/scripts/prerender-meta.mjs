// Shared by the prerender step and the build verifier, so the two cannot
// disagree about what any given page is supposed to say.
import { PRERENDERED_PATHS } from '../src/data/site.js';

export const SITE_URL = 'https://devquora.netlify.app';
export const SITE_NAME = 'Devquora';
export const SITE_TAGLINE = 'Developer writing worth reading';
export const SITE_DESCRIPTION =
  'A developer-focused blogging platform: markdown-first writing, code that looks like code, threaded discussion, and a reading feed with no algorithm in the way.';

export const NOT_FOUND_PATH = '/404';

// Only routes that render something worth reading without a session. The
// dashboards, the editor and the account pages are all behind a guard and
// would prerender as an empty shell.
export const ROUTES = [
  {
    path: '/',
    title: null,
    description: SITE_DESCRIPTION,
    changefreq: 'daily',
    priority: '1.0',
  },
  {
    path: '/explore',
    title: 'Explore',
    description:
      'Browse every post on Devquora by tag — architecture, tooling, languages and the rest of what developers are writing about.',
    changefreq: 'daily',
    priority: '0.9',
  },
  {
    path: '/about',
    title: 'About',
    description: 'What Devquora is, how the reading feed works, and where its content comes from.',
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    path: '/login',
    title: 'Log in',
    description:
      'Sign in to Devquora to write, comment, save posts and follow discussion. One-click demo accounts available.',
    changefreq: 'monthly',
    priority: '0.5',
  },
  {
    path: '/signup',
    title: 'Sign up',
    description:
      'Create a Devquora account to publish markdown posts, join discussions and build a reading list.',
    changefreq: 'monthly',
    priority: '0.5',
  },
  {
    path: NOT_FOUND_PATH,
    title: 'Page not found',
    description: 'That page does not exist on Devquora.',
    noindex: true,
  },
];

export const PRERENDER_PATHS = ROUTES.map((r) => r.path);

// Two lists of the same thing is one list too many, but ROUTES also carries
// titles and descriptions the app has no use for. Keeping them separate and
// asserting they agree costs nothing and catches the drift.
if (
  PRERENDERED_PATHS.length !== PRERENDER_PATHS.length ||
  PRERENDER_PATHS.some((p) => !PRERENDERED_PATHS.includes(p))
) {
  throw new Error(
    `prerender-meta: ROUTES (${PRERENDER_PATHS.join(', ')}) disagrees with ` +
      `PRERENDERED_PATHS in src/data/site.js (${PRERENDERED_PATHS.join(', ')})`
  );
}

export const metaForPath = (path) => ROUTES.find((r) => r.path === path);

export const titleFor = (route) =>
  route.title ? `${route.title} | ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE}`;

// Netlify redirects /about to /about/ when it is serving about/index.html, so
// the un-slashed form is a 301, not a page. A canonical, an og:url and a
// sitemap entry all have to name the URL that answers with a 200 — pointing
// them at a redirect makes every one of them a weaker signal than it looks.
//
// Delegated to the app's own canonicalUrl so the HTML the build writes and the
// HTML the running app rewrites cannot disagree about the same page.
export { canonicalUrl as canonicalFor } from '../src/data/site.js';

// Paths that should never appear in a search result: everything behind a
// session, plus the article routes, which are almost entirely syndicated from
// dev.to. See netlify.toml for the header that enforces the article rule.
export const DISALLOW = ['/account', '/activity', '/dashboard', '/post/new', '/u/', '/404'];
