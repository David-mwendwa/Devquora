import { StatusCodes } from 'http-status-codes';
import slugify from 'slugify';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../errors/customErrors.js';
import { syncDevToPosts, isSyncInProgress } from '../services/devtoSync.js';
import { todayKey, buildViewsSeries, sumSeries, percentDelta } from '../utils/analytics.js';

const WORDS_PER_MINUTE = 200;

// Repeated query params (?tag=a&tag=b) parse as arrays via qs/Express — only
// ever want a single value for these filters.
const firstIfArray = (v) => (Array.isArray(v) ? v[0] : v);

// Plain slugify(title) collides constantly for common titles — suffix with a
// short counter until it's unique, same idea as devtoSync's externalId suffix
// but for in-app posts, which have no external id to lean on instead.
const generateUniqueSlug = async (title) => {
  const base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let suffix = 1;
  while (await Post.exists({ slug })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
};

export const getPosts = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const tag = firstIfArray(req.query.tag);
  const author = firstIfArray(req.query.author);

  // $ne rather than an equality check on 'published': posts that predate the
  // status field have no value at all, and those are all published imports.
  const filter = { status: { $ne: 'draft' } };
  if (tag) filter.tags = tag;
  if (author) filter['author.username'] = author;

  // List views (PostCard) never render the full body — only the detail page
  // (getPostBySlug) does. Excluding it here keeps list payloads small; without
  // this, fetching 20+ full dev.to markdown bodies was slow enough to make
  // Home/Explore feel like they'd hung.
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .select('-content')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Post.countDocuments(filter),
  ]);

  res.status(StatusCodes.OK).json({ success: true, posts, total, page, limit });
};

export const createPost = async (req, res) => {
  const { title, excerpt, content, coverImageUrl, tags, status } = req.body;
  if (!title || !title.trim()) throw new BadRequestError('Title is required');
  if (!content || !content.trim()) throw new BadRequestError('Content is required');

  // req.user is just the JWT payload ({id, username, role}) — no name/avatarUrl
  // to snapshot onto the post, so look the real profile up (same as createComment).
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('User not found');

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  const slug = await generateUniqueSlug(title);

  const post = await Post.create({
    title: title.trim(),
    slug,
    excerpt: excerpt?.trim(),
    content,
    coverImageUrl: coverImageUrl?.trim() || undefined,
    author: { name: user.name || user.username, username: user.username, avatarUrl: user.avatarUrl },
    authorUser: user._id,
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : [],
    readTimeMin,
    status: status === 'draft' ? 'draft' : 'published',
    source: { provider: 'inkengine' },
  });

  res.status(StatusCodes.CREATED).json({ success: true, post });
};

// Owner or admin — the same rule gates updating, deleting and edit-loading a
// post, so it lives in one place. The admin bypass excludes the seeded demo
// admin (see User.isDemo): anyone can sign in as it, so it can't be allowed to
// edit, delete or reveal drafts of content it doesn't own — only a real admin
// account can.
const assertCanManage = (post, user) => {
  const isOwner = post.authorUser && post.authorUser.toString() === user.id;
  const isRealAdmin = user.role === 'admin' && !user.isDemo;
  if (!isOwner && !isRealAdmin) {
    throw new ForbiddenError('You can only manage your own posts');
  }
};

export const updatePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new NotFoundError('Post not found');
  assertCanManage(post, req.user);

  const { title, excerpt, content, coverImageUrl, tags, status } = req.body;

  if (title !== undefined) {
    if (!title.trim()) throw new BadRequestError('Title is required');
    post.title = title.trim();
  }
  if (content !== undefined) {
    if (!content.trim()) throw new BadRequestError('Content is required');
    post.content = content;
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    post.readTimeMin = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  }
  if (excerpt !== undefined) post.excerpt = excerpt.trim();
  if (coverImageUrl !== undefined) post.coverImageUrl = coverImageUrl.trim() || undefined;
  if (Array.isArray(tags)) post.tags = tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  if (status === 'draft' || status === 'published') {
    // A draft that goes public for the first time dates from that moment, not
    // from when it was first typed — otherwise it appears mid-feed on publish.
    if (status === 'published' && post.status === 'draft') post.publishedAt = new Date();
    post.status = status;
  }

  // The slug is deliberately NOT regenerated on a title change: it's the post's
  // public URL, and silently moving it would break every existing link to it.
  await post.save();
  res.status(StatusCodes.OK).json({ success: true, post });
};

