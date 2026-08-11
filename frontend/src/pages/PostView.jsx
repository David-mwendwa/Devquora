import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import {
  FiBookmark,
  FiShare2,
  FiCheck,
  FiList,
  FiMessageCircle,
  FiAlertCircle,
  FiHeart,
} from 'react-icons/fi';
import {
  fetchPostBySlug,
  fetchRelatedPosts,
  fetchComments,
  togglePostLike,
  togglePostSave,
} from '../api/posts';
import { useAuth } from '../context/AuthContext';
import TagChip from '../components/TagChip';
import CodeBlock from '../components/CodeBlock';
import CommentSection from '../components/CommentSection';
import ErrorState from '../components/ErrorState';
import { copyText } from '../lib/clipboard';
import { markdownRehypePlugins } from '../lib/markdownRehype';
import usePageTitle from '../hooks/usePageTitle';

// Varied line widths per "paragraph" so the loading state reads as prose rhythm
// rather than a uniform stack of identical bars.
const SKELETON_PARAGRAPHS = [
  ['100%', '100%', '92%'],
  ['100%', '100%', '100%', '76%'],
  ['88%'],
  ['100%', '95%', '100%', '60%'],
  ['100%', '82%'],
  ['100%', '100%', '90%'],
  ['100%', '100%', '100%', '70%'],
  ['92%'],
  ['100%', '100%', '85%'],
];

const SKELETON_TOC_WIDTHS = ['90%', '75%', '60%', '80%', '65%', '85%', '70%', '55%', '78%'];

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// Headings are parsed straight from the raw markdown (not the rendered React tree) so
// the TOC and the ids assigned to rendered headings come from one source. The renderer
// looks ids up by slugified text (a pure function of its own children) rather than a
// shared counter incremented during render — StrictMode double-invokes render functions,
// which corrupts any mutable counter touched inside one.
const extractHeadings = (markdown) => {
  const matches = [...markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)];
  const seen = new Map();
  const headings = [];
  const idByBaseSlug = new Map();
  matches.forEach(([, hashes, text]) => {
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count > 0 ? `${base}-${count + 1}` : base;
    headings.push({ level: hashes.length, text, id });
    if (!idByBaseSlug.has(base)) idByBaseSlug.set(base, id);
  });
  return { headings, idByBaseSlug };
};

const flattenText = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (node.props?.children != null) return flattenText(node.props.children);
  return '';
};

