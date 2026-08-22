import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FiMessageCircle, FiZap } from 'react-icons/fi';

// The single most-read post from the current page of results, spotlighted
// dev.to/Hashnode-style above the feed grid instead of buried in a plain
// list — the cover image data (backfilled by devtoSync) was already there,
// just never shown anywhere on Home.
const FeaturedPost = ({ post }) => {
  const [coverFailed, setCoverFailed] = useState(false);

  return (
  <Link
    to={`/post/${post.slug}`}
    className="group mb-8 grid grid-cols-1 overflow-hidden rounded-2xl border border-dark-200 bg-surface shadow-card transition-shadow hover:shadow-card-hover dark:border-dark-700 sm:grid-cols-2">
    <div className="aspect-[16/9] w-full overflow-hidden bg-surface-muted sm:aspect-auto">
      {post.coverImageUrl && !coverFailed ? (
        <img
          src={post.coverImageUrl}
          alt=""
          onError={() => setCoverFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-300 dark:from-primary-950 dark:to-primary-800">
          <span className="font-heading text-5xl font-bold text-primary-700/70 dark:text-primary-200/70">
            {post.title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>

    <div className="flex flex-col justify-center p-6 sm:p-8">
      <span className="mb-3 flex w-fit items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-700 dark:bg-primary-950 dark:text-primary-300">
        <FiZap size={12} />
        Most read
      </span>

      <h2 className="line-clamp-3 font-heading text-2xl font-bold text-dark-800 transition-colors group-hover:text-primary-600 dark:text-dark-200 sm:text-3xl">
        {post.title}
      </h2>
      <p className="mt-3 line-clamp-2 text-sm text-dark-500 sm:text-base">{post.excerpt}</p>

      <div className="mt-5 flex items-center gap-2 text-sm text-dark-400">
        <img
          src={post.author.avatarUrl}
          alt={post.author.username}
          className="h-6 w-6 shrink-0 rounded-full"
        />
        <span className="truncate text-dark-600 dark:text-dark-300">{post.author.name}</span>
        <span aria-hidden="true">&middot;</span>
        <span className="shrink-0">
          {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <FiMessageCircle size={13} />
          {post.commentsCount ?? 0}
        </span>
      </div>
    </div>
  </Link>
  );
};

export default FeaturedPost;
