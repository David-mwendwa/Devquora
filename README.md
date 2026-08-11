# Devquora

A minimal, developer-focused blogging platform. Markdown from the first
keystroke, code that actually looks like code, and a reading feed that stays
out of your way — no algorithmic ranking, just posts and threaded discussion.

Built as a full MERN app: React (Vite) on the frontend, Express + MongoDB on
the backend, JWT auth, and a real content library synced in from dev.to
alongside natively authored posts.

## Features

- **Markdown-first editor** — live preview, syntax-highlighted code blocks,
  drafts, tag input, auto-generated read time.
- **Three roles, three dashboards** — reader, author, admin. Each gets its own
  landing page and its own set of guarded routes, enforced identically on the
  client (route guards) and the server (middleware) so hiding a button is
  never the only thing standing between a role and an action.
- **Real content, not fixtures** — a background sync job pulls articles and
  comments from dev.to's public API into the same `Post`/`Comment` schema
  native posts use, so the feed, tag search, and comment threads all work
  against genuine content out of the box.
- **Author tools** — per-post view/read-time stats, a dashboard listing your
  own drafts and published posts.
- **Admin tools** — platform-wide stats, user moderation (role/status), post
  moderation (flag, unpublish), a manual "sync now" trigger. A public one-click
  demo login exists for all three roles — the demo admin can see every tab on
  the dashboard but is server-side blocked from actually changing anything (see
  [Demo accounts](#demo-accounts) below).
- **Reader account page** — editable profile (bio, avatar, portfolio/GitHub
  links — a bare GitHub handle expands to a full URL automatically), password
  change, and an activity view (saved posts, liked posts, comments written).
- **Light/dark theme** with no flash-of-wrong-theme on load, persisted across
  visits.
- **Deploy-ready** — `netlify.toml` for the frontend, `render.yaml` for the
  backend.

## Tech stack

| | |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS, Axios, react-markdown |
| Backend | Node.js, Express, Mongoose, JWT, bcrypt |
| Database | MongoDB (Atlas or local) |
| Testing | Vitest + Testing Library (frontend), Jest + Supertest (backend) |
| Deploy | Netlify (frontend), Render (backend) |

## Project structure

```
Devquora/
├── frontend/          React app (Vite)
│   └── src/
│       ├── api/           thin axios wrappers per resource
│       ├── components/    shared UI (Header, PostCard, Editor toolbar, charts…)
│       ├── context/       Auth, Theme, Confirm-dialog providers
│       ├── pages/          routed pages, incl. pages/dashboard/ per role
│       └── lib/            markdown/liquid-tag processing, role→route mapping
├── backend/           Express API
│   ├── controllers/       one file per resource (auth, post, user, admin)
│   ├── models/             User, Post, Comment (Mongoose)
│   ├── routes/             REST routes, grouped by resource
│   ├── middleware/         auth, error handling, 404
│   ├── services/          devtoSync.js — the dev.to content importer
│   └── scripts/           seedDemoUsers.js
├── netlify.toml        frontend deploy config
└── render.yaml          backend deploy config
```

## Getting started

Requires Node 20+ and a MongoDB instance (local or [Atlas](https://www.mongodb.com/atlas)).

```bash
git clone git@github.com:David-mwendwa/Devquora.git
cd Devquora
npm run install:all
```

Copy the env templates and fill them in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

At minimum, set `MONGO_URL` and `JWT_SECRET` in `backend/.env`. Everything
else has a sane default — see the comments in each `.env.example` file.

Run both apps together:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5001 (health check at `/api/health`)

On first connect, the backend automatically kicks off a dev.to content sync
(and repeats it hourly, see `SYNC_INTERVAL_MS`) — give it a minute to populate
the feed. To seed the three demo accounts (see below), run:

```bash
npm run seed:demo --prefix backend
```

## Demo accounts

The login page has a one-click "Try a demo account" panel for all three
roles:

| Role | Email | Password |
|---|---|---|
| Reader | `user@devquora.test` | `user1234` |
| Author | `author@devquora.test` | `author123` |
| Admin | `admin@devquora.test` | `admin123` |

These are flagged `isDemo: true` in the database. The demo **admin** account
can view every tab on the admin dashboard (stats, users, posts) but every
mutating action — suspending/promoting a user, deleting or flagging a post,
deleting someone else's comment — is rejected server-side with a 403,
regardless of what the UI allows. Real admin accounts (`isDemo: false`) are
unaffected.

## Scripts

Run from the repo root unless noted:

| Command | Does |
|---|---|
| `npm run dev` | frontend + backend concurrently |
| `npm run server` | backend only |
| `npm run build` | production frontend build |
| `npm test` | full test suite, both packages |
| `npm run format` | Prettier, both packages |
| `npm run seed:demo --prefix backend` | (re)create the three demo accounts |

## API overview

All routes are under `/api/v1`. Auth is a `Bearer` JWT (or `token` cookie).

| Resource | Notes |
|---|---|
| `POST /auth/signup`, `/auth/login`, `GET /auth/me` | new accounts default to the `author` role |
| `GET /posts`, `GET /posts/:slug`, `GET /posts/:slug/comments` | public reads |
| `POST /posts`, `PATCH /posts/:id`, `DELETE /posts/:id` | author (own posts) or admin |
| `POST /posts/:slug/comments`, `POST /posts/:slug/like`, `POST /posts/:slug/save` | any authenticated user |
| `PATCH /users/me`, `PATCH /users/me/password` | account settings |
| `GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/:id`, `GET /admin/posts`, `PATCH /admin/posts/:id` | admin-only |
| `POST /posts/sync`, `GET /posts/sync/status` | admin-triggered dev.to re-sync |

## Deployment

- **Frontend (Netlify):** `netlify.toml` builds `frontend/` and publishes
  `frontend/dist`, with an SPA redirect so client-side routing works on a
  refresh. Set `VITE_API_BASE_URL` in Netlify's site settings to your deployed
  backend URL.
- **Backend (Render):** `render.yaml` defines a Node web service rooted at
  `backend/`, health-checked at `/api/health`. Set the `sync: false` env vars
  (`MONGO_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PROD_FRONTEND_URL`, etc.) in
  Render's dashboard — they're intentionally not committed.

## Testing

```bash
npm test                    # both packages
npm run test:frontend       # Vitest
npm run test:backend        # Jest + Supertest
```

The backend suite runs without a database — route guards and authorization
rules are tested against the real Express app via Supertest, asserting on the
401/403 responses middleware produces before any controller (or database
query) runs.

## License

MIT