const PostView = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState('loading');
  usePageTitle(post?.title ?? (status === 'not-found' ? 'Post not found' : undefined));
  // Comments arrive in a second fetch, after `status` already flips to
  // 'ready' for the post itself — tracked separately so CommentSection can
  // tell "still loading" apart from "genuinely zero comments".
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setCommentsLoading(true);
    fetchPostBySlug(slug)
      .then((postRes) => {
        if (cancelled) return;
        setPost(postRes);
        setStatus('ready');
        return Promise.all([fetchRelatedPosts(slug), fetchComments(slug)]).then(
          ([relatedRes, commentsRes]) => {
            if (cancelled) return;
            setRelated(relatedRes);
            setComments(commentsRes);
            setCommentsLoading(false);
          }
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err.response?.status === 404 ? 'not-found' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [slug, retryKey]);

  const { headings, idByBaseSlug } = useMemo(() => extractHeadings(post?.content ?? ''), [post]);

  // PostView re-renders on every scroll tick (via `progress` below) — if this
  // components map were recreated inline on each render, ReactMarkdown would
  // see new h2/h3 component identities and remount the actual heading DOM
  // nodes mid-scroll, orphaning whatever the heading IntersectionObserver was
  // watching so "On this page" would stop updating after the first render.
  // Keying the memo on `idByBaseSlug` (stable unless the post itself changes)
  // keeps the same component instances — and DOM nodes — across those renders.
  const markdownComponents = useMemo(() => {
    const headingRenderer = (level) =>
      function Heading({ children }) {
        const id = idByBaseSlug.get(slugify(flattenText(children)));
        const Tag = `h${level}`;
        return <Tag id={id}>{children}</Tag>;
      };
    return {
      code: ({ className, children }) => <CodeBlock className={className}>{children}</CodeBlock>,
      h2: headingRenderer(2),
      h3: headingRenderer(3),
    };
  }, [idByBaseSlug]);

  // Drives the "On this page" active-section highlight. This used to be a
  // separate IntersectionObserver that only fired for headings whose
  // visibility had just *changed* — on a big scroll jump (or a fast flick)
  // several headings could cross at once with none of them individually
  // registering as "now intersecting", leaving the observer's callback with
  // nothing to report and the highlight stuck on a stale heading. Computing
  // it directly from each heading's current position on every tick has no
  // such gap: it always reflects exactly where the scroll position is.
  useEffect(() => {
    if (headings.length === 0) return undefined;
    const HEADING_OFFSET = 90; // clears the sticky header

    const onScroll = () => {
      let current = headings[0].id;
      for (const h of headings) {
        const node = document.getElementById(h.id);
        if (node && node.getBoundingClientRect().top <= HEADING_OFFSET) {
          current = h.id;
        } else {
          break;
        }
      }
      setActiveHeadingId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  if (status === 'loading') {
    return (
      <div className="container grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1fr_280px] lg:gap-0">
        <div className="min-w-0 lg:pr-10">
          <div className="skeleton mb-2 h-9 w-full rounded" />
          <div className="skeleton mb-4 h-9 w-2/3 rounded" />

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-dark-200 pb-6 dark:border-dark-700">
            <div className="flex items-center gap-3">
              <div className="skeleton h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-48 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-8 w-14 rounded-md" />
              <div className="skeleton h-8 w-20 rounded-md" />
              <div className="skeleton h-8 w-20 rounded-md" />
            </div>
          </div>

          {SKELETON_PARAGRAPHS.map((widths, i) => (
            <div key={i} className="mb-5 space-y-2.5">
              {widths.map((w, j) => (
                <div key={j} className="skeleton h-4 rounded" style={{ width: w }} />
              ))}
            </div>
          ))}

          <div className="mb-10 mt-8 flex flex-wrap gap-2 border-t border-dark-200 pt-6 dark:border-dark-700">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-6 w-16 rounded-full" />
            ))}
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
          </div>
          <div className="mb-8 flex gap-3">
            <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
            <div className="skeleton h-20 w-full rounded-lg" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-5 flex gap-3">
              <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-32 rounded" />
                <div className="skeleton h-3.5 w-full rounded" />
                <div className="skeleton h-3.5 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden flex-col divide-y divide-dark-200 lg:flex lg:border-l lg:border-dark-200 lg:pl-10 dark:divide-dark-700 dark:lg:border-dark-700">
          <div className="pb-4">
            <div className="skeleton mb-3 h-4 w-28 rounded" />
            <div className="space-y-3">
              {SKELETON_TOC_WIDTHS.map((w, i) => (
                <div
                  key={i}
                  className="skeleton h-3.5 rounded"
                  style={{ width: w, marginLeft: [2, 4, 7].includes(i) ? '1rem' : 0 }}
                />
              ))}
            </div>
          </div>
          <div className="py-4 first:pt-0">
            <div className="skeleton mb-2 h-5 w-32 rounded" />
            <div className="skeleton h-3.5 w-40 rounded" />
          </div>
          <div className="py-4">
            <div className="skeleton mb-3 h-4 w-28 rounded" />
            <div className="space-y-3">
              <div className="skeleton h-3.5 w-full rounded" />
              <div className="skeleton h-3.5 w-3/4 rounded" />
              <div className="skeleton h-3.5 w-5/6 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container py-16">
        <ErrorState message="Couldn't load this post." onRetry={() => setRetryKey((k) => k + 1)} />
      </div>
    );
  }

  if (status === 'not-found' || !post) {
    return (
      <div className="container py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Post not found</h1>
        <Link to="/" className="text-primary-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const isLiked = !!(user && post.likes?.includes(user.id));
  const isSaved = !!(user && post.savedBy?.includes(user.id));

  const handleToggleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const wasLiked = isLiked;
    setPost((p) => ({
      ...p,
      likes: wasLiked ? p.likes.filter((id) => id !== user.id) : [...(p.likes ?? []), user.id],
    }));
    try {
      await togglePostLike(slug);
    } catch {
      setPost((p) => ({
        ...p,
        likes: wasLiked ? [...(p.likes ?? []), user.id] : p.likes.filter((id) => id !== user.id),
      }));
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const wasSaved = isSaved;
    setPost((p) => ({
      ...p,
      savedBy: wasSaved ? p.savedBy.filter((id) => id !== user.id) : [...(p.savedBy ?? []), user.id],
    }));
    try {
      await togglePostSave(slug);
    } catch {
      setPost((p) => ({
        ...p,
        savedBy: wasSaved ? [...(p.savedBy ?? []), user.id] : p.savedBy.filter((id) => id !== user.id),
      }));
    }
  };

  const handleShare = async () => {
    const shareData = { title: post.title, text: post.excerpt, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user cancelled the native share sheet
        // fall through to clipboard copy below
      }
    }
    const ok = await copyText(window.location.href);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setShareError(true);
      setTimeout(() => setShareError(false), 2000);
    }
  };

  return (
    <div className="container grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1fr_280px] lg:gap-0">
      <article className="min-w-0 lg:pr-10">
          {post.coverImageUrl && (
            <img
              src={post.coverImageUrl}
              alt=""
              className="mb-6 aspect-[100/42] w-full rounded-xl object-cover"
            />
          )}
          <h1 className="mb-4 font-heading text-4xl font-bold">{post.title}</h1>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-dark-200 pb-6 dark:border-dark-700">
            <div className="flex items-center gap-3">
              <img
                src={post.author.avatarUrl}
                alt={post.author.username}
                className="h-12 w-12 rounded-full"
              />
              <div>
                <Link
                  to={`/u/${post.author.username}`}
                  className="font-medium hover:text-primary-600">
                  {post.author.name}
                </Link>
                <p className="text-sm text-dark-500">
                  {format(new Date(post.publishedAt), 'MMM d, yyyy')} &middot; {post.readTimeMin}{' '}
                  min read &middot; {post.views.toLocaleString()} views
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleLike}
                aria-pressed={isLiked}
                title={isLiked ? 'Unlike' : 'Like'}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  isLiked
                    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
                    : 'border-dark-200 text-dark-600 hover:bg-surface-muted dark:border-dark-700'
                }`}>
                <FiHeart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                {post.likes?.length > 0 ? post.likes.length : 'Like'}
              </button>
              <a
                href="#comments"
                className="flex items-center gap-1.5 rounded-md border border-dark-200 px-3 py-1.5 text-sm font-medium text-dark-600 hover:bg-surface-muted dark:border-dark-700">
                <FiMessageCircle size={14} />
                {post.commentsCount ?? comments.length}
              </a>
              <button
                type="button"
                onClick={handleToggleSave}
                aria-pressed={isSaved}
                title={isSaved ? 'Remove from saved' : 'Save for later'}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  isSaved
                    ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300'
                    : 'border-dark-200 text-dark-600 hover:bg-surface-muted dark:border-dark-700'
                }`}>
                <FiBookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleShare}
                title="Share"
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  shareError
                    ? 'border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-800 dark:bg-danger-950 dark:text-danger-300'
                    : 'border-dark-200 text-dark-600 hover:bg-surface-muted dark:border-dark-700'
                }`}>
                {shareError ? (
                  <FiAlertCircle size={14} />
                ) : copied ? (
                  <FiCheck size={14} className="text-success-600" />
                ) : (
                  <FiShare2 size={14} />
                )}
                {shareError ? "Couldn't copy" : copied ? 'Copied!' : 'Share'}
              </button>
            </div>
          </div>

          {headings.length > 0 && (
            <details className="mb-6 rounded-lg border border-dark-200 bg-surface-muted p-4 lg:hidden">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-dark-600">
                <FiList size={14} />
                Jump to section
              </summary>
              <ul className="mt-3 space-y-2">
                {headings.map((h) => (
                  <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
                    <a href={`#${h.id}`} className="text-sm text-dark-500 hover:text-primary-600">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="prose prose-slate max-w-none break-words dark:prose-invert prose-headings:font-heading prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-primary-300">
            <ReactMarkdown components={markdownComponents} rehypePlugins={markdownRehypePlugins}>
              {post.content}
            </ReactMarkdown>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-dark-200 pt-6 dark:border-dark-700">
            {post.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>

          <CommentSection slug={slug} initialComments={comments} loading={commentsLoading} />
        </article>

        <aside className="flex flex-col divide-y divide-dark-200 lg:sticky lg:top-20 lg:self-start lg:border-l lg:border-dark-200 lg:pl-10 dark:divide-dark-700 dark:lg:border-dark-700">
          {headings.length > 0 && (
            <div className="hidden pb-4 lg:block">
              <h3 className="mb-3 flex items-center gap-2 font-heading font-bold">
                <FiList size={14} />
                On this page
              </h3>
              <ul className="space-y-2">
                {headings.map((h) => (
                  <li key={h.id} style={{ paddingLeft: h.level === 3 ? '1rem' : 0 }}>
                    <a
                      href={`#${h.id}`}
                      onClick={() => setActiveHeadingId(h.id)}
                      className={`block border-l-2 pl-3 text-sm transition ${
                        activeHeadingId === h.id
                          ? 'border-primary-600 font-medium text-primary-600'
                          : 'border-dark-200 text-dark-500 hover:border-dark-400 hover:text-primary-600 dark:border-dark-700'
                      }`}>
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="py-4 first:pt-0">
            <h3 className="mb-1 font-heading font-bold">{post.author.name}</h3>
            {post.author.externalUrl && (
              <a
                href={post.author.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-dark-500 hover:text-primary-600">
                {post.author.externalUrl.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {related.length > 0 && (
            <div className="py-4">
              <h3 className="mb-3 font-heading font-bold">Related posts</h3>
              <ul className="space-y-3">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/post/${r.slug}`} className="text-sm hover:text-primary-600">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </aside>
    </div>
  );
};

export default PostView;