export const deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new NotFoundError('Post not found');
  assertCanManage(post, req.user);

  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();

  res.status(StatusCodes.OK).json({ success: true, deletedId: post._id });
};

// Everything the author wrote, drafts included — the dashboard is the one place
// a draft is visible, so this can't reuse the draft-filtered public list.
export const getMyPosts = async (req, res) => {
  const posts = await Post.find({ authorUser: req.user.id })
    .select('-content -dailyViews')
    .sort({ publishedAt: -1 });
  res.status(StatusCodes.OK).json({ success: true, posts });
};

export const getSavedPosts = async (req, res) => {
  const posts = await Post.find({ savedBy: req.user.id, status: { $ne: 'draft' } })
    .select('-content -dailyViews')
    .sort({ publishedAt: -1 });
  res.status(StatusCodes.OK).json({ success: true, posts });
};

// Loading a post into the editor by id (not slug) — drafts included, and gated
// by the same owner/admin rule as saving it back.
// A reader's own activity. "Posts read" isn't tracked anywhere — nothing
// records who viewed what — so the tiles report what the app actually knows:
// what they saved, liked, and wrote.
export const getReadingStats = async (req, res) => {
  const [savedPosts, likedPosts, commentsWritten] = await Promise.all([
    Post.countDocuments({ savedBy: req.user.id }),
    Post.countDocuments({ likes: req.user.id }),
    Comment.countDocuments({ authorUser: req.user.id }),
  ]);
  res.status(StatusCodes.OK).json({ success: true, stats: { savedPosts, likedPosts, commentsWritten } });
};

export const getPostForEdit = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new NotFoundError('Post not found');
  assertCanManage(post, req.user);
  res.status(StatusCodes.OK).json({ success: true, post });
};

export const getMyStats = async (req, res) => {
  // Small result set (one author's posts), and dailyViews is a Map — summing in
  // JS is clearer here than an aggregation with $objectToArray.
  const posts = await Post.find({ authorUser: req.user.id }).select(
    'status views readTimeMin dailyViews'
  );

  const published = posts.filter((p) => p.status !== 'draft');
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const avgReadTime = published.length
    ? Math.round(published.reduce((sum, p) => sum + (p.readTimeMin || 0), 0) / published.length)
    : 0;

  const viewsSeries = buildViewsSeries(posts, 30);
  const priorSeries = buildViewsSeries(posts, 60).slice(0, 30);

  res.status(StatusCodes.OK).json({
    success: true,
    stats: {
      totalPosts: published.length,
      drafts: posts.length - published.length,
      totalViews,
      avgReadTime,
    },
    viewsSeries,
    deltas: {
      totalViews: percentDelta(sumSeries(viewsSeries), sumSeries(priorSeries)),
    },
  });
};

export const getPostTags = async (req, res) => {
  const tags = await Post.distinct('tags', { status: { $ne: 'draft' } });
  res.status(StatusCodes.OK).json({ success: true, tags: tags.sort() });
};

export const getPostBySlug = async (req, res) => {
  // $inc here (rather than a separate read + write) so concurrent requests
  // for the same post can't lose an increment to a race. dailyViews buckets the
  // same hit by UTC day, which is what the dashboard trend charts read.
  const post = await Post.findOneAndUpdate(
    { slug: req.params.slug, status: { $ne: 'draft' } },
    { $inc: { views: 1, [`dailyViews.${todayKey()}`]: 1 } },
    { new: true }
  );
  if (!post) throw new NotFoundError('Post not found');
  res.status(StatusCodes.OK).json({ success: true, post });
};

export const togglePostLike = async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) throw new NotFoundError('Post not found');

  const userId = req.user.id;
  const alreadyLiked = post.likes.some((id) => id.toString() === userId);
  if (alreadyLiked) {
    post.likes = post.likes.filter((id) => id.toString() !== userId);
  } else {
    post.likes.push(userId);
  }
  await post.save();

  res.status(StatusCodes.OK).json({ success: true, post });
};

