import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEdit2,
  FiExternalLink,
  FiLoader,
  FiLock,
  FiRotateCcw,
  FiSave,
  FiSlash,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ProfileLinks from '../components/ProfileLinks';
import usePageTitle from '../hooks/usePageTitle';
import getErrorMessage from '../utils/getErrorMessage';

/**
 * Account page — the idea (and most of the layout) is borrowed from VoltGrid's
 * `pages/account/ProfilePage.jsx`: one identity card that flips between a read
 * view and an edit form, an account-details list under it, and a separate
 * change-password card.
 *
 * Three differences, all forced by what Devquora actually is:
 *
 *  - The avatar is a URL, not an upload. VoltGrid has an image pipeline
 *    (`utils/imageStorage.js`, Cloudinary-or-disk); Devquora has no upload
 *    route at all, and `User.avatarUrl` is a plain string. A file picker here
 *    would be a control with nothing behind it.
 *  - `username` is the frozen identifier rather than `email`. Both are frozen,
 *    but the username is the one worth explaining — it's the /u/ URL and the key
 *    in every author snapshot on your posts.
 *  - Feedback is an inline banner, not a toast. Nothing else in this app mounts
 *    a ToastContainer, and a single page shouldn't be the one thing that does.
 */

const DEFAULT_AVATAR = (username) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

const inputClass =
  'w-full rounded-lg border border-dark-200 bg-surface px-3.5 py-2.5 text-sm text-dark-800 transition-colors placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-dark-500 dark:border-dark-700 dark:text-dark-200';

const labelClass = 'mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300';

const cardClass = 'rounded-xl border border-dark-200 bg-surface shadow-card dark:border-dark-700';

const BIO_LIMIT = 280;

const ABSOLUTE_URL = /^https?:\/\/\S+$/i;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

const ROLE_LABEL = { admin: 'Admin', author: 'Author', user: 'Reader' };

// Every editable field, seeded from the account — one place, so the mount
// effect and Cancel can't fall out of step when a field is added.
const formFrom = (user) => ({
  name: user.name || '',
  bio: user.bio || '',
  avatarUrl: user.avatarUrl || '',
  websiteUrl: user.websiteUrl || '',
  githubUrl: user.githubUrl || '',
});

const Banner = ({ tone, children }) =>
  children ? (
    <p
      className={`mb-5 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${
        tone === 'error'
          ? 'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-300'
          : 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300'
      }`}
      role="status">
      {tone === 'error' ? (
        <FiAlertCircle size={16} className="mt-0.5 shrink-0" />
      ) : (
        <FiCheckCircle size={16} className="mt-0.5 shrink-0" />
      )}
      {children}
    </p>
  ) : null;

const Detail = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-dark-500">{label}</dt>
    <dd className="mt-1 text-sm text-dark-800 dark:text-dark-200">{children}</dd>
  </div>
);

