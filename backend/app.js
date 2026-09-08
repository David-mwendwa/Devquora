import 'express-async-errors';
import 'dotenv/config.js';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';

import compression from 'compression';
import helmet from 'helmet';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

import authRouter from './routes/authRoutes.js';
import postRouter from './routes/postRoutes.js';
import userRouter from './routes/userRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import notFoundMiddleware from './middleware/notFound.js';
import errorHandlerMiddleware from './middleware/errorHandler.js';

// The configured Express app, with no side effects of its own: it opens no
// database connection, binds no port and starts no timers. server.js owns all
// three. Split out so the test suite can mount the real app — with the real
// middleware chain and the real route guards — through supertest, instead of
// asserting against a hand-built stand-in that can silently drift from it.

const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    // Both dev ports are kept — Vite falls to 5174 whenever 5173 is already
    // taken by another `npm run dev` (this repo runs alongside sibling
    // projects that reuse the same default port).
    origin: ['http://localhost:5173', 'http://localhost:5174', process.env.FRONTEND_URL, process.env.PROD_FRONTEND_URL].filter(
      Boolean
    ),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Ahead of everything that produces a body. The feed and the article endpoints
// send JSON that is mostly repeated keys and prose, which is close to gzip's
// best case — the post list compresses by roughly 4x — and the API is on a
// free-tier host in another region, so bytes on the wire are the slow part.
app.use(compression());

app.use(helmet());
app.use(mongoSanitize());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(xss());
app.use(cookieParser());
app.use(hpp({ whitelist: ['page', 'limit', 'sort', 'tag', 'q'] }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const isDev = process.env.NODE_ENV === 'development';
// Tests fire dozens of requests at these routes in a second and are not the
// traffic the limiter exists to stop; leaving it armed would make the suite
// fail on request 11 rather than on a real defect.
const isTest = process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Strict in production (10 / 15min); loose in dev so repeated manual testing
  // (wrong demo passwords, hot-reload re-mounts, etc.) doesn't lock you out.
  max: isDev || isTest ? 1000 : 10,
  // Express's res.send() JSON-encodes object bodies, so this matches the
  // { success, message } shape errorHandler.js sends for every other error —
  // otherwise this response bypasses errorHandler entirely and the frontend's
  // `err.response.data.message` extraction silently misses it.
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in a few minutes.',
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100000 : 200,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.use('/api', apiLimiter);
app.use('/api/v1/auth', authLimiter);

app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/admin', adminRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
