import bcrypt from 'bcryptjs';
import validator from 'validator';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import { BadRequestError, NotFoundError, UnauthenticatedError } from '../errors/customErrors.js';
import { sendToken } from '../utils/jwt.js';

// Profile lookup — requires a logged-in caller (any role), not restricted to
// the profile owner. Only the fields safe to show on a profile are selected
// (no email/passwordHash).
export const getUserProfile = async (req, res) => {
  const user = await User.findOne({ username: req.params.username }).select(
    'username name avatarUrl bio websiteUrl githubUrl role createdAt'
  );
  if (!user) throw new NotFoundError('User not found');

  res.status(StatusCodes.OK).json({ success: true, user });
};

// Posts and comments carry an embedded author snapshot rather than only a ref
// (imported dev.to authors have no User document), so renaming yourself or
// changing your picture has to be written through to everything you've already
// published — otherwise the byline on your own posts keeps showing who you used
// to be. Matched on `authorUser`, which is set for in-app content only, so an
// imported author's snapshot is never touched.
const syncAuthorSnapshot = async (user) => {
  const snapshot = {
    'author.name': user.name || user.username,
    'author.avatarUrl': user.avatarUrl,
  };
  await Promise.all([
    Post.updateMany({ authorUser: user._id }, { $set: snapshot }),
    Comment.updateMany({ authorUser: user._id }, { $set: snapshot }),
  ]);
};

// Empty is a real answer here — every link field is optional — so a blank value
// clears the path rather than storing '', and the app can keep testing these
// for truthiness alone.
//
// Exported for the unit tests: reaching these through updateMyProfile would
// need a database for a decision that involves none.
export const normalizeUrl = (value, label) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!validator.isURL(trimmed, { protocols: ['http', 'https'], require_protocol: true })) {
    throw new BadRequestError(`${label} must be a full http(s) URL`);
  }
  return trimmed;
};

// People type their GitHub as a handle far more often than as a URL, and
// "octocat" is not something to reject with a validation error — it's the
// answer, one prefix short. A pasted URL still has to actually be GitHub, or
// the field's label would be lying about where the link goes.
export const normalizeGithub = (value) => {
  const trimmed = value.trim().replace(/^@/, '');
  if (!trimmed) return undefined;

  if (/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(trimmed)) {
    return `https://github.com/${trimmed}`;
  }

  const url = normalizeUrl(trimmed, 'GitHub link');
  if (!/^(www\.)?github\.com$/i.test(new URL(url).hostname)) {
    throw new BadRequestError('GitHub link must point at github.com');
  }
  return url;
};

// The signed-in user editing their own account. Deliberately narrow: `username`
// and `email` are both identifiers — the username is the JWT payload, the public
// /u/:username URL and the key in every author snapshot; the email is the login.
// Neither has a re-verification or redirect story behind it, so a change here
// would break links or surface a raw Mongo 11000. Role and status are the
// admin's to set, not yours.
export const updateMyProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new UnauthenticatedError('Account no longer exists');

  const { name, bio, avatarUrl, websiteUrl, githubUrl } = req.body;

  if (name !== undefined) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  if (avatarUrl !== undefined) user.avatarUrl = normalizeUrl(avatarUrl, 'Avatar');
  if (websiteUrl !== undefined) user.websiteUrl = normalizeUrl(websiteUrl, 'Portfolio link');
  if (githubUrl !== undefined) user.githubUrl = normalizeGithub(githubUrl);

  await user.save({ validateModifiedOnly: true });
  await syncAuthorSnapshot(user);

  res.status(StatusCodes.OK).json({ success: true, user });
};

export const updateMyPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('currentPassword and newPassword are required');
  }
  // Same floor signup enforces — a change password form is not the place to
  // let someone downgrade below the bar their account was created under.
  if (newPassword.length < 8) {
    throw new BadRequestError('New password must be at least 8 characters');
  }
  if (newPassword === currentPassword) {
    throw new BadRequestError('New password matches your current one');
  }

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw new UnauthenticatedError('Account no longer exists');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new UnauthenticatedError('Current password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save({ validateModifiedOnly: true });

  // Re-issued rather than left alone: the old JWT still verifies today, but the
  // moment a passwordChangedAt check lands in the auth middleware, keeping it
  // would sign the user out on their very next request.
  sendToken(user, StatusCodes.OK, res);
};
