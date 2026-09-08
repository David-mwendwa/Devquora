// One source of truth for the strings that appear in <head>, in the prerendered
// pages, in the sitemap and on the social card. They were previously either
// absent or written into index.html by hand, which is how a site ends up
// telling Google one thing and Twitter another.
export const site = {
  name: 'Devquora',
  url: 'https://devquora.netlify.app',
  tagline: 'Developer writing worth reading',
  description:
    'A developer-focused blogging platform: markdown-first writing, code that looks like code, threaded discussion, and a reading feed with no algorithm in the way.',
  shortDescription: 'Markdown-first blogging for developers.',
  author: 'David Mwendwa',
  repo: 'https://github.com/David-mwendwa/Devquora',
  locale: 'en_US',
};

// The routes the build prerenders to their own directory (see
// scripts/prerender-meta.mjs, which imports this list). It lives here rather
// than only in the build script because the running app needs it too: Netlify
// serves login/index.html and 301s the un-slashed /login, so the canonical for
// a prerendered route has to carry the trailing slash.
//
// A direct hit gets the redirect and `location.pathname` already ends in a
// slash, which hides the problem. Client-side navigation does not redirect, so
// a reader arriving via an in-app link would otherwise be handed a canonical
// naming a URL that 301s — a weaker signal than it looks, and invisible unless
// you test the in-app navigation rather than the direct hit.
export const PRERENDERED_PATHS = ['/', '/explore', '/about', '/login', '/signup', '/404'];

const normalise = (pathname) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

/** Absolute canonical URL for a pathname, trailing slash included where Netlify requires one. */
export const canonicalUrl = (pathname) => {
  const path = normalise(pathname);
  const slashed = PRERENDERED_PATHS.includes(path) && path !== '/' ? `${path}/` : path;
  return `${site.url}${slashed}`;
};

export default site;
