import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FiMessageCircle } from 'react-icons/fi';

const PostCard = ({ post }) => (
  <article className="border-b border-dark-200 py-5 transition-colors dark:border-dark-700">
    <div className="mb-2 flex min-w-0 items-center gap-2 text-sm text-dark-500">
      <img
        src={post.author.avatarUrl}
        alt={post.author.username}
        className="h-5 w-5 shrink-0 rounded-full"
      />
      <Link
        to={`/u/${post.author.username}`}
        className="truncate transition-colors hover:text-dark-800 dark:hover:text-dark-200">
        {post.author.name}
      </Link>
      <span aria-hidden="true" className="text-dark-300 dark:text-dark-600">
        &middot;
      </span>
      <span className="shrink-0">
        {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })} &middot;{' '}
        {post.readTimeMin} min read
      </span>
    </div>

    <Link to={`/post/${post.slug}`} className="block min-w-0">
      <h2 className="font-heading text-lg font-bold text-dark-800 transition-colors hover:text-primary-600 dark:text-dark-200 sm:text-xl">
        {post.title}
      </h2>
      <p className="mt-2 line-clamp-2 text-sm text-dark-500">{post.excerpt}</p>
    </Link>

    <div className="mt-3 flex items-center gap-1">
      <Link
        to={`/post/${post.slug}#comments`}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-dark-500 transition-colors hover:bg-surface-muted hover:text-dark-800 dark:hover:text-dark-200">
        <FiMessageCircle className="text-base" />
        {post.commentsCount ?? 0}
      </Link>
    </div>
  </article>
);

export default PostCard;
