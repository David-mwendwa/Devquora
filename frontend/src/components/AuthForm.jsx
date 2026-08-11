import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLogIn,
  FiUserPlus,
  FiAlertCircle,
  FiLoader,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import getErrorMessage from '../utils/getErrorMessage';
import { landingFor } from '../lib/roleLanding';

const inputClass =
  'w-full rounded-lg border border-dark-200 bg-surface py-2.5 pl-10 pr-4 text-sm text-dark-800 transition-colors placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-700 dark:text-dark-200';

const labelClass = 'mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300';

const Field = ({ id, label, icon: Icon, children }) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
      {children}
    </div>
  </div>
);

const AuthForm = ({ mode, prefill }) => {
  const isSignup = mode === 'signup';
  const { signup, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (prefill) {
      setForm((f) => ({ ...f, ...prefill }));
    }
  }, [prefill]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const authedUser = isSignup
        ? await signup(form)
        : await login({ email: form.email, password: form.password });
      // `replace` drops the auth page out of history. Pushing instead would
      // leave /login one step back, where GuestRoute bounces the now-signed-in
      // user straight forward again — making the back button look broken.
      navigate(landingFor(authedUser.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {isSignup && (
        <Field id="username" label="Username" icon={FiUser}>
          <input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="janedoe"
            value={form.username}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </Field>
      )}

      <Field id="email" label="Email" icon={FiMail}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
          className={inputClass}
        />
      </Field>

      <Field id="password" label="Password" icon={FiLock}>
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 transition-colors hover:text-dark-600 dark:hover:text-dark-200">
          {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </Field>
      {isSignup && <p className="-mt-3 text-xs text-dark-400">Must be at least 8 characters.</p>}

      {error && (
        <p className="flex items-start gap-2 rounded-md bg-danger-50 px-3 py-2.5 text-sm text-danger-700 dark:bg-danger-950 dark:text-danger-300">
          <FiAlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? (
          <>
            <FiLoader size={16} className="animate-spin" />
            Please wait...
          </>
        ) : isSignup ? (
          <>
            <FiUserPlus size={16} />
            Sign up
          </>
        ) : (
          <>
            <FiLogIn size={16} />
            Log in
          </>
        )}
      </button>
    </form>
  );
};

export default AuthForm;
