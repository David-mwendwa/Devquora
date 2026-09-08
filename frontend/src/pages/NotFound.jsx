import { Link, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiCompass, FiSearch } from 'react-icons/fi';
import usePageMeta from '../lib/pageMeta';

// The catch-all. Without it an unknown URL rendered the header and footer around
// a completely empty <main>, which reads as the app having crashed rather than
// as a dead link.
const NotFound = () => {
  usePageMeta('Page not found', 'That page does not exist on Devquora.', { noindex: true });
  const { pathname } = useLocation();

  return (
    <div className="container flex max-w-lg flex-col items-center py-20 text-center">
      <p className="font-heading text-6xl font-bold text-primary-600 dark:text-primary-500">404</p>
      <h1 className="mt-3 font-heading text-2xl font-bold text-dark-800 dark:text-dark-100">
        We couldn't find that page
      </h1>
      <p className="mt-2 text-sm text-dark-500">
        Nothing lives at{' '}
        {/* Echoed back so a typo is obvious at a glance — and truncated, since
            the path is whatever the address bar happened to contain. */}
        <code className="break-all rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-dark-600 dark:text-dark-300">
          {pathname.length > 60 ? `${pathname.slice(0, 60)}…` : pathname}
        </code>
        . It may have been moved, or the link that brought you here may be out of date.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700">
          <FiArrowLeft size={15} />
          Back to the feed
        </Link>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 rounded-lg border border-dark-200 px-4 py-2.5 text-sm font-medium text-dark-600 transition-colors hover:bg-surface-muted dark:border-dark-700 dark:text-dark-300">
          <FiCompass size={15} />
          Explore posts
        </Link>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-dark-400">
        <FiSearch size={13} />
        Looking for something specific? Try the search box above.
      </p>
    </div>
  );
};

export default NotFound;