const Account = () => {
  usePageTitle('Your account');
  const { user, updateProfile, updatePassword } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatarUrl: '',
    websiteUrl: '',
    githubUrl: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');

  // Seeded from the account and re-seeded whenever it changes — AuthContext
  // renders from its localStorage cache first and refetches /auth/me on mount,
  // so the first render here can be stale.
  useEffect(() => {
    if (!user) return;
    setForm(formFrom(user));
  }, [user]);

  // ProtectedRoute guarantees a session, but the context is still resolving
  // /auth/me on a cold load and has nothing to show for a moment.
  if (!user) {
    return (
      <div className="container flex justify-center py-24">
        <FiLoader size={22} className="animate-spin text-primary-600" />
        <span className="sr-only">Loading your account…</span>
      </div>
    );
  }

  const cancelEdit = () => {
    setForm(formFrom(user));
    setProfileError('');
    setEditing(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileNotice('');

    const avatarUrl = form.avatarUrl.trim();
    const websiteUrl = form.websiteUrl.trim();
    // Checked here as well as on the server so a typo costs no round trip —
    // and so the message names the field rather than arriving as a bare 400.
    // GitHub isn't checked here: a bare handle is valid input and normalising
    // it is the server's job, so this side can't tell good from bad.
    if (avatarUrl && !ABSOLUTE_URL.test(avatarUrl)) {
      setProfileError('Avatar must be a full http(s) image URL.');
      return;
    }
    if (websiteUrl && !ABSOLUTE_URL.test(websiteUrl)) {
      setProfileError('Portfolio must be a full http(s) URL, e.g. https://yoursite.dev');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim(),
        avatarUrl,
        websiteUrl,
        githubUrl: form.githubUrl.trim(),
      });
      setEditing(false);
      setProfileNotice('Profile updated. Your byline on existing posts was updated too.');
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordNotice('');

    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password matches your current one.');
      return;
    }

    setChangingPassword(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordNotice('Password changed. You stay signed in on this device.');
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  // While editing, the picture follows the URL box as it's typed — a preview
  // is the only way to tell a working image link from a broken one before save.
  const previewSrc =
    (editing ? form.avatarUrl.trim() : user.avatarUrl) || DEFAULT_AVATAR(user.username);
  const suspended = user.status === 'suspended';

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dark-800 dark:text-dark-100">
            Your account
          </h1>
          <p className="mt-1 text-sm text-dark-500">
            Manage the details readers see on your posts, and your sign-in.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/u/${user.username}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
            <FiExternalLink size={14} />
            View public profile
          </Link>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setProfileNotice('');
                setEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-dark-200 px-3 py-2 text-sm font-medium text-dark-600 transition-colors hover:bg-surface-muted dark:border-dark-700 dark:text-dark-300">
              <FiEdit2 size={14} />
              Edit profile
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className={cardClass}>
        <div className="p-6">
          <Banner tone="error">{profileError}</Banner>
          <Banner tone="success">{!editing && profileNotice}</Banner>

          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <img
                src={previewSrc}
                alt=""
                // The fallback is what an empty field renders as anyway, so a
                // broken URL lands on the same picture rather than a torn icon.
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_AVATAR(user.username);
                }}
                className="h-24 w-24 rounded-full border border-dark-200 object-cover ring-4 ring-primary-100 dark:border-dark-700 dark:ring-primary-950"
              />
              {editing && form.avatarUrl.trim() && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, avatarUrl: '' })}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-dark-500 transition-colors hover:bg-surface-muted hover:text-dark-700 dark:hover:text-dark-200">
                  <FiRotateCcw size={12} />
                  Use default
                </button>
              )}
            </div>

            <div className="w-full flex-1">
              {editing ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="name" className={labelClass}>
                      Display name
                    </label>
                    <input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      disabled={saving}
                      placeholder={user.username}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-dark-400">
                      Shown as your byline. Falls back to @{user.username} when empty.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="avatarUrl" className={labelClass}>
                      Avatar URL
                    </label>
                    <input
                      id="avatarUrl"
                      type="url"
                      inputMode="url"
                      value={form.avatarUrl}
                      onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                      disabled={saving}
                      placeholder="https://example.com/me.jpg"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-dark-400">
                      Link to an image you host. Leave empty for a generated avatar.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="bio" className={labelClass}>
                        Bio
                      </label>
                      <span
                        className={`text-xs ${
                          form.bio.length > BIO_LIMIT ? 'text-danger-600' : 'text-dark-400'
                        }`}>
                        {form.bio.length}/{BIO_LIMIT}
                      </span>
                    </div>
                    <textarea
                      id="bio"
                      rows={3}
                      // Enforced here as well as by the schema's maxlength, so
                      // the limit is visible while typing rather than a 400 on
                      // save.
                      maxLength={BIO_LIMIT}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      disabled={saving}
                      placeholder="A sentence or two about what you write."
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="websiteUrl" className={labelClass}>
                        Portfolio
                      </label>
                      <input
                        id="websiteUrl"
                        type="url"
                        inputMode="url"
                        value={form.websiteUrl}
                        onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                        disabled={saving}
                        placeholder="https://yoursite.dev"
                        className={inputClass}
                      />
                      <p className="mt-1 text-xs text-dark-400">
                        Your site or portfolio. Optional.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="githubUrl" className={labelClass}>
                        GitHub
                      </label>
                      <input
                        id="githubUrl"
                        value={form.githubUrl}
                        onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                        disabled={saving}
                        placeholder="octocat"
                        className={inputClass}
                      />
                      <p className="mt-1 text-xs text-dark-400">
                        Handle or full URL — a handle expands to github.com.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="username" className={labelClass}>
                        Username
                      </label>
                      <input id="username" value={user.username} disabled className={inputClass} />
                      <p className="mt-1 text-xs text-dark-400">
                        Fixed — it's your profile URL and the byline on posts you've published.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="email" className={labelClass}>
                        Email
                      </label>
                      <input id="email" value={user.email} disabled className={inputClass} />
                      <p className="mt-1 text-xs text-dark-400">
                        Your sign-in — contact an admin to change it.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center sm:text-left">
                  <h2 className="font-heading text-xl font-bold text-dark-800 dark:text-dark-100">
                    {user.name || user.username}
                  </h2>
                  <p className="text-sm text-dark-500">@{user.username}</p>
                  <p className="mt-0.5 text-sm text-dark-600 dark:text-dark-300">{user.email}</p>
                  {user.bio ? (
                    <p className="mt-3 text-sm text-dark-600 dark:text-dark-300">{user.bio}</p>
                  ) : (
                    <p className="mt-3 text-sm italic text-dark-400">
                      No bio yet — readers see this under your name on your profile.
                    </p>
                  )}
                  {user.websiteUrl || user.githubUrl ? (
                    <ProfileLinks
                      websiteUrl={user.websiteUrl}
                      githubUrl={user.githubUrl}
                      className="mt-3 justify-center sm:justify-start"
                    />
                  ) : (
                    <p className="mt-3 text-sm italic text-dark-400">
                      No portfolio or GitHub link yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-dark-200 px-6 py-5 dark:border-dark-700">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-heading text-base font-bold text-dark-800 dark:text-dark-100">
              Account details
            </h3>
            {editing && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dark-200 px-3 py-2 text-sm font-medium text-dark-600 transition-colors hover:bg-surface-muted disabled:opacity-60 dark:border-dark-700 dark:text-dark-300">
                  <FiX size={14} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? <FiLoader size={14} className="animate-spin" /> : <FiSave size={14} />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Detail label="Role">{ROLE_LABEL[user.role] ?? user.role}</Detail>
            <Detail label="Status">
              <span
                className={`inline-flex items-center gap-1.5 ${
                  suspended
                    ? 'text-danger-600 dark:text-danger-400'
                    : 'text-success-700 dark:text-success-400'
                }`}>
                {suspended ? <FiSlash size={14} /> : <FiCheckCircle size={14} />}
                {suspended ? 'Suspended' : 'Active'}
              </span>
            </Detail>
            <Detail label="Member since">{formatDate(user.createdAt)}</Detail>
            <Detail label="Username">@{user.username}</Detail>
          </dl>
        </div>
      </form>

      <form onSubmit={handlePasswordSubmit} className={`${cardClass} mt-6 p-6`}>
        <h3 className="font-heading text-base font-bold text-dark-800 dark:text-dark-100">
          Change password
        </h3>
        <p className="mb-5 mt-1 text-sm text-dark-500">
          You'll stay signed in on this device after changing it.
        </p>

        <Banner tone="error">{passwordError}</Banner>
        <Banner tone="success">{passwordNotice}</Banner>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="currentPassword" className={labelClass}>
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              disabled={changingPassword}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="newPassword" className={labelClass}>
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              disabled={changingPassword}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              disabled={changingPassword}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={changingPassword}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
          {changingPassword ? (
            <FiLoader size={14} className="animate-spin" />
          ) : (
            <FiLock size={14} />
          )}
          {changingPassword ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
};

export default Account;
