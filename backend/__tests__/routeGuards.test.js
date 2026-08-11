import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';

// Authorization tests, and deliberately only that. Every case here is decided
// by middleware — authenticate and authorizeRoles both throw before the
// controller runs — so the suite needs no database, no fixtures and no
// network, and stays fast enough to run on every save.
//
// The rule these lock down: authoring is what the `user` (reader) role exists
// to withhold. Hiding the Write button in the header is not a guard; /post/new
// and this endpoint are both reachable directly, and a demoted account could
// publish until POST /posts grew its authorizeRoles.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const tokenFor = (role, extra = {}) =>
  jwt.sign(
    { id: '507f1f77bcf86cd799439011', username: `${role}-account`, role, ...extra },
    process.env.JWT_SECRET,
    {
      expiresIn: '5m',
    }
  );

const auth = (role, extra) => ['Authorization', `Bearer ${tokenFor(role, extra)}`];

describe('unauthenticated access', () => {
  test.each([
    ['post', '/api/v1/posts'],
    ['get', '/api/v1/posts/mine'],
    ['get', '/api/v1/admin/users'],
    ['patch', '/api/v1/users/me'],
    ['patch', '/api/v1/users/me/password'],
  ])('%s %s is refused without a token', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('a malformed token is refused, not accepted as anonymous', async () => {
    const res = await request(app)
      .get('/api/v1/posts/mine')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  test('a token signed with the wrong secret is refused', async () => {
    const forged = jwt.sign({ id: 'x', role: 'admin' }, 'some-other-secret');
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });
});

describe('the reader role cannot author', () => {
  test('POST /posts is forbidden for a reader', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set(...auth('user'))
      .send({ title: 'Should not publish', content: 'body' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  test.each(['author', 'admin'])('POST /posts passes the role gate for %s', async (role) => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set(...auth(role))
      // Missing title/content: the controller's own 400 proves the request got
      // past the guard, without needing a database behind it.
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/title is required/i);
  });
});

describe('admin-only surfaces', () => {
  test.each([
    ['get', '/api/v1/admin/stats'],
    ['get', '/api/v1/admin/users'],
    ['get', '/api/v1/admin/posts'],
    ['post', '/api/v1/posts/sync'],
    ['get', '/api/v1/posts/sync/status'],
  ])('%s %s is forbidden for a non-admin', async (method, path) => {
    const res = await request(app)
      [method](path)
      .set(...auth('author'));
    expect(res.status).toBe(403);
  });

  test('sync status is reachable for an admin', async () => {
    const res = await request(app)
      .get('/api/v1/posts/sync/status')
      .set(...auth('admin'));
    expect(res.status).toBe(200);
    expect(typeof res.body.syncing).toBe('boolean');
  });
});

describe('the seeded demo admin cannot moderate', () => {
  // Both routes check User.isDemo (carried on the JWT — see User.signJWT)
  // before ever loading the target from the database, so these are testable
  // with a made-up id and no DB, same as every other guard in this file. The
  // demo admin is the account the public login page's one-click quick-fill
  // signs anyone into — see backend/scripts/seedDemoUsers.js.
  test.each([
    ['patch', '/api/v1/admin/users/507f1f77bcf86cd799439099'],
    ['patch', '/api/v1/admin/posts/507f1f77bcf86cd799439099'],
  ])('%s %s is forbidden for the demo admin', async (method, path) => {
    const res = await request(app)
      [method](path)
      .set(...auth('admin', { isDemo: true }))
      .send({ status: 'suspended' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/demo admin is read-only/i);
  });
});

describe('public surfaces stay public', () => {
  test('health needs no token', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  test('an unknown route 404s in the standard error shape', async () => {
    const res = await request(app).get('/api/v1/no-such-thing');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
