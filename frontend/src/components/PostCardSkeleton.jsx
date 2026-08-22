const PostCardSkeleton = () => (
  <article className="flex flex-col overflow-hidden rounded-xl border border-dark-200 dark:border-dark-700">
    <div className="skeleton aspect-[16/9] w-full" />
    <div className="flex flex-col p-4">
      <div className="skeleton mb-3 h-5 w-16 rounded-full" />
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3.5 w-2/3 rounded" />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-dark-200 pt-3 dark:border-dark-700">
        <div className="skeleton h-5 w-5 shrink-0 rounded-full" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
    </div>
  </article>
);

export const PostListSkeleton = ({ count = 5 }) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
    {Array.from({ length: count }).map((_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
);

export default PostCardSkeleton;
