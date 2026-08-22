import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiEdit3,
  FiGrid,
  FiUser,
  FiHash,
  FiTrendingUp,
  FiMessageCircle,
  FiClock,
  FiFileText,
  FiUsers,
} from 'react-icons/fi';
import PostCard from '../components/PostCard';
import FeaturedPost from '../components/FeaturedPost';
import { PostListSkeleton } from '../components/PostCardSkeleton';
import ErrorState from '../components/ErrorState';
import TagChip from '../components/TagChip';
import { fetchPosts, fetchPostTags } from '../api/posts';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../hooks/usePageTitle';

const Home = () => {
  usePageTitle();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([fetchPosts({ limit: 20 }), fetchPostTags()])
      .then(([postsRes, tagsRes]) => {
        if (cancelled) return;
        setPosts(postsRes.posts);
        setTags(tagsRes);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  // Fed by the same fetch as the feed — no extra requests. Gives the sidebar
  // something worth scrolling to instead of empty space below the CTA card.
  const popularPosts = [...posts]
    .sort((a, b) => (b.commentsCount ?? 0) - (a.commentsCount ?? 0))
    .slice(0, 4);
  const trendingTags = tags.slice(0, 10);

  const sortedPosts = [...posts].sort((a, b) =>
    sort === 'trending' ? b.views - a.views : new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  const writerCount = new Set(posts.map((p) => p.author.username)).size;

  // A spotlight above the feed, not part of it — stays fixed to the single
  // most-viewed post regardless of the Recent/Trending toggle below, so it
  // doesn't jump around every time the reader flips sort order.
  const featuredPost = posts.length
    ? [...posts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0]
    : null;
  const gridPosts = featuredPost
    ? sortedPosts.filter((p) => p.id !== featuredPost.id)
    : sortedPosts;

  return (
    <div className="container grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1fr_280px] lg:gap-0">
      <div className="lg:pr-10">
        <div className="mb-4 flex items-center gap-4 text-sm text-dark-400">
          {status === 'loading' ? (
            <>
              <span className="skeleton h-4 w-20 rounded" />
              <span className="skeleton h-4 w-24 rounded" />
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <FiFileText size={13} className="text-primary-500" />
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </span>
              <span className="flex items-center gap-1.5">
                <FiUsers size={13} className="text-primary-500" />
                {writerCount} {writerCount === 1 ? 'writer' : 'writers'}
              </span>
            </>
          )}
        </div>

        {status === 'loading' && (
          <div className="mb-8 grid grid-cols-1 overflow-hidden rounded-2xl border border-dark-200 dark:border-dark-700 sm:grid-cols-2">
            <div className="skeleton aspect-[16/9] sm:aspect-auto" />
            <div className="flex flex-col justify-center gap-3 p-8">
              <div className="skeleton h-5 w-24 rounded-full" />
              <div className="skeleton h-7 w-full rounded" />
              <div className="skeleton h-7 w-2/3 rounded" />
              <div className="skeleton mt-2 h-4 w-full rounded" />
            </div>
          </div>
        )}
        {status === 'ready' && featuredPost && <FeaturedPost post={featuredPost} />}

        <div className="mb-2 flex flex-wrap items-center gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-600" />
            <span className="text-sm font-semibold uppercase tracking-widest text-dark-500">
              {sort === 'trending' ? 'Trending posts' : 'Latest posts'}
            </span>
          </div>
          <div className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
          <div className="flex gap-1 rounded-md border border-dark-200 p-1 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setSort('recent')}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
                sort === 'recent' ? 'bg-primary-600 text-white' : 'text-dark-500 hover:bg-surface-muted'
              }`}>
              <FiClock size={12} />
              Recent
            </button>
            <button
              type="button"
              onClick={() => setSort('trending')}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
                sort === 'trending' ? 'bg-primary-600 text-white' : 'text-dark-500 hover:bg-surface-muted'
              }`}>
              <FiTrendingUp size={12} />
              Trending
            </button>
          </div>
        </div>

        {status === 'loading' && <PostListSkeleton count={4} />}
        {status === 'error' && (
          <ErrorState
            message="Couldn't load posts. Please try again shortly."
            onRetry={() => setRetryKey((k) => k + 1)}
          />
        )}
        {status === 'ready' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {posts.length === 0 && <p className="py-8 text-sm text-dark-500">No posts yet.</p>}
            {gridPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      <aside className="hidden lg:block lg:border-l lg:border-dark-200 lg:pl-10 dark:lg:border-dark-700">
        <div className="sticky top-20 border-t border-dark-200 pt-4 dark:border-dark-700">
          {user && user.role === 'author' ? (
            <>
              <h3 className="mb-2 font-heading text-lg font-bold">Welcome back, {user.name}</h3>
              <p className="mb-4 text-sm text-dark-500">
                Got something worth writing up? Share it with developers who read Devquora.
              </p>
              <Link
                to="/post/new"
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-700">
                <FiEdit3 size={14} />
                Write a post
              </Link>
            </>
          ) : user && user.role === 'admin' ? (
            <>
              <h3 className="mb-2 font-heading text-lg font-bold">Welcome back, {user.name}</h3>
              <p className="mb-4 text-sm text-dark-500">
                Manage posts, users, and reports from your dashboard.
              </p>
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-700">
                <FiGrid size={14} />
                Go to dashboard
              </Link>
            </>
          ) : user ? (
            <>
              <h3 className="mb-2 font-heading text-lg font-bold">Welcome back, {user.name}</h3>
              <p className="mb-4 text-sm text-dark-500">
                Keep up with what developers on Devquora are writing.
              </p>
              <Link
                to="/activity"
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-700">
                <FiUser size={14} />
                Saved posts &amp; activity
              </Link>
            </>
          ) : (
            <>
              <h3 className="mb-2 font-heading text-lg font-bold">Welcome to Devquora</h3>
              <p className="mb-4 text-sm text-dark-500">
                A minimal, developer-focused blogging platform. Write in Markdown, share code
                that actually looks good, and grow your audience.
              </p>
              <Link
                to="/signup"
                className="block rounded-md bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-700">
                Create your account
              </Link>
            </>
          )}

        {status === 'loading' && (
          <>
            <div className="mt-8 border-t border-dark-200 pt-4 dark:border-dark-700">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-dark-400">
                <FiHash size={13} className="text-primary-500" />
                Trending topics
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="skeleton h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-dark-200 pt-4 dark:border-dark-700">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-dark-400">
                <FiTrendingUp size={13} className="text-primary-500" />
                Popular posts
              </div>
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <span className="skeleton block h-4 w-full rounded" />
                    <span className="skeleton mt-1.5 block h-4 w-2/3 rounded" />
                    <span className="skeleton mt-2 block h-3 w-20 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {status === 'ready' && trendingTags.length > 0 && (
          <div className="mt-8 border-t border-dark-200 pt-4 dark:border-dark-700">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-dark-400">
              <FiHash size={13} className="text-primary-500" />
              Trending topics
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendingTags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          </div>
        )}

        {status === 'ready' && popularPosts.length > 0 && (
          <div className="mt-8 border-t border-dark-200 pt-4 dark:border-dark-700">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-dark-400">
              <FiTrendingUp size={13} className="text-primary-500" />
              Popular posts
            </div>
            <div className="flex flex-col gap-4">
              {popularPosts.map((post) => (
                <Link key={post.id} to={`/post/${post.slug}`} className="group block">
                  <h4 className="line-clamp-2 text-sm font-semibold text-dark-700 transition-colors group-hover:text-primary-600 dark:text-dark-300">
                    {post.title}
                  </h4>
                  <span className="mt-1 flex items-center gap-1 text-xs text-dark-400">
                    <FiMessageCircle size={12} />
                    {post.commentsCount ?? 0} comments
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-dark-200 pt-4 dark:border-dark-700">
          <Link
            to="/explore"
            className="flex items-center justify-center gap-1.5 rounded-md border border-dark-200 px-4 py-2 text-center text-sm font-medium text-dark-600 transition-colors hover:bg-surface-muted dark:border-dark-700 dark:text-dark-300">
            Browse all posts
          </Link>
        </div>
        </div>
      </aside>
    </div>
  );
};

export default Home;
