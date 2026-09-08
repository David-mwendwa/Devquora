import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import AuthLayout from '../components/AuthLayout';
import usePageMeta from '../lib/pageMeta';

const DEMO_ACCOUNTS = [
  { role: 'user', email: 'user@devquora.test', password: 'user1234' },
  { role: 'author', email: 'author@devquora.test', password: 'author123' },
  { role: 'admin', email: 'admin@devquora.test', password: 'admin123' },
];

const Login = () => {
  usePageMeta('Log in', 'Sign in to Devquora to write, comment, save posts and follow discussion. One-click demo accounts available.');
  const [prefill, setPrefill] = useState(null);

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in"
      subtitle="Pick up where you left off."
      footer={
        <>
          No account?{' '}
          <Link to="/signup" className="font-medium text-primary-600 hover:underline">
            Sign up
          </Link>
        </>
      }>
      <div className="-mx-6 mb-6 border-b border-dark-200 px-6 pb-6 dark:border-dark-700 sm:-mx-7 sm:px-7">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-dark-400">Try a demo account</p>
        <div className="flex gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => setPrefill({ email: acc.email, password: acc.password })}
              className="flex-1 rounded-md border border-dark-200 px-3 py-1.5 text-sm font-medium capitalize text-dark-600 transition-colors hover:bg-surface-muted dark:border-dark-700 dark:text-dark-300">
              {acc.role}
            </button>
          ))}
        </div>
      </div>

      <AuthForm mode="login" prefill={prefill} />
    </AuthLayout>
  );
};

export default Login;
