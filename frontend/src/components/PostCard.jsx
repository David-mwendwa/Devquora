import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FiMessageCircle } from 'react-icons/fi';

const PostCard = ({ post }) => {
  const [coverFailed, setCoverFailed] = useState(false);

  return (
  <article className="group flex flex-col overflow-hidden rounded-xl border border-dark-200 bg-surface transition-shadow hover:shadow-card dark:border-dark-700">
    <Link to={`/post/${post.slug}`} className="block aspect-[16/9] w-full shrink-0 overflow-hidden bg-surface-muted">
      {post.coverImageUrl && !coverFailed ? (
        <img
          src={post.coverImageUrl}
          alt=""
          onError={() => setCoverFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-300 dark:from-primary-950 dark:to-primary-800">
          <span className="font-heading text-3xl font-bold text-primary-700/70 dark:text-primary-200/70">
            {post.title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </Link>

    <div className="flex flex-1 flex-col p-4">
      {post.tags?.[0] && (
        <Link
          to={`/explore?tag=${encodeURIComponent(post.tags[0])}`}
          className="mb-2 inline-block w-fit rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-950 dark:text-primary-300">
          #{post.tags[0]}
        </Link>
      )}

      <Link to={`/post/${post.slug}`} className="block min-w-0">
        <h2 className="line-clamp-2 font-heading text-lg font-bold text-dark-800 transition-colors group-hover:text-primary-600 dark:text-dark-200">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-dark-500">{post.excerpt}</p>
      </Link>

      <div className="mt-4 flex items-center gap-2 border-t border-dark-200 pt-3 text-xs text-dark-400 dark:border-dark-700">
        <img
          src={post.author.avatarUrl}
          alt={post.author.username}
          className="h-5 w-5 shrink-0 rounded-full"
        />
        <Link
          to={`/u/${post.author.username}`}
          className="min-w-0 truncate hover:text-dark-800 dark:hover:text-dark-200">
          {post.author.name}
        </Link>
        <span className="shrink-0">&middot; {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <FiMessageCircle size={12} />
          {post.commentsCount ?? 0}
        </span>
      </div>
    </div>
  </article>
  );
};

export default PostCard;
