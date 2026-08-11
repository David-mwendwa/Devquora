import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
  FiSearch,
  FiEdit3,
  FiGrid,
  FiUser,
  FiBookmark,
  FiLogOut,
  FiChevronDown,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef(null);

  // Stay in sync with Explore's own search/filter UI (e.g. its "Clear filters"
  // button) rather than holding stale text once the URL's query changes elsewhere.
  useEffect(() => {
    setQ(location.pathname === '/explore' ? searchParams.get('q') || '' : '');
  }, [location.pathname, searchParams]);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the account dropdown on outside click — the only way it closes
  // besides navigating, since there's no backdrop overlay.
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Merge into Explore's existing params (rather than replacing the query
    // string outright) so searching from within Explore doesn't clobber an
    // active tag/sort filter.
    const next = new URLSearchParams(isExplorePage ? searchParams : undefined);
    if (q) next.set('q', q);
    else next.delete('q');
    navigate(`/explore${next.toString() ? `?${next.toString()}` : ''}`);
    setMenuOpen(false);
  };

  // About/Login/Signup aren't post-content pages at all, so a "search posts"
  // box there looks like a dead prop rather than a real affordance. Explore
  // now uses this same header field as its search — no separate page-level
  // one — so it stays visible there too, kept in sync via the effect above.
  const isExplorePage = location.pathname === '/explore';
  const isDashboardPage = location.pathname.startsWith('/dashboard');
  const isAccountPage = location.pathname === '/account';
  const hideHeaderSearch = ['/about', '/login', '/signup'].includes(location.pathname);

  const navLinkClass = (active) =>
    `hidden items-center rounded-md px-2.5 py-1 text-sm font-medium transition-colors sm:inline-flex ${
      active
        ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
        : 'text-dark-600 hover:bg-surface-muted hover:text-primary-600 dark:text-dark-300'
    }`;

  return (
    <header
      className={`sticky top-0 z-20 border-b bg-background/90 backdrop-blur transition-shadow ${
        scrolled ? 'border-dark-200 shadow-sm dark:border-dark-700' : 'border-transparent'
      }`}>
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        {!hideHeaderSearch && (
          <form onSubmit={handleSearch} className="hidden flex-1 max-w-md sm:block">
            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"
                size={15}
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search posts, tags..."
                className="w-full rounded-md border border-dark-200 bg-surface-muted py-1.5 pl-9 pr-3 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-700"
              />
            </div>
          </form>
        )}

        <nav className="ml-auto flex items-center gap-1.5">
          <Link to="/explore" className={navLinkClass(isExplorePage)}>
            Explore
          </Link>

          <span
            aria-hidden="true"
            className="mx-1 hidden h-5 w-px bg-dark-200 dark:bg-dark-700 sm:block"
          />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-md p-2 text-dark-500 transition-colors hover:bg-surface-muted hover:text-primary-600">
            {theme === 'dark' ? <FiSun size={17} /> : <FiMoon size={17} />}
          </button>

          {user ? (
            <>
              {user.role === 'author' && (
                <Link
                  to="/post/new"
                  className="hidden items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:inline-flex">
                  <FiEdit3 size={14} />
                  Write
                </Link>
              )}

              <div className="relative hidden sm:block" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={accountOpen}
                  className={`flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition-colors ${
                    accountOpen || isDashboardPage || isAccountPage
                      ? 'bg-surface-muted'
                      : 'hover:bg-surface-muted'
                  }`}>
                  <img
                    src={
                      user.avatarUrl ||
                      `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`
                    }
                    alt={user.username}
                    className="h-8 w-8 rounded-full border border-dark-200 dark:border-dark-700"
                  />
                  <FiChevronDown
                    size={14}
                    className={`text-dark-400 transition-transform ${accountOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {accountOpen && (
                  <div className="animate-fade-in absolute right-0 top-full mt-2 w-56 rounded-lg border border-dark-200 bg-surface py-1.5 shadow-card dark:border-dark-700">
                    <div className="border-b border-dark-200 px-3 pb-2 pt-1 dark:border-dark-700">
                      <p className="truncate text-sm font-semibold text-dark-800 dark:text-dark-100">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-dark-500">@{user.username}</p>
                    </div>
                    <Link
                      to={`/u/${user.username}`}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-dark-600 transition-colors hover:bg-surface-muted hover:text-dark-800 dark:text-dark-300 dark:hover:text-dark-100">
                      <FiUser size={15} />
                      Profile
                    </Link>
                    <Link
                      to="/activity"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-dark-600 transition-colors hover:bg-surface-muted hover:text-dark-800 dark:text-dark-300 dark:hover:text-dark-100">
                      <FiBookmark size={15} />
                      Activity
                    </Link>
                    {user.role !== 'user' && (
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-dark-600 transition-colors hover:bg-surface-muted hover:text-dark-800 dark:text-dark-300 dark:hover:text-dark-100">
                        <FiGrid size={15} />
                        Dashboard
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-danger-600 transition-colors hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-950">
                      <FiLogOut size={15} />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={navLinkClass(location.pathname === '/login')}>
                Log in
              </Link>
              <Link
                to="/signup"
                className="hidden rounded-md bg-primary-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:inline">
                Sign up
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="rounded-md p-2 text-dark-500 transition-colors hover:bg-surface-muted hover:text-primary-600 sm:hidden">
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </nav>
      </div>

      {menuOpen && (
        <div className="animate-fade-in border-t border-dark-200 bg-background px-4 py-4 dark:border-dark-700 sm:hidden">
          {!hideHeaderSearch && (
            <form onSubmit={handleSearch} className="relative mb-4">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search posts, tags..."
                className="w-full rounded-md border border-dark-200 bg-surface-muted py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none dark:border-dark-700"
              />
            </form>
          )}

          {user && (
            <div className="mb-3 flex items-center gap-3 border-b border-dark-200 pb-3 dark:border-dark-700">
              <img
                src={
                  user.avatarUrl ||
                  `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`
                }
                alt={user.username}
                className="h-10 w-10 rounded-full border border-dark-200 dark:border-dark-700"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-dark-800 dark:text-dark-100">
                  {user.name}
                </p>
                <p className="truncate text-xs text-dark-500">@{user.username}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 text-sm font-medium">
            <Link
              to="/explore"
              className={`flex items-center rounded-md px-2.5 py-2 ${
                isExplorePage
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'text-dark-600 hover:bg-surface-muted dark:text-dark-300'
              }`}>
              Explore
            </Link>

            {user ? (
              <>
                {user.role === 'author' && (
                  <Link
                    to="/post/new"
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-primary-600 hover:bg-surface-muted dark:text-primary-400">
                    <FiEdit3 size={15} />
                    Write
                  </Link>
                )}
                {user.role !== 'user' && (
                  <Link
                    to="/dashboard"
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 ${
                      isDashboardPage
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                        : 'text-dark-600 hover:bg-surface-muted dark:text-dark-300'
                    }`}>
                    <FiGrid size={15} />
                    Dashboard
                  </Link>
                )}
                <Link
                  to={`/u/${user.username}`}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-dark-600 hover:bg-surface-muted dark:text-dark-300">
                  <FiUser size={15} />
                  Profile
                </Link>
                <Link
                  to="/activity"
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 ${
                    location.pathname === '/activity'
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                      : 'text-dark-600 hover:bg-surface-muted dark:text-dark-300'
                  }`}>
                  <FiBookmark size={15} />
                  Activity
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-950">
                  <FiLogOut size={15} />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center rounded-md px-2.5 py-2 text-dark-600 hover:bg-surface-muted dark:text-dark-300">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center rounded-md px-2.5 py-2 text-primary-600 hover:bg-surface-muted dark:text-primary-400">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
