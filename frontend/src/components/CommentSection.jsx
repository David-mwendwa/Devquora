import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FiSend, FiHeart, FiCornerDownRight, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { postComment, toggleCommentLike, deleteComment } from '../api/posts';

const CommentSection = ({ slug, initialComments, loading = false }) => {
  const confirm = useConfirm();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // initialComments arrives async (fetched by the parent after the post
  // itself loads), so seed once it actually shows up rather than only on mount.
  useEffect(() => setComments(initialComments), [initialComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      const comment = await postComment(slug, draft.trim());
      setComments((c) => [...c, comment]);
      setDraft('');
    } catch {
      // Keep the draft in the textarea so the user doesn't lose what they wrote.
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId) => {
    if (!replyDraft.trim() || !user || replySubmitting) return;
    setReplySubmitting(true);
    try {
      const comment = await postComment(slug, replyDraft.trim(), parentId);
      setComments((c) => [...c, comment]);
      setReplyDraft('');
      setReplyingTo(null);
    } catch {
      // Keep the draft so the reply isn't lost on a failed request.
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleToggleLike = async (comment) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const wasLiked = comment.likes?.includes(user.id);
    // Optimistic update — reverted below if the request fails.
    setComments((cs) =>
      cs.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              likes: wasLiked
                ? c.likes.filter((id) => id !== user.id)
                : [...(c.likes ?? []), user.id],
            }
          : c
      )
    );
    try {
      await toggleCommentLike(comment.id);
    } catch {
      setComments((cs) =>
        cs.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                likes: wasLiked
                  ? [...(c.likes ?? []), user.id]
                  : c.likes.filter((id) => id !== user.id),
              }
            : c
        )
      );
    }
  };

  const handleDelete = async (comment) => {
    const ok = await confirm({
      title: 'Delete this comment?',
      message:
        'The comment and any replies to it will be removed for everyone. This cannot be undone.',
      confirmLabel: 'Delete comment',
    });
    if (!ok) return;
    const previous = comments;
    // Deleting a top-level comment takes its replies with it (server does the
    // same cascade) — strip both locally so the optimistic update matches.
    setComments((cs) => cs.filter((c) => c.id !== comment.id && c.parentComment !== comment.id));
    try {
      await deleteComment(comment.id);
    } catch {
      setComments(previous);
    }
  };

  const topLevelComments = comments.filter((c) => !c.parentComment);
  const repliesByParent = comments.reduce((acc, c) => {
    if (!c.parentComment) return acc;
    (acc[c.parentComment] ??= []).push(c);
    return acc;
  }, {});

  const renderComment = (c, { isReply = false } = {}) => {
    const liked = user && c.likes?.includes(user.id);
    return (
      <li key={c.id} className={isReply ? 'flex gap-3 pt-4' : 'flex gap-3 py-5 first:pt-0'}>
        <img
          src={
            c.author?.avatarUrl ||
            `https://api.dicebear.com/9.x/avataaars/svg?seed=${c.author?.username || 'deleted'}`
          }
          alt={c.author?.username || 'deleted user'}
          className={isReply ? 'h-7 w-7 shrink-0 rounded-full' : 'h-9 w-9 shrink-0 rounded-full'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-dark-800 dark:text-dark-200">
              {c.author?.name || 'Deleted user'}
            </span>
            <span className="text-dark-400">&middot;</span>
            <span className="text-dark-400">
              {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-1 text-sm text-dark-600 dark:text-dark-300">{c.body}</p>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggleLike(c)}
              aria-pressed={!!liked}
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                liked
                  ? 'text-red-500'
                  : 'text-dark-500 hover:bg-surface-muted hover:text-dark-800 dark:hover:text-dark-200'
              }`}>
              <FiHeart size={13} className={liked ? 'fill-current' : ''} />
              {c.likes?.length > 0 ? c.likes.length : 'Like'}
            </button>

            {!isReply && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  setReplyingTo(replyingTo === c.id ? null : c.id);
                  setReplyDraft('');
                }}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-dark-500 transition-colors hover:bg-surface-muted hover:text-dark-800 dark:hover:text-dark-200">
                <FiCornerDownRight size={13} />
                Reply
              </button>
            )}

            {user && c.authorUser === user.id && (
              <button
                type="button"
                onClick={() => handleDelete(c)}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-dark-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400">
                <FiTrash2 size={13} />
                Delete
              </button>
            )}
          </div>

          {!isReply && replyingTo === c.id && (
            <div className="mt-3 flex gap-2">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={`Reply to ${c.author?.name || 'this comment'}...`}
                rows={2}
                autoFocus
                className="w-full resize-none rounded-lg border border-dark-200 bg-surface px-3 py-2 text-sm text-dark-800 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-700 dark:text-dark-200"
              />
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleReplySubmit(c.id)}
                  disabled={!replyDraft.trim() || replySubmitting}
                  className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {replySubmitting ? '...' : 'Post'}
                </button>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="rounded-lg border border-dark-200 px-3 py-2 text-xs font-medium text-dark-600 hover:bg-surface-muted dark:border-dark-700 dark:text-dark-300">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!isReply && repliesByParent[c.id]?.length > 0 && (
            <ul className="mt-1 flex flex-col divide-y divide-dark-200 border-l border-dark-200 pl-4 dark:divide-dark-700 dark:border-dark-700">
              {repliesByParent[c.id].map((reply) => renderComment(reply, { isReply: true }))}
            </ul>
          )}
        </div>
      </li>
    );
  };

  return (
    <section id="comments" className="mt-10 scroll-mt-20">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary-600" />
          {loading ? (
            <span className="skeleton inline-block h-4 w-24 rounded" />
          ) : (
            <span className="text-sm font-semibold uppercase tracking-widest text-dark-500">
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </span>
          )}
        </div>
        <div className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 flex gap-3">
          <img
            src={
              user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`
            }
            alt={user.username}
            className="h-9 w-9 shrink-0 rounded-full"
          />
          <div className="flex-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add to the discussion..."
              rows={3}
              className="w-full resize-none rounded-lg border border-dark-200 bg-surface px-4 py-2.5 text-sm text-dark-800 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-700 dark:text-dark-200"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={!draft.trim() || submitting}
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
                <FiSend size={14} />
                {submitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-lg border border-dashed border-dark-200 px-4 py-5 text-center text-sm text-dark-500 dark:border-dark-700">
          <Link to="/login" className="font-medium text-primary-600 hover:underline">
            Log in
          </Link>{' '}
          to join the discussion.
        </div>
      )}

      {loading ? (
        <ul className="flex flex-col divide-y divide-dark-200 dark:divide-dark-700">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex gap-3 py-5 first:pt-0">
              <span className="skeleton h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <span className="skeleton block h-3.5 w-32 rounded" />
                <span className="skeleton block h-3.5 w-full rounded" />
                <span className="skeleton block h-3.5 w-2/3 rounded" />
              </div>
            </li>
          ))}
        </ul>
      ) : comments.length === 0 ? (
        <p className="text-sm text-dark-500">No comments yet. Be the first to say something.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-dark-200 dark:divide-dark-700">
          {topLevelComments.map((c) => renderComment(c))}
        </ul>
      )}
    </section>
  );
};

export default CommentSection;
