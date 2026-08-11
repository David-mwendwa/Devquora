import { Link } from 'react-router-dom';
import Logo from './Logo';

// Auth shell: a branded panel and the form panel, both bounded within the
// same `container` every other page uses (padded, centered, capped width) —
// never full-bleed to the browser edge, so this doesn't stick out as a
// different layout language from the rest of the site. Both Login and Signup
// render through this so the two pages share one frame instead of drifting.
const AuthLayout = ({ eyebrow, title, subtitle, footer, children }) => (
  <div className="container grid grid-cols-1 items-stretch gap-6 py-10 lg:grid-cols-2 lg:gap-8 lg:py-16">
    <div className="relative hidden overflow-hidden rounded-2xl bg-dark-900 lg:flex lg:flex-col lg:justify-between lg:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgb(var(--color-background)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        aria-hidden="true"
        className="animate-float pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary-500 opacity-20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-primary-700 opacity-25 blur-3xl"
      />

      <Link to="/" className="relative inline-block">
        <Logo onDark />
      </Link>

      <div className="relative max-w-md">
        <p className="mb-3 font-heading text-3xl font-bold leading-tight text-dark-50">
          Built for developers who write.
        </p>
        <p className="text-dark-300">
          Long-form posts, real discussion, and a reading feed that stays out of your way —
          no algorithm feed, just the people you follow.
        </p>
      </div>

      <p className="relative text-xs text-dark-400">&copy; {new Date().getFullYear()} Devquora</p>
    </div>

    <div className="flex flex-col items-center justify-center">
      <div className="mb-8 lg:hidden">
        <Logo />
      </div>

      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-dark-200 bg-surface shadow-card dark:border-dark-700">
        <div className="border-b border-dark-200 px-6 py-6 text-center dark:border-dark-700 sm:px-7">
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-2xl font-bold text-dark-800 dark:text-dark-100">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-dark-500">{subtitle}</p>}
        </div>

        <div className="px-6 py-6 sm:px-7">{children}</div>

        {footer && (
          <div className="border-t border-dark-200 bg-surface-muted px-6 py-4 text-center text-sm text-dark-500 dark:border-dark-700 sm:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AuthLayout;
