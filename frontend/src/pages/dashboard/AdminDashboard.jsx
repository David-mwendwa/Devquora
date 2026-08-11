import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiShield,
  FiUser,
  FiEdit3,
  FiUserX,
  FiUserCheck,
  FiFlag,
  FiEye,
  FiEyeOff,
  FiSend,
  FiTrash2,
  FiAlertTriangle,
  FiRefreshCw,
} from 'react-icons/fi';
import StatCard from '../../components/StatCard';
import Tooltip from '../../components/Tooltip';
import ErrorState from '../../components/ErrorState';
import TrendAreaChart from '../../components/charts/TrendAreaChart';
import useAsyncData from '../../hooks/useAsyncData';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  fetchPlatformStats,
  fetchAllUsers,
  fetchAllPosts,
  updateUser,
  moderatePost,
} from '../../api/admin';
import { deletePost, triggerSync, fetchSyncStatus } from '../../api/posts';
import getErrorMessage from '../../utils/getErrorMessage';

const TABS = ['Overview', 'Users', 'Posts'];

// Role is identity, not state — one color (primary) marks the privileged role,
// everyone else is neutral; the icon carries identity so color isn't load-bearing.
const ROLE_META = {
  admin: {
    icon: FiShield,
    className: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
  },
  author: {
    icon: FiEdit3,
    className: 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300',
  },
  user: {
    icon: FiUser,
    className: 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300',
  },
};

const ACCOUNT_STATUS_STYLES = {
  active: 'bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-300',
  suspended: 'bg-danger-100 text-danger-700 dark:bg-danger-950 dark:text-danger-300',
};

const POST_STATUS_STYLES = {
  published: 'bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-300',
  draft: 'bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300',
};

// Only ticks while a sync is actually running, so this is ~10 requests per sync
// rather than a permanent background drip against the API rate limit.
const SYNC_POLL_MS = 3000;

const ROLE_FILTERS = ['all', 'admin', 'author', 'user'];
const POST_STATUS_FILTERS = ['all', 'published', 'draft', 'flagged'];

