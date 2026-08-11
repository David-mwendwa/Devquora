import slugify from 'slugify';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';

const DEVTO_BASE_URL = 'https://dev.to/api';
const REQUEST_DELAY_MS = 300;
const ARTICLES_PER_TAG = 20;
const MAX_ARTICLES_PER_CYCLE = 300;

// Curated to match Devquora's existing developer-audience tag taxonomy rather
// than dev.to's full firehose, which is heavy on non-technical career content.
const TAGS = [
  'javascript',
  'webdev',
  'programming',
  'architecture',
  'devops',
  'kubernetes',
  'react',
  'backend',
  'python',
  'node',
  'typescript',
  'css',
  'docker',
  'testing',
  'beginners',
  'opensource',
];

let isSyncing = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stripHtml = (html = '') =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

// Some dev.to authors hand-write their own "## Table of Contents" section
// (a heading + a list of anchor links, often bracketed by `---` rules) right
// in the article body. Devquora already builds its own "On this page" TOC
// from the same headings for the sidebar, so left as-is every such post would
// show its table of contents twice. Strip the author's inline copy — along
// with an immediately surrounding `---` pair, if present — before storing.
const stripInlineToc = (markdown = '') => {
  const lines = markdown.split('\n');
  const headingIdx = lines.findIndex((l) => /^#{1,4}\s*.*\btable of contents\b/i.test(l.trim()));
  if (headingIdx === -1) return markdown;

  let end = headingIdx + 1;
  while (end < lines.length) {
    const trimmed = lines[end].trim();
    const isListItem = /^([-*]|\d+\.)\s+/.test(trimmed);
    if (trimmed === '' || isListItem) end += 1;
    else break;
  }

  let start = headingIdx;
  let scanBack = headingIdx - 1;
  while (scanBack >= 0 && lines[scanBack].trim() === '') scanBack -= 1;
  if (scanBack >= 0 && /^-{3,}$/.test(lines[scanBack].trim())) start = scanBack;

  let scanFwd = end;
  while (scanFwd < lines.length && lines[scanFwd].trim() === '') scanFwd += 1;
  if (scanFwd < lines.length && /^-{3,}$/.test(lines[scanFwd].trim())) end = scanFwd + 1;

  return [...lines.slice(0, start), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

// Some authors open (or close) an article with a bare `---` — presumably a
// stylistic flourish in dev.to's own template. With nothing on one side to
// separate, it's not a "break" at all; here it just renders as a content
// <hr> sitting directly under our own header divider, reading as a doubled
// line rather than a break between sections.
const stripEdgeHr = (markdown = '') =>
  markdown
    .replace(/^\s*-{3,}\s*\n+/, '')
    .replace(/\n+\s*-{3,}\s*$/, '')
    .trim();

// dev.to's editor supports "Liquid tags" — its own embed/template syntax
// ({% card %}...{% endcard %}, {% cta url %}label{% endcta %}, {% youtube id %},
// {% embed url %}, etc.) that only renders into real widgets on dev.to itself.
// We have no way to reproduce those embeds, and left as-is they show up as
// literal, broken-looking `{% ... %}` template text in the article body. Rather
// than dropping the content entirely: paired tags (`{% x %}...{% endx %}`) are
// unwrapped down to their inner text — or turned into a plain markdown link if
// the tag's first argument is a URL (covers `cta`, most embeds) — and any
// leftover self-closing tag is either linkified the same way or removed.
// Runs iteratively so nested tags (e.g. a `cta` inside a `card`) fully resolve
// instead of leaving an inner tag's raw syntax behind after the outer unwraps.
const LIQUID_URL_RE = /^https?:\/\/\S+$/;

const cleanLiquidTags = (markdown = '') => {
  let result = markdown;
  let previous;
  do {
    previous = result;
    result = result.replace(
      // Args use a lazy match up to the literal `%}` rather than excluding `%`
      // outright — dev.to's own `cta` tags embed percent-encoded URLs (full of
      // `%XX` sequences) as their argument, which a `[^%]*` args pattern would
      // cut off at the first `%0A`/`%3A`/etc. Safe because percent-encoding
      // always follows `%` with a hex digit, never `}`, so a real `%}` can't
      // appear inside an encoded argument.
      /\{%\s*(\w+)([\s\S]*?)%\}([\s\S]*?)\{%\s*end\1\s*%\}/g,
      (_match, _name, argsRaw, inner) => {
        const arg = argsRaw.trim().split(/\s+/)[0];
        const content = inner.trim();
        return arg && LIQUID_URL_RE.test(arg) ? `[${content || arg}](${arg})` : content;
      }
    );
  } while (result !== previous);

  result = result.replace(/\{%\s*\w+([\s\S]*?)%\}/g, (_match, argsRaw) => {
    const arg = argsRaw.trim().split(/\s+/)[0];
    return arg && LIQUID_URL_RE.test(arg) ? `[Embedded content](${arg})` : '';
  });

  return result.replace(/\n{3,}/g, '\n\n').trim();
};

class RateLimitedError extends Error {}

const devtoFetch = async (path) => {
  const headers = {};
  if (process.env.DEVTO_API_KEY) headers['api-key'] = process.env.DEVTO_API_KEY;

  const res = await fetch(`${DEVTO_BASE_URL}${path}`, { headers });
  if (res.status === 429) throw new RateLimitedError('dev.to rate limit hit');
  if (!res.ok) throw new Error(`dev.to request failed: ${res.status} ${path}`);
  return res.json();
};

// dev.to's comments endpoint returns a tree (`children: [...]`), not a flat
// list — flatten it depth-first, carrying the parent's future Mongo _id
// forward isn't possible yet at this point (we haven't upserted anything),
// so we flatten into {..., parentExternalId} pairs and resolve parent _ids
// during the upsert pass below, in flattened order (parents always precede
// their children in a depth-first walk).
const flattenComments = (nodes, parentExternalId = null, acc = []) => {
  for (const node of nodes) {
    acc.push({
      externalId: node.id_code,
      parentExternalId,
      body: stripHtml(node.body_html),
      createdAt: node.created_at,
      author: {
        name: node.user?.name,
        username: node.user?.username,
        avatarUrl: node.user?.profile_image,
      },
    });
    if (node.children?.length) flattenComments(node.children, node.id_code, acc);
  }
  return acc;
};

const syncArticleComments = async (postId, articleExternalId) => {
  const tree = await devtoFetch(`/comments?a_id=${articleExternalId}`);
  const flat = flattenComments(tree);

  const externalIdToMongoId = new Map();
  for (const c of flat) {
    const doc = await Comment.findOneAndUpdate(
      { 'source.externalId': c.externalId },
      {
        post: postId,
        parentComment: c.parentExternalId ? externalIdToMongoId.get(c.parentExternalId) ?? null : null,
        author: c.author,
        body: c.body,
        createdAt: c.createdAt,
        source: { provider: 'devto', externalId: c.externalId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    externalIdToMongoId.set(c.externalId, doc._id);
  }

  // Derived from what we actually stored, not dev.to's self-reported count —
  // so it never drifts and never clobbers comments added in-app later (this
  // sync only adds/upserts dev.to comments, it never deletes anything).
  const commentsCount = await Comment.countDocuments({ post: postId });
  await Post.findByIdAndUpdate(postId, { commentsCount });
};

const syncArticle = async (summary) => {
  const detail = await devtoFetch(`/articles/${summary.id}`);
  await sleep(REQUEST_DELAY_MS);

  const slug = `${slugify(detail.title, { lower: true, strict: true })}-${detail.id}`;

  const post = await Post.findOneAndUpdate(
    { 'source.externalId': detail.id },
    {
      $set: {
        title: detail.title,
        slug,
        excerpt: detail.description,
        content: cleanLiquidTags(stripEdgeHr(stripInlineToc(detail.body_markdown))),
        // `cover_image` is null for articles published without a banner; fall
        // back to `social_image` (dev.to auto-generates one from the article's
        // tags/title in that case, so it's never null on a published article).
        coverImageUrl: detail.cover_image || detail.social_image || null,
        author: {
          name: detail.user?.name,
          username: detail.user?.username,
          avatarUrl: detail.user?.profile_image,
          externalUrl: detail.user?.website_url,
        },
        // dev.to's article-detail endpoint is inconsistent with its own list
        // endpoint here: `tag_list` on /articles/:id is a comma-separated
        // STRING ("javascript, webdev"), not an array — `tags` is the array.
        tags: detail.tags,
        readTimeMin: detail.reading_time_minutes,
        publishedAt: detail.published_at,
        source: { provider: 'devto', externalId: detail.id, url: detail.url },
      },
      // Only seeds `views` the first time this post is synced — every visit
      // afterward increments it for real (see getPostBySlug), and a later
      // resync must never stomp that back down to dev.to's snapshot number.
      $setOnInsert: { views: detail.public_reactions_count },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await syncArticleComments(post._id, detail.id);
  await sleep(REQUEST_DELAY_MS);
};

export const syncDevToPosts = async () => {
  if (isSyncing) {
    console.log('[devtoSync] sync already in progress, skipping this trigger');
    return { skipped: true };
  }
  isSyncing = true;
  console.log('[devtoSync] starting sync cycle...');

  const seen = new Map();
  try {
    for (const tag of TAGS) {
      try {
        const articles = await devtoFetch(`/articles?tag=${tag}&per_page=${ARTICLES_PER_TAG}&top=90`);
        for (const a of articles) {
          if (!seen.has(a.id)) seen.set(a.id, a);
        }
        await sleep(REQUEST_DELAY_MS);
      } catch (err) {
        if (err instanceof RateLimitedError) throw err;
        console.error(`[devtoSync] failed to list articles for tag "${tag}":`, err.message);
      }
    }

    const summaries = [...seen.values()].slice(0, MAX_ARTICLES_PER_CYCLE);
    let synced = 0;
    for (const summary of summaries) {
      try {
        await syncArticle(summary);
        synced += 1;
      } catch (err) {
        if (err instanceof RateLimitedError) {
          console.warn('[devtoSync] rate limited by dev.to — stopping this cycle early');
          break;
        }
        console.error(`[devtoSync] failed to sync article "${summary.title}":`, err.message);
      }
    }

    console.log(`[devtoSync] sync cycle complete — ${synced}/${summaries.length} articles synced`);
    return { synced, total: summaries.length };
  } finally {
    isSyncing = false;
  }
};

export const isSyncInProgress = () => isSyncing;
