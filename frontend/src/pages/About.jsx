import { Link } from 'react-router-dom';
import { FiEdit3, FiCode, FiHash, FiMessageCircle, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../hooks/usePageTitle';

const FEATURES = [
  {
    icon: FiEdit3,
    title: 'Markdown-first writing',
    description:
      'A distraction-free editor built for writing, not fighting a rich-text toolbar. Write in Markdown, preview it live.',
  },
  {
    icon: FiCode,
    title: 'Code that actually looks good',
    description:
      'Fenced code blocks render with real syntax highlighting, so a snippet reads like it does in your editor.',
  },
  {
    icon: FiHash,
    title: 'Organized by topic',
    description:
      'Every post carries tags developers actually search for, so the right readers can find it in Explore.',
  },
  {
    icon: FiMessageCircle,
    title: 'Conversation, not just claps',
    description: 'Comments are threaded discussion, not a vanity metric — built for follow-up questions and answers.',
  },
];

const About = () => {
  usePageTitle('About');
  const { user } = useAuth();

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-950 dark:text-primary-300">
          About Devquora
        </span>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-dark-800 dark:text-dark-100 sm:text-4xl">
          A blogging platform built for developers who write.
        </h1>
        <p className="mt-4 text-base text-dark-500">
          Most blogging tools are built for generalists first and developers as an afterthought.
          Devquora flips that: Markdown from the first keystroke, code that renders the way it
          should, and a reading experience that respects your time.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-lg border border-dark-200 bg-surface p-5 dark:border-dark-700">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400">
              <Icon size={17} />
            </div>
            <h3 className="mb-1.5 font-heading text-base font-bold text-dark-800 dark:text-dark-100">
              {title}
            </h3>
            <p className="text-sm text-dark-500">{description}</p>
          </div>
        ))}
      </div>

      {!user && (
        <div className="mx-auto mt-14 flex max-w-2xl flex-col items-center gap-3 border-t border-dark-200 pt-10 text-center dark:border-dark-700">
          <h2 className="font-heading text-xl font-bold text-dark-800 dark:text-dark-100">
            Have something worth writing up?
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="flex items-center gap-1.5 rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
              Create your account
              <FiArrowRight size={15} />
            </Link>
            <Link
              to="/explore"
              className="flex items-center gap-1.5 rounded-md border border-dark-200 px-5 py-2.5 text-sm font-semibold text-dark-700 transition-colors hover:bg-surface-muted dark:border-dark-700 dark:text-dark-200">
              Explore posts
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default About;
