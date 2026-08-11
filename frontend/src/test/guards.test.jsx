import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';
import GuestRoute from '../components/GuestRoute';
import { landingFor } from '../lib/roleLanding';

// The guards decide who sees what, and they're the kind of thing that keeps
// working right up until a role is added. AuthContext is mocked rather than
// wrapped in a real provider: these tests are about the redirect decision, not
// about how the session was obtained.

const mockAuth = vi.hoisted(() => ({ value: { user: null, loading: false } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth.value }));

const asUser = (user, loading = false) => {
  mockAuth.value = { user, loading };
};

// Renders the guard at /secret with recognisable stand-ins for every place it
// could send someone, so the assertion reads as a destination, not a URL.
const renderGuard = (element) =>
  render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/secret" element={element} />
        <Route path="/" element={<p>feed</p>} />
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/dashboard" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  test('renders nothing while the session is still resolving', () => {
    asUser(null, true);
    const { container } = renderGuard(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>
    );
    // Not the login page — a flash of it before /auth/me lands would be a
    // redirect the user never actually earned.
    expect(container).toBeEmptyDOMElement();
  });

  test('sends a signed-out visitor to the login page', () => {
    asUser(null);
    renderGuard(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>
    );
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  test('lets any signed-in account through when no roles are named', () => {
    asUser({ role: 'user' });
    renderGuard(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  test.each(['author', 'admin'])('lets %s into a writer-only route', (role) => {
    asUser({ role });
    renderGuard(
      <ProtectedRoute roles={['author', 'admin']}>
        <p>editor</p>
      </ProtectedRoute>
    );
    expect(screen.getByText('editor')).toBeInTheDocument();
  });

  test('sends a reader away from a writer-only route — to their own landing, not to login', () => {
    asUser({ role: 'user' });
    renderGuard(
      <ProtectedRoute roles={['author', 'admin']}>
        <p>editor</p>
      </ProtectedRoute>
    );
    expect(screen.queryByText('editor')).not.toBeInTheDocument();
    expect(screen.getByText('feed')).toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});

describe('GuestRoute', () => {
  test('shows the login page to a signed-out visitor', () => {
    asUser(null);
    renderGuard(
      <GuestRoute>
        <p>auth form</p>
      </GuestRoute>
    );
    expect(screen.getByText('auth form')).toBeInTheDocument();
  });

  test.each([
    ['user', 'feed'],
    ['author', 'dashboard'],
    ['admin', 'dashboard'],
  ])('bounces a signed-in %s to their landing page', (role, destination) => {
    asUser({ role });
    renderGuard(
      <GuestRoute>
        <p>auth form</p>
      </GuestRoute>
    );
    expect(screen.getByText(destination)).toBeInTheDocument();
  });
});

describe('landingFor', () => {
  // GuestRoute and AuthForm both read this; if they ever disagreed, logging in
  // would land somewhere the guard immediately redirects away from.
  test('maps every role, and falls back for an unknown one', () => {
    expect(landingFor('user')).toBe('/');
    expect(landingFor('author')).toBe('/dashboard');
    expect(landingFor('admin')).toBe('/dashboard');
    expect(landingFor(undefined)).toBe('/');
    expect(landingFor('something-new')).toBe('/');
  });
});
