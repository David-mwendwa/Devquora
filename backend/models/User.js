import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    name: { type: String, trim: true },
    bio: { type: String, maxlength: 280 },
    avatarUrl: String,
    // Optional "where else to find me" links, shown on the public profile.
    // Both are stored as absolute URLs — a bare GitHub handle is normalised to
    // one on the way in (see normalizeGithub in userController).
    websiteUrl: String,
    githubUrl: String,
    role: {
      type: String,
      enum: ['user', 'author', 'admin'],
      default: 'author',
    },
    // Suspension is enforced at the door (login / getMe) rather than per-request:
    // an already-issued JWT carries no status, so a suspension takes effect on
    // the account's next authenticated round-trip, not mid-request.
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    // Set only on the three seeded accounts the login page's public quick-fill
    // points at (see scripts/seedDemoUsers.js). Anyone can sign in as the demo
    // admin, so its destructive/moderation actions are no-op'd server-side —
    // see assertCanManage in postController.js and the guards in
    // adminController.js — rather than trusting the UI to not offer them.
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

UserSchema.methods.signJWT = function () {
  return jwt.sign(
    { id: this._id, username: this.username, role: this.role, isDemo: this.isDemo },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_LIFETIME || '7d' }
  );
};

export default mongoose.model('User', UserSchema);
