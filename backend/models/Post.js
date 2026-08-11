import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    slug: { type: String, required: [true, 'Slug is required'], unique: true, trim: true },
    excerpt: { type: String, trim: true },
    content: { type: String, required: [true, 'Content is required'] },
    coverImageUrl: { type: String, trim: true },
    // Embedded, not a User ref — imported authors (e.g. from dev.to) aren't Devquora users.
    author: {
      name: String,
      username: String,
      avatarUrl: String,
      externalUrl: String,
    },
    // Unused for now; leaves the door open for native in-app authoring later
    // without a schema change.
    authorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: [{ type: String, trim: true, lowercase: true }],
    readTimeMin: { type: Number, default: 1 },
    // Real view counter, incremented on every detail-page fetch (see
    // getPostBySlug). Seeded once from dev.to's public reactions count at
    // first sync (dev.to exposes no real pageview number) — never touched by
    // later syncs, see devtoSync's $setOnInsert.
    views: { type: Number, default: 0 },
    // Per-day view buckets keyed 'YYYY-MM-DD', $inc'd alongside `views` on each
    // detail fetch. This is what makes the dashboard trend charts real analytics
    // rather than a generated wave — a separate events collection would be more
    // flexible, but this costs one extra $inc and no extra reads.
    dailyViews: { type: Map, of: Number, default: () => ({}) },
    // Drafts are author-visible only: every public query filters them out
    // (`status: { $ne: 'draft' }`, which also covers posts predating this field).
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    // Moderation flag, admin-only. Flagged posts stay readable — flagging is a
    // "look at this" marker, unpublishing is the action that hides content.
    flagged: { type: Boolean, default: false },
    // Derived from Comment.countDocuments after sync, never copied from the
    // source's self-reported count — see Comment model / devtoSync for why.
    commentsCount: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    publishedAt: { type: Date, default: Date.now },
    source: {
      provider: { type: String, enum: ['devto', 'inkengine'], default: 'inkengine' },
      externalId: { type: Number, index: true, sparse: true, unique: true },
      url: String,
    },
  },
  // Mongoose defines the `id` virtual by default but does NOT serialize it
  // into res.json() output unless virtuals are explicitly turned on here —
  // the frontend keys/links everything off post.id, so this matters.
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('Post', PostSchema);
