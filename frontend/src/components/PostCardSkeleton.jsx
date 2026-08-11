const PostCardSkeleton = () => (
  <article className="border-b border-dark-200 py-5 dark:border-dark-700">
    <div className="mb-2 flex items-center gap-2">
      <div className="skeleton h-5 w-5 shrink-0 rounded-full" />
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton h-3 w-32 rounded" />
    </div>

    <div className="skeleton h-5 w-3/4 rounded sm:h-6" />
    <div className="mt-3 space-y-2">
      <div className="skeleton h-3.5 w-full rounded" />
      <div className="skeleton h-3.5 w-2/3 rounded" />
    </div>

    <div className="skeleton mt-4 h-6 w-16 rounded-full" />
  </article>
);

export const PostListSkeleton = ({ count = 5 }) => (
  <div className="flex flex-col">
    {Array.from({ length: count }).map((_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
);

export default PostCardSkeleton;
