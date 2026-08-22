import StatCard from '../components/StatCard';
import PostCard from '../components/PostCard';
import ErrorState from '../components/ErrorState';
import { PostListSkeleton } from '../components/PostCardSkeleton';
import usePageTitle from '../hooks/usePageTitle';
import useAsyncData from '../hooks/useAsyncData';
import { fetchSavedPosts, fetchReadingStats } from '../api/posts';

// Every role can save/like/comment, not just readers — this used to live on a
// reader-only dashboard, but that dashboard had nothing else in it and its one
// other feature (a "become an author" CTA) linked to a page readers are
// blocked from. It's its own route, not a section on /account, so it has room
// to grow (pagination, filters) without crowding the identity/password forms.
const loadActivity = () =>
  Promise.all([fetchSavedPosts(), fetchReadingStats()]).then(([savedPosts, stats]) => ({
    savedPosts,
    stats,
  }));

const Activity = () => {
  usePageTitle('Activity');
  const { data, status, error, reload } = useAsyncData(loadActivity);

  return (
    <div className="container py-8">
      <h1 className="mb-1 font-heading text-2xl font-bold text-dark-800 dark:text-dark-100">
        Activity
      </h1>
      <p className="mb-6 text-sm text-dark-500">Posts you've saved, liked, and commented on.</p>

      {status === 'loading' && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
          <PostListSkeleton count={2} />
        </>
      )}

      {status === 'error' && <ErrorState message={error} onRetry={reload} />}

      {status === 'ready' && (
        <>
          {/* Nothing records who read what, so there's no honest "posts read"
              number to show — these three are what the app actually tracks. */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Saved posts" value={data.stats.savedPosts} />
            <StatCard label="Liked posts" value={data.stats.likedPosts} />
            <StatCard label="Comments written" value={data.stats.commentsWritten} />
          </div>

          <div className="mb-2 flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-600" />
              <span className="text-sm font-semibold uppercase tracking-widest text-dark-500">
                Saved posts
              </span>
            </div>
            <div className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
          </div>
          {data.savedPosts.length === 0 ? (
            <p className="py-6 text-dark-500">
              No saved posts yet — hit the bookmark on any post to keep it here.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {data.savedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Activity;