export const togglePostSave = async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) throw new NotFoundError('Post not found');

  const userId = req.user.id;
  const alreadySaved = post.savedBy.some((id) => id.toString() === userId);
  if (alreadySaved) {
    post.savedBy = post.savedBy.filter((id) => id.toString() !== userId);
  } else {
    post.savedBy.push(userId);
  }
  await post.save();

  res.status(StatusCodes.OK).json({ success: true, post });
};

export const getRelatedPosts = async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) throw new NotFoundError('Post not found');

  const related = await Post.find({
    _id: { $ne: post._id },
    tags: { $in: post.tags },
    status: { $ne: 'draft' },
  })
    .select('-content')
    .sort({ publishedAt: -1 })
    .limit(3);

  res.status(StatusCodes.OK).json({ success: true, posts: related });
};

export const getPostComments = async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) throw new NotFoundError('Post not found');

  const comments = await Comment.find({ post: post._id }).sort({ createdAt: 1 });
  res.status(StatusCodes.OK).json({ success: true, comments });
};

export const createComment = async (req, res) => {
  const { body, parentComment } = req.body;
  if (!body || !body.trim()) throw new BadRequestError('Comment body is required');

  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) throw new NotFoundError('Post not found');

  // Replies only go one level deep — a reply's parent must itself be a
  // top-level comment on this same post, never another reply.
  if (parentComment) {
    const parent = await Comment.findOne({ _id: parentComment, post: post._id });
    if (!parent) throw new NotFoundError('Parent comment not found');
    if (parent.parentComment) throw new BadRequestError('Cannot reply to a reply');
  }

  // req.user is just the JWT payload ({id, username, role}) — no name/avatarUrl
  // to snapshot onto the comment, so look the real profile up.
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('User not found');

  const comment = await Comment.create({
    post: post._id,
    parentComment: parentComment || null,
    author: { name: user.name || user.username, username: user.username, avatarUrl: user.avatarUrl },
    authorUser: user._id,
    body: body.trim(),
    source: { provider: 'inkengine' },
  });

  await Post.findByIdAndUpdate(post._id, { $inc: { commentsCount: 1 } });

  res.status(StatusCodes.CREATED).json({ success: true, comment });
};

export const deleteComment = async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new NotFoundError('Comment not found');

  const isOwner = comment.authorUser && comment.authorUser.toString() === req.user.id;
  const isRealAdmin = req.user.role === 'admin' && !req.user.isDemo;
  if (!isOwner && !isRealAdmin) {
    throw new ForbiddenError('You can only delete your own comments');
  }

  // Replies point at this via parentComment — deleting a top-level comment
  // that has replies would orphan them, so take the whole thread with it.
  const idsToDelete = [comment._id, ...(await Comment.find({ parentComment: comment._id }).distinct('_id'))];
  await Comment.deleteMany({ _id: { $in: idsToDelete } });

  await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -idsToDelete.length } });

  res.status(StatusCodes.OK).json({ success: true, deletedIds: idsToDelete });
};

export const toggleCommentLike = async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new NotFoundError('Comment not found');

  const userId = req.user.id;
  const alreadyLiked = comment.likes.some((id) => id.toString() === userId);

  if (alreadyLiked) {
    comment.likes = comment.likes.filter((id) => id.toString() !== userId);
  } else {
    comment.likes.push(userId);
  }
  await comment.save();

  res.status(StatusCodes.OK).json({ success: true, comment });
};

export const triggerSync = async (req, res) => {
  if (isSyncInProgress()) {
    throw new ConflictError('A sync is already in progress');
  }
  // Deliberately not awaited — this can take ~20-30s (dev.to rate-limiting
  // pacing) and the caller (an admin clicking a button) shouldn't have to
  // hold a request open that long. Errors are logged inside syncDevToPosts.
  syncDevToPosts().catch((err) => console.error('[devtoSync] manual sync failed:', err.message));
  res.status(StatusCodes.ACCEPTED).json({ success: true, message: 'Sync started' });
};

// Because triggerSync returns before the work does, the only way the dashboard
// can tell a sync is still running is to ask. This also reports syncs it never
// started itself — the hourly schedule, or another admin's browser.
export const getSyncStatus = async (req, res) => {
  res.status(StatusCodes.OK).json({ success: true, syncing: isSyncInProgress() });
};
