import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiShield, FiEdit3, FiUser, FiSettings } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ProfileLinks from '../components/ProfileLinks';
import PostCard from '../components/PostCard';
import { PostListSkeleton } from '../components/PostCardSkeleton';
import ErrorState from '../components/ErrorState';
import { fetchPosts } from '../api/posts';
import { fetchUserProfile } from '../api/users';
import usePageTitle from '../hooks/usePageTitle';

// Same role -> icon/label mapping as Dashboard.jsx, so a role badge reads
// the same way everywhere it shows up.
const ROLE_META = {
  admin: {
    icon: FiShield,
    label: 'Admin',
    className: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
  },
  author: {
    icon: FiEdit3,
    label: 'Author',
    className: 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300',
  },
  user: {
    icon: FiUser,
    label: 'Reader',
    className: 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300',
  },
};

const Profile = () => {
  const { username } = useParams();
  const { user: signedInUser } = useAuth();
  usePageTitle(`@${username}`);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    // A profile can belong to either a real Devquora account (may have zero
    // posts — e.g. a reader, or an author who hasn't published yet) or a
    // dev.to-imported author (no real User doc, only exists via embedded
    // snapshots on their posts). Fetch both and let whichever resolves
    // decide what's shown — neither one alone can tell "not found" apart
    // from "found, just no posts (yet)".
    Promise.allSettled([
      fetchUserProfile(username),
      fetchPosts({ author: username, limit: 50 }),
    ]).then(([userResult, postsResult]) => {
      if (cancelled) return;
      setUser(userResult.status === 'fulfilled' ? userResult.value : null);
      if (postsResult.status === 'fulfilled') {
        setPosts(postsResult.value.posts);
        setStatus('ready');
      } else {
        setStatus(userResult.status === 'fulfilled' ? 'ready' : 'error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username, retryKey]);

  if (status === 'loading') {
    return (
      <div className="container py-8">
        <div className="skeleton mb-6 h-32 w-full rounded-xl" />
        <PostListSkeleton count={4} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container py-16">
        <ErrorState
          message="Couldn't load this profile."
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </div>
    );
  }

  // Prefer the real account when one exists; fall back to the embedded
  // author snapshot carried on their posts (the only record of a
  // dev.to-imported author, who has no User doc of their own).
  const postAuthor = posts[0]?.author;
  const displayName = user?.name || user?.username || postAuthor?.name;
  const avatarUrl =
    user?.avatarUrl ||
    postAuthor?.avatarUrl ||
    (user ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}` : null);
  const roleMeta = user ? ROLE_META[user.role] : null;
  const RoleIcon = roleMeta?.icon;
  const isOwnProfile = signedInUser?.username === username;

  if (!displayName) {
    return (
      <div className="container py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">User not found</h1>
        <Link to="/" className="text-primary-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-col items-center gap-5 rounded-xl border border-dark-200 bg-surface p-6 text-center shadow-card dark:border-dark-700 sm:flex-row sm:text-left">
        <img
          src={avatarUrl}
          alt={username}
          className="h-24 w-24 shrink-0 rounded-full ring-4 ring-primary-100 dark:ring-primary-950"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-heading text-2xl font-bold text-dark-800 dark:text-dark-100">
              {displayName}
            </h1>
            {roleMeta && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleMeta.className}`}>
                <RoleIcon size={12} />
                {roleMeta.label}
              </span>
            )}
          </div>
          <p className="text-dark-500">@{username}</p>
          {user?.bio && (
            <p className="mt-2 max-w-md text-sm text-dark-600 dark:text-dark-300">{user.bio}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <ProfileLinks
              websiteUrl={user?.websiteUrl}
              githubUrl={user?.githubUrl}
              externalUrl={postAuthor?.externalUrl}
            />
            {/* Looking at your own profile is exactly when you notice the bio
                is empty or the picture is wrong — so the way to fix it is
                here, not only buried in the header menu. */}
            {isOwnProfile && (
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 rounded-md border border-dark-200 px-3 py-1.5 text-sm font-medium text-dark-600 transition-colors hover:bg-surface-muted dark:border-dark-700 dark:text-dark-300">
                <FiSettings size={14} />
                Edit profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* An empty "no posts yet" section is just noise here — authors already
          see their own publishing status on the Dashboard. Only show this
          section when there's actually something to list. */}
      {posts.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-600" />
            <span className="text-sm font-semibold uppercase tracking-widest text-dark-500">
              Posts ({posts.length})
            </span>
            <div className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
          </div>

          <div className="flex flex-col">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;
