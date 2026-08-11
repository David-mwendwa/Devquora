import { StatusCodes } from 'http-status-codes';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/customErrors.js';
import { recentDayKeys, percentDelta } from '../utils/analytics.js';

const ROLES = ['user', 'author', 'admin'];
const ACCOUNT_STATUSES = ['active', 'suspended'];

// updateUser and moderatePost are pure moderation actions with no owner to
// fall back on — unlike postController's assertCanManage, there's no "it's
// your own content" exception possible here. The public login page's
// one-click admin demo (see User.isDemo) can view every tab on this
// dashboard, it just can't act on real accounts or posts through it.
const assertRealAdmin = (user) => {
  if (user.isDemo) {
    throw new ForbiddenError('The demo admin is read-only here — explore freely, nothing on this dashboard can actually be changed.');
  }
};

// Platform-wide counters plus the two 30-day trends the Overview tab charts.
export const getPlatformStats = async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

  const publishedFilter = { status: { $ne: 'draft' } };

  const [
    totalUsers,
    usersThirtyDaysAgo,
    totalPosts,
    viewsAgg,
    postsThisWeek,
    postsPriorWeek,
    postsLastThirty,
    flaggedPosts,
    suspendedAccounts,
    activitySeriesRaw,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $lt: thirtyDaysAgo } }),
    Post.countDocuments(publishedFilter),
    Post.aggregate([{ $match: publishedFilter }, { $group: { _id: null, total: { $sum: '$views' } } }]),
    Post.countDocuments({ ...publishedFilter, publishedAt: { $gte: sevenDaysAgo } }),
    Post.countDocuments({
      ...publishedFilter,
      publishedAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    }),
    Post.countDocuments({ ...publishedFilter, publishedAt: { $gte: thirtyDaysAgo } }),
    Post.countDocuments({ flagged: true }),
    User.countDocuments({ status: 'suspended' }),
    Post.aggregate([
      { $match: { ...publishedFilter, publishedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$publishedAt' } }, value: { $sum: 1 } } },
    ]),
  ]);

  // Same reason as the author views series: quiet days must appear as zeros or
  // the x-axis silently compresses them.
  const byDay = new Map(activitySeriesRaw.map((row) => [row._id, row.value]));
  const activitySeries = recentDayKeys(30).map((date) => ({ date, value: byDay.get(date) || 0 }));

  res.status(StatusCodes.OK).json({
    success: true,
    stats: {
      totalUsers,
      totalPosts,
      totalViews: viewsAgg[0]?.total || 0,
      postsThisWeek,
    },
    deltas: {
      totalUsers: percentDelta(totalUsers, usersThirtyDaysAgo),
      totalPosts: { value: postsLastThirty, period: 'vs last 30 days' },
      postsThisWeek: { value: postsThisWeek - postsPriorWeek, period: 'vs prior week' },
    },
    activitySeries,
    needsAttention: { flaggedPosts, suspendedAccounts },
  });
};

export const getUsers = async (req, res) => {
  // Filtering and search stay client-side (same as the author's post table) —
  // the admin table is a single page of accounts, not an infinite list.
  const users = await User.find()
    .select('username name email avatarUrl role status createdAt')
    .sort({ createdAt: -1 });
  res.status(StatusCodes.OK).json({ success: true, users });
};

export const updateUser = async (req, res) => {
  assertRealAdmin(req.user);
  const { role, status } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found');

  // Without this an admin can lock themselves out of the very screen they're
  // standing on — and there's no other way back in.
  if (user._id.toString() === req.user.id) {
    throw new BadRequestError('You cannot change your own role or account status');
  }

  if (role !== undefined) {
    if (!ROLES.includes(role)) throw new BadRequestError('Invalid role');
    user.role = role;
  }
  if (status !== undefined) {
    if (!ACCOUNT_STATUSES.includes(status)) throw new BadRequestError('Invalid account status');
    user.status = status;
  }

  await user.save();
  res.status(StatusCodes.OK).json({ success: true, user });
};

// Every post on the platform — drafts and flagged content included, which is
// exactly what the public list endpoint filters out.
export const getAllPosts = async (req, res) => {
  const posts = await Post.find()
    .select('-content -dailyViews')
    .sort({ publishedAt: -1 });
  res.status(StatusCodes.OK).json({ success: true, posts });
};

export const moderatePost = async (req, res) => {
  assertRealAdmin(req.user);
  const { status, flagged } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) throw new NotFoundError('Post not found');

  if (status !== undefined) {
    if (status !== 'draft' && status !== 'published') throw new BadRequestError('Invalid post status');
    if (status === 'published' && post.status === 'draft') post.publishedAt = new Date();
    post.status = status;
  }
  if (flagged !== undefined) post.flagged = Boolean(flagged);

  await post.save();
  res.status(StatusCodes.OK).json({ success: true, post });
};
