import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    // Self-ref kept for future threading — the current UI only renders a flat
    // list, so nothing reads this yet, but the data isn't lost.
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    // Embedded snapshot, same shape as Post.author — filled in from the real
    // User doc at write time for in-app comments (the JWT payload alone
    // doesn't carry name/avatarUrl), or from the source API for imported ones.
    author: {
      name: String,
      username: String,
      avatarUrl: String,
    },
    authorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    body: { type: String, required: [true, 'Comment body is required'], trim: true },
    // Users who liked this comment — storing the ids (not just a count) makes
    // toggling idempotent and lets the frontend derive "did I like this" with
    // no extra request.
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    source: {
      provider: { type: String, enum: ['devto', 'inkengine'], default: 'inkengine' },
      externalId: { type: String, sparse: true, unique: true },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('Comment', CommentSchema);
