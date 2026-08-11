import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FiEye,
  FiEdit2,
  FiEdit3,
  FiTrash2,
  FiSend,
  FiEyeOff,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
} from 'react-icons/fi';
import StatCard from '../../components/StatCard';
import Tooltip from '../../components/Tooltip';
import ErrorState from '../../components/ErrorState';
import TrendAreaChart from '../../components/charts/TrendAreaChart';
import useAsyncData from '../../hooks/useAsyncData';
import { useConfirm } from '../../context/ConfirmContext';
import { fetchMyPosts, fetchMyStats, updatePost, deletePost } from '../../api/posts';
import getErrorMessage from '../../utils/getErrorMessage';

const STATUS_STYLES = {
  published: 'bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-300',
  draft: 'bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300',
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
];

const SORTS = {
  date: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  views: (a, b) => b.views - a.views,
};

const loadAuthorDashboard = () =>
  Promise.all([fetchMyPosts(), fetchMyStats()]).then(([posts, analytics]) => ({
    posts,
    analytics,
  }));

const AuthorDashboard = () => {
  const confirm = useConfirm();
  const { data, setData, status: loadStatus, error, reload } = useAsyncData(loadAuthorDashboard);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [actionError, setActionError] = useState(null);

  const posts = useMemo(() => data?.posts ?? [], [data]);
  const analytics = data?.analytics;

  // An action changes one row; refetching the whole dashboard for that would
  // throw away the table's scroll position and filters, so patch in place.
  const patchPost = useCallback(
    (id, changes) =>
      setData((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p.id === id ? { ...p, ...changes } : p)),
      })),
    [setData]
  );

  const topPost = useMemo(
    () => posts.filter((p) => p.status !== 'draft').sort(SORTS.views)[0],
    [posts]
  );

  const visiblePosts = useMemo(() => {
    let result = posts;
    if (statusFilter !== 'all') result = result.filter((p) => p.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }
    const sorted = [...result].sort(SORTS[sortKey]);
    return sortDir === 'asc' ? sorted.reverse() : sorted;
  }, [posts, statusFilter, query, sortKey, sortDir]);

  // The sparkline is a de-emphasised trailing trend, not the full chart below —
  // the last 12 days of the same series the area chart plots.
  const viewsSparkline = useMemo(
    () => (analytics ? analytics.viewsSeries.slice(-12).map((d) => d.views) : null),
    [analytics]
  );

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const togglePublish = async (post) => {
    const next = post.status === 'published' ? 'draft' : 'published';
    setActionError(null);
    try {
      const updated = await updatePost(post.id, { status: next });
      patchPost(post.id, { status: updated.status, publishedAt: updated.publishedAt });
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const removePost = async (post) => {
    const ok = await confirm({
      title: 'Delete this post?',
      message: `"${post.title}" and its comments will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete post',
    });
    if (!ok) return;
    setActionError(null);
    try {
      await deletePost(post.id);
      setData((prev) => ({ ...prev, posts: prev.posts.filter((p) => p.id !== post.id) }));
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const SortHeader = ({ label, sortKeyName }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKeyName)}
      className="flex items-center gap-1 hover:text-dark-700 dark:hover:text-dark-200">
      {label}
      {sortKey === sortKeyName &&
        (sortDir === 'desc' ? <FiArrowDown size={12} /> : <FiArrowUp size={12} />)}
    </button>
  );

  if (loadStatus === 'loading') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-lg" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-lg" />
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  if (loadStatus === 'error') {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <>
      {actionError && (
        <div className="mb-4 rounded-md border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950 dark:text-danger-300">
          {actionError}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Published posts" value={analytics.stats.totalPosts} />
        <StatCard label="Drafts" value={analytics.stats.drafts} />
        <StatCard
          label="Total views"
          value={analytics.stats.totalViews.toLocaleString()}
          delta={analytics.deltas.totalViews}
          trend={viewsSparkline}
        />
        <StatCard label="Avg read time" value={`${analytics.stats.avgReadTime} min`} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-dark-200 bg-surface p-5 shadow-card dark:border-dark-700 lg:col-span-2">
          <h2 className="mb-4 font-heading text-sm font-bold text-dark-600 dark:text-dark-300">
            Views, last 30 days
          </h2>
          <TrendAreaChart data={analytics.viewsSeries} valueKey="views" unitLabel="views" />
        </div>

        {topPost && (
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-5 dark:border-primary-800 dark:bg-primary-950">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
              Top performing post
            </p>
            <Link
              to={`/post/${topPost.slug}`}
              className="mb-3 block font-heading text-lg font-bold leading-snug text-primary-900 hover:underline dark:text-primary-100">
              {topPost.title}
            </Link>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-primary-600 dark:text-primary-400">Views</dt>
                <dd className="font-semibold tabular-nums text-primary-900 dark:text-primary-100">
                  {topPost.views.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-primary-600 dark:text-primary-400">Read time</dt>
                <dd className="font-semibold tabular-nums text-primary-900 dark:text-primary-100">
                  {topPost.readTimeMin} min
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary-600" />
          <span className="text-sm font-semibold uppercase tracking-widest text-dark-500">
            Your posts
          </span>
        </div>
        <Link
          to="/post/new"
          className="flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <FiEdit3 size={14} />
          New post
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-dark-200 p-1 dark:border-dark-700">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'text-dark-500 hover:bg-surface-muted'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your posts..."
            className="w-full rounded-md border border-dark-200 bg-surface-muted py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none dark:border-dark-700"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-dark-200 dark:border-dark-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-dark-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <SortHeader label="Views" sortKeyName="views" />
              </th>
              <th className="px-4 py-3 font-medium">
                <SortHeader label="Date" sortKeyName="date" />
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visiblePosts.map((post) => (
              <tr
                key={post.id}
                className="border-t border-dark-200 transition-colors hover:bg-surface-muted dark:border-dark-700">
                <td className="px-4 py-3 font-medium">
                  {/* A draft has no public page — its title links to the editor
                      instead of a URL that would 404. */}
                  {post.status === 'draft' ? (
                    <Link to={`/post/${post.id}/edit`} className="hover:text-primary-600">
                      {post.title}
                    </Link>
                  ) : (
                    <Link to={`/post/${post.slug}`} className="hover:text-primary-600">
                      {post.title}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[post.status]}`}>
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{post.views.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums">
                  {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3 text-dark-400">
                    {post.status !== 'draft' && (
                      <Tooltip label="View post">
                        <Link to={`/post/${post.slug}`} className="hover:text-primary-600">
                          <FiEye size={16} />
                        </Link>
                      </Tooltip>
                    )}
                    <Tooltip label="Edit post">
                      <Link to={`/post/${post.id}/edit`} className="hover:text-primary-600">
                        <FiEdit2 size={16} />
                      </Link>
                    </Tooltip>
                    <Tooltip label={post.status === 'published' ? 'Unpublish' : 'Publish'}>
                      <button
                        type="button"
                        onClick={() => togglePublish(post)}
                        className="hover:text-primary-600">
                        {post.status === 'published' ? (
                          <FiEyeOff size={16} />
                        ) : (
                          <FiSend size={16} />
                        )}
                      </button>
                    </Tooltip>
                    <Tooltip label="Delete post">
                      <button
                        type="button"
                        onClick={() => removePost(post)}
                        className="hover:text-danger-600">
                        <FiTrash2 size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}

            {visiblePosts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-dark-400">
                  {query || statusFilter !== 'all'
                    ? 'No posts match your filters.'
                    : "You haven't written anything yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AuthorDashboard;
