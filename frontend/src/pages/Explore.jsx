import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiX, FiClock, FiTrendingUp, FiInbox, FiHash } from 'react-icons/fi';
import PostCard from '../components/PostCard';
import { PostListSkeleton } from '../components/PostCardSkeleton';
import ErrorState from '../components/ErrorState';
import { fetchPosts, fetchPostTags } from '../api/posts';
import usePageTitle from '../hooks/usePageTitle';

const SORTS = {
  recent: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  trending: (a, b) => b.views - a.views,
};

const Explore = () => {
  usePageTitle('Explore');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag');
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') === 'trending' ? 'trending' : 'recent';

  const [posts, setPosts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [status, setStatus] = useState('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([fetchPosts({ limit: 100 }), fetchPostTags()])
      .then(([postsRes, tagsRes]) => {
        if (cancelled) return;
        setPosts(postsRes.posts);
        setAllTags(tagsRes);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  const results = useMemo(() => {
    const ql = q.toLowerCase();
    const filtered = posts.filter((post) => {
      const matchesTag = activeTag ? post.tags.includes(activeTag) : true;
      const matchesQuery = ql
        ? post.title.toLowerCase().includes(ql) ||
          post.excerpt.toLowerCase().includes(ql) ||
          post.tags.some((t) => t.includes(ql))
        : true;
      return matchesTag && matchesQuery;
    });
    return [...filtered].sort(SORTS[sort]);
  }, [posts, activeTag, q, sort]);

  const hasFilters = Boolean(activeTag || q);

  return (
    <div className="container grid grid-cols-1 gap-8 py-8 lg:grid-cols-[220px_1fr] lg:gap-0">
      {/* Desktop tag sidebar — a 40+ tag cloud wrapping across the top of the
          page pushed results below the fold, so filtering moves here instead. */}
      <aside className="hidden lg:block lg:border-r lg:border-dark-200 lg:pr-6 dark:lg:border-dark-700">
        <div className="sticky top-20">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-dark-400">
            <FiHash size={13} className="text-primary-500" />
            Filter by tag
          </div>
          <div className="flex max-h-[calc(100vh-8rem)] flex-col gap-0.5 overflow-y-auto pr-2">
            <button
              onClick={() => updateParams({ tag: null })}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors ${
                !activeTag
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'text-dark-600 hover:bg-surface-muted dark:text-dark-300'
              }`}>
              All posts
            </button>
            {status === 'loading'
              ? Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} className="skeleton my-0.5 h-7 w-full shrink-0 rounded-md" />
                ))
              : allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => updateParams({ tag })}
                    className={`shrink-0 truncate rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors ${
                      activeTag === tag
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                        : 'text-dark-600 hover:bg-surface-muted dark:text-dark-300'
                    }`}>
                    #{tag}
                  </button>
                ))}
          </div>
        </div>
      </aside>

      <div className="lg:pl-8">
      <h1 className="mb-2 font-heading text-3xl font-bold">Explore</h1>
      <p className="mb-6 text-dark-500">
        Browse posts by tag, or search from the bar in the navbar above.
      </p>

      {/* Mobile fallback — the sidebar is lg+ only, so small screens keep the
          original wrapping tag cloud rather than losing tag filtering entirely. */}
      <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
        <button
          onClick={() => updateParams({ tag: null })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            !activeTag
              ? 'bg-primary-600 text-white'
              : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-200'
          }`}>
          All
        </button>
        {status === 'loading'
          ? Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="skeleton h-6 w-16 rounded-full" />
            ))
          : allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => updateParams({ tag })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeTag === tag
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-200'
                }`}>
                #{tag}
              </button>
            ))}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-dark-200 pb-4 dark:border-dark-700">
        <div className="flex flex-wrap items-center gap-2 text-sm text-dark-500">
          {status === 'loading' ? (
            <span className="skeleton h-4 w-16 rounded" />
          ) : (
            <span>
              {results.length} {results.length === 1 ? 'post' : 'posts'}
            </span>
          )}
          {status === 'ready' && hasFilters && (
            <>
              {q && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                  "{q}"
                  <button
                    type="button"
                    onClick={() => updateParams({ q: null })}
                    aria-label="Clear search"
                    className="hover:text-primary-900 dark:hover:text-primary-100">
                    <FiX size={12} />
                  </button>
                </span>
              )}
              {activeTag && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                  #{activeTag}
                  <button
                    type="button"
                    onClick={() => updateParams({ tag: null })}
                    aria-label="Clear tag filter"
                    className="hover:text-primary-900 dark:hover:text-primary-100">
                    <FiX size={12} />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="text-xs font-medium text-dark-400 hover:text-primary-600 hover:underline">
                Clear all
              </button>
            </>
          )}
        </div>

        <div className="flex gap-1 rounded-md border border-dark-200 p-1 dark:border-dark-700">
          <button
            type="button"
            onClick={() => updateParams({ sort: null })}
            className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
              sort === 'recent'
                ? 'bg-primary-600 text-white'
                : 'text-dark-500 hover:bg-surface-muted'
            }`}>
            <FiClock size={12} />
            Recent
          </button>
          <button
            type="button"
            onClick={() => updateParams({ sort: 'trending' })}
            className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
              sort === 'trending'
                ? 'bg-primary-600 text-white'
                : 'text-dark-500 hover:bg-surface-muted'
            }`}>
            <FiTrendingUp size={12} />
            Trending
          </button>
        </div>
      </div>

      {status === 'loading' && <PostListSkeleton count={6} />}
      {status === 'error' && (
        <ErrorState
          message="Couldn't load posts. Please try again shortly."
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      )}
      {status === 'ready' && results.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-dark-200 py-16 text-center dark:border-dark-700">
          <FiInbox size={28} className="text-dark-300 dark:text-dark-600" />
          <p className="text-dark-500">No posts found.</p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="text-sm font-medium text-primary-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}
      {status === 'ready' && results.length > 0 && (
        <div className="flex flex-col">
          {results.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Explore;
