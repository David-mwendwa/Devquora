import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import site from '../data/site.js';

// Patches the tags index.html ships with, rather than adding a second set.
// Duplicate og:title tags are worse than none — a crawler picks one and it is
// not necessarily the one describing the page.
const setMeta = (selector, value) => {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('content', value);
};

const setLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const removeTag = (selector) => {
  const el = document.head.querySelector(selector);
  if (el) el.remove();
};

/**
 * Sets the per-route title, description and social tags.
 *
 * `canonical` is an override, and exists for one case: articles synced in from
 * dev.to are not originals, and pointing their canonical at this site would
 * claim authorship of someone else's writing. See PostView.
 */
const usePageMeta = (title, description, { noindex = false, canonical } = {}) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title ? `${title} | ${site.name}` : `${site.name} — ${site.tagline}`;
    const desc = description || site.description;
    // Query strings produce endless near-duplicate URLs of the same page; the
    // canonical names the page, not the way the reader arrived at it.
    const url = canonical || `${site.url}${pathname}`;

    document.title = fullTitle;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', desc);
    setLink('canonical', url);

    if (noindex) {
      let robots = document.head.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, follow');
    } else {
      removeTag('meta[name="robots"]');
    }
  }, [title, description, noindex, canonical, pathname]);
};

export default usePageMeta;
