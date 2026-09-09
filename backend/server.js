import 'dotenv/config.js';
import mongoose from 'mongoose';
import app from './app.js';

// The process: everything with a side effect. The app itself — middleware,
// routes, error handling — is app.js, which the test suite imports without any
// of this running.

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err.name, err.message);
  process.exit(1);
});

if (!process.env.MONGO_URL) {
  console.error('MONGO_URL is not defined in environment variables');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log('✅ MongoDB connection successful');

    // Never let this hit the network during tests, and never let a rejection
    // here reach the unhandledRejection handler below — that one shuts the
    // whole server down, which a flaky dev.to response shouldn't be able to do.
    if (process.env.NODE_ENV !== 'test') {
      import('./services/devtoSync.js').then(({ syncDevToPosts }) => {
        const runSync = () =>
          syncDevToPosts().catch((err) => console.error('[devtoSync] sync failed:', err.message));
        runSync();
        const intervalMs = Number(process.env.SYNC_INTERVAL_MS) || 60 * 60 * 1000;
        setInterval(runSync, intervalMs);
      });
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// 5001, never 5000: macOS AirPlay Receiver holds 5000, so a fallback of 5000
// fails to bind on this machine whenever PORT is unset — a fresh clone, or a
// host that does not set it. Every backend in this workspace picks its own
// port above 5000 for exactly this reason.
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', err.name, err.message);
  server.close(() => process.exit(1));
});