const loadAdminDashboard = () =>
  Promise.all([fetchPlatformStats(), fetchAllUsers(), fetchAllPosts()]).then(
    ([platform, users, posts]) => ({ platform, users, posts })
  );

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const confirm = useConfirm();
  const { data, setData, status: loadStatus, error, reload } = useAsyncData(loadAdminDashboard);

  const [tab, setTab] = useState('Overview');
  const [userQuery, setUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userSortDir, setUserSortDir] = useState('desc');
  const [postQuery, setPostQuery] = useState('');
  const [postStatusFilter, setPostStatusFilter] = useState('all');
  const [actionError, setActionError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const wasSyncing = useRef(false);

  const users = useMemo(() => data?.users ?? [], [data]);
  const posts = useMemo(() => data?.posts ?? [], [data]);
  const platform = data?.platform;

  // Moderation touches one row at a time; patching in place keeps the operator's
  // tab, filters and scroll position rather than remounting the whole screen.
  const patchRow = useCallback(
    (collection, id, changes) =>
      setData((prev) => ({
        ...prev,
        [collection]: prev[collection].map((row) => (row.id === id ? { ...row, ...changes } : row)),
      })),
    [setData]
  );

  const runAction = async (fn) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const visibleUsers = useMemo(() => {
    let result = users;
    if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter);
    if (userQuery.trim()) {
      const q = userQuery.trim().toLowerCase();
      result = result.filter(
        (u) => (u.name || u.username).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    const sorted = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return userSortDir === 'asc' ? sorted.reverse() : sorted;
  }, [users, roleFilter, userQuery, userSortDir]);

  const visiblePosts = useMemo(() => {
    let result = posts;
    if (postStatusFilter === 'flagged') result = result.filter((p) => p.flagged);
    else if (postStatusFilter !== 'all')
      result = result.filter((p) => p.status === postStatusFilter);
    if (postQuery.trim()) {
      const q = postQuery.trim().toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => b.views - a.views);
  }, [posts, postStatusFilter, postQuery]);

  // Counted from the loaded rows rather than read off the stats payload, so the
  // callout updates the moment an admin suspends or flags something.
  const flaggedCount = posts.filter((p) => p.flagged).length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  const toggleAccountStatus = (u) =>
    runAction(async () => {
      const next = u.status === 'active' ? 'suspended' : 'active';
      const updated = await updateUser(u.id, { status: next });
      patchRow('users', u.id, { status: updated.status });
    });

  const changeRole = (u, role) =>
    runAction(async () => {
      const updated = await updateUser(u.id, { role });
      patchRow('users', u.id, { role: updated.role });
    });

  const togglePostStatus = (post) =>
    runAction(async () => {
      const next = post.status === 'published' ? 'draft' : 'published';
      const updated = await moderatePost(post.id, { status: next });
      patchRow('posts', post.id, {
        status: updated.status,
        publishedAt: updated.publishedAt,
      });
    });

  const toggleFlag = (post) =>
    runAction(async () => {
      const updated = await moderatePost(post.id, { flagged: !post.flagged });
      patchRow('posts', post.id, { flagged: updated.flagged });
    });

  const removePost = (post) =>
    runAction(async () => {
      const ok = await confirm({
        title: 'Permanently delete this post?',
        message: `"${post.title}" and every comment on it will be removed for all readers. This cannot be undone.`,
        confirmLabel: 'Delete post',
      });
      if (!ok) return;
      await deletePost(post.id);
      setData((prev) => ({
        ...prev,
        posts: prev.posts.filter((p) => p.id !== post.id),
      }));
    });

  // The POST that starts a sync returns immediately, so "in progress" has to come
  // from the server's own flag. Checked once on mount — a sync may already be
  // running, started by the hourly schedule or another admin — and then polled
  // only while one is live.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const running = await fetchSyncStatus();
        if (cancelled) return;
        if (wasSyncing.current && !running) {
          setSyncMessage('Sync finished — imported posts are now included below.');
          reload();
        }
        wasSyncing.current = running;
        setSyncing(running);
      } catch {
        // A failed status check says nothing about the sync itself; leave the
        // button as it is and try again on the next tick.
      }
    };

    check();
    if (!syncing)
      return () => {
        cancelled = true;
      };

    const id = setInterval(check, SYNC_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [syncing, reload]);

  const startSync = () =>
    runAction(async () => {
      setSyncMessage(null);
      await triggerSync();
      // Flip to the running state here rather than waiting for the next poll, so
      // the button responds to the click immediately.
      wasSyncing.current = true;
      setSyncing(true);
    });

  if (loadStatus === 'loading') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-lg" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  if (loadStatus === 'error') {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dark-200 dark:border-dark-700">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
              }`}>
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={startSync}
          disabled={syncing}
          aria-busy={syncing}
          className="mb-1 flex items-center gap-1.5 rounded-md border border-dark-200 px-3 py-1.5 text-xs font-medium text-dark-600 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent dark:border-dark-700 dark:text-dark-300">
          <FiRefreshCw size={13} className={syncing ? 'animate-spin' : undefined} />
          {syncing ? 'Syncing...' : 'Sync dev.to'}
        </button>
      </div>

      {actionError && (
        <div className="mb-4 rounded-md border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950 dark:text-danger-300">
          {actionError}
        </div>
      )}
      {syncing && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300">
          <FiRefreshCw size={14} className="animate-spin" />
          Importing articles from dev.to. This usually takes about half a minute — the list
          refreshes itself when it finishes.
        </div>
      )}
      {!syncing && syncMessage && (
        <div className="mb-4 rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300">
          {syncMessage}
        </div>
      )}

      {tab === 'Overview' && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total users"
              value={platform.stats.totalUsers.toLocaleString()}
              delta={platform.deltas.totalUsers}
            />
            <StatCard
              label="Published posts"
              value={platform.stats.totalPosts.toLocaleString()}
              delta={platform.deltas.totalPosts}
            />
            <StatCard label="Total views" value={platform.stats.totalViews.toLocaleString()} />
            <StatCard
              label="Posts this week"
              value={platform.stats.postsThisWeek}
              delta={{ ...platform.deltas.postsThisWeek, goodDirection: 'up' }}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-dark-200 bg-surface p-5 shadow-card dark:border-dark-700 lg:col-span-2">
              <h2 className="mb-4 font-heading text-sm font-bold text-dark-600 dark:text-dark-300">
                Posts published, last 30 days
              </h2>
              <TrendAreaChart
                data={platform.activitySeries}
                valueKey="value"
                unitLabel="posts published"
              />
            </div>

            <div className="rounded-lg border border-dark-200 bg-surface p-5 shadow-card dark:border-dark-700">
              <div className="mb-3 flex items-center gap-2">
                <FiAlertTriangle className="text-warning-600 dark:text-warning-400" />
                <h2 className="font-heading text-sm font-bold text-dark-600 dark:text-dark-300">
                  Needs attention
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTab('Posts');
                  setPostStatusFilter('flagged');
                }}
                className="mb-2 flex w-full items-center justify-between rounded-md border border-dark-200 px-3 py-2.5 text-left text-sm hover:bg-surface-muted dark:border-dark-700">
                <span className="flex items-center gap-2">
                  <FiFlag className="text-danger-600 dark:text-danger-400" />
                  Flagged posts
                </span>
                <span className="font-semibold tabular-nums">{flaggedCount}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('Users');
                  setRoleFilter('all');
                }}
                className="flex w-full items-center justify-between rounded-md border border-dark-200 px-3 py-2.5 text-left text-sm hover:bg-surface-muted dark:border-dark-700">
                <span className="flex items-center gap-2">
                  <FiUserX className="text-danger-600 dark:text-danger-400" />
                  Suspended accounts
                </span>
                <span className="font-semibold tabular-nums">{suspendedCount}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'Users' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-md border border-dark-200 p-1 dark:border-dark-700">
              {ROLE_FILTERS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`rounded px-3 py-1 text-xs font-medium capitalize transition ${
                    roleFilter === r
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-500 hover:bg-surface-muted'
                  }`}>
                  {r === 'user' ? 'reader' : r}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search name or email..."
                className="w-full rounded-md border border-dark-200 bg-surface-muted py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none dark:border-dark-700"
              />
            </div>
          </div>

          <p className="mb-2 text-sm text-dark-500">
            {visibleUsers.length} {visibleUsers.length === 1 ? 'user' : 'users'}
          </p>

          <div className="overflow-x-auto rounded-lg border border-dark-200 dark:border-dark-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-dark-500">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => setUserSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                      className="flex items-center gap-1 hover:text-dark-700 dark:hover:text-dark-200">
                      Joined
                      {userSortDir === 'desc' ? <FiArrowDown size={12} /> : <FiArrowUp size={12} />}
                    </button>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((u) => {
                  const RoleIcon = ROLE_META[u.role].icon;
                  // The server rejects an admin editing their own account —
                  // mirror that here so the control isn't offered at all.
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-dark-200 transition-colors hover:bg-surface-muted dark:border-dark-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              u.avatarUrl ||
                              `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.username}`
                            }
                            alt={u.username}
                            className="h-7 w-7 rounded-full"
                          />
                          <div>
                            <Link
                              to={`/u/${u.username}`}
                              className="font-medium hover:text-primary-600">
                              {u.name || u.username}
                            </Link>
                            <p className="text-xs text-dark-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs capitalize ${ROLE_META[u.role].className}`}>
                            <RoleIcon size={11} />
                            {u.role === 'user' ? 'reader' : u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value)}
                            aria-label={`Role for ${u.username}`}
                            className="cursor-pointer rounded-md border border-dark-200 bg-surface py-1 pl-2 text-xs capitalize focus:border-primary-500 focus:outline-none dark:border-dark-700">
                            <option value="user">reader</option>
                            <option value="author">author</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs capitalize ${ACCOUNT_STATUS_STYLES[u.status]}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          {!isSelf && (
                            <Tooltip label={u.status === 'active' ? 'Suspend' : 'Reinstate'}>
                              <button
                                type="button"
                                onClick={() => toggleAccountStatus(u)}
                                className={
                                  u.status === 'active'
                                    ? 'text-dark-400 hover:text-danger-600'
                                    : 'text-dark-400 hover:text-success-600'
                                }>
                                {u.status === 'active' ? (
                                  <FiUserX size={16} />
                                ) : (
                                  <FiUserCheck size={16} />
                                )}
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-dark-400">
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Posts' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-md border border-dark-200 p-1 dark:border-dark-700">
              {POST_STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPostStatusFilter(s)}
                  className={`rounded px-3 py-1 text-xs font-medium capitalize transition ${
                    postStatusFilter === s
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-500 hover:bg-surface-muted'
                  }`}>
                  {s === 'draft' ? 'drafts' : s}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="search"
                value={postQuery}
                onChange={(e) => setPostQuery(e.target.value)}
                placeholder="Search posts..."
                className="w-full rounded-md border border-dark-200 bg-surface-muted py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none dark:border-dark-700"
              />
            </div>
          </div>

          <p className="mb-2 text-sm text-dark-500">
            {visiblePosts.length} {visiblePosts.length === 1 ? 'post' : 'posts'}
          </p>

          <div className="overflow-x-auto rounded-lg border border-dark-200 dark:border-dark-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-dark-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Views</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visiblePosts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-t border-dark-200 transition-colors hover:bg-surface-muted dark:border-dark-700">
                    <td className="px-4 py-3 font-medium">
                      {post.status === 'draft' ? (
                        <span>{post.title}</span>
                      ) : (
                        <Link to={`/post/${post.slug}`} className="hover:text-primary-600">
                          {post.title}
                        </Link>
                      )}
                      {post.flagged && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-danger-100 px-2 py-0.5 text-xs text-danger-700 dark:bg-danger-950 dark:text-danger-300">
                          <FiFlag size={10} />
                          Flagged
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/u/${post.author.username}`} className="hover:text-primary-600">
                        {post.author.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs capitalize ${POST_STATUS_STYLES[post.status]}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{post.views.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3 text-dark-400">
                        {post.status !== 'draft' && (
                          <Tooltip label="View post">
                            <Link to={`/post/${post.slug}`} className="hover:text-primary-600">
                              <FiEye size={16} />
                            </Link>
                          </Tooltip>
                        )}
                        <Tooltip label={post.flagged ? 'Clear flag' : 'Flag for review'}>
                          <button
                            type="button"
                            onClick={() => toggleFlag(post)}
                            className={post.flagged ? 'text-danger-500' : 'hover:text-danger-600'}>
                            <FiFlag size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip label={post.status === 'published' ? 'Unpublish' : 'Publish'}>
                          <button
                            type="button"
                            onClick={() => togglePostStatus(post)}
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
                      No posts match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default AdminDashboard;
