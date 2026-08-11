import { FiExternalLink, FiGithub, FiGlobe } from 'react-icons/fi';

// The "where else to find me" row, shared by the public profile and the account
// page's read view so the two can't drift apart on order or labelling.
//
// Portfolio first, GitHub second: a portfolio is the link someone chose to
// present themselves with, and GitHub is the fallback most developers have even
// when they don't have a site. Both render when both exist — an entered link is
// never hidden — so the ordering is the only thing expressing that preference.
//
// `externalUrl` is the third case and comes from somewhere else entirely: it's
// the origin profile carried on an imported post's author snapshot (dev.to),
// for authors who have no Devquora account to have filled the other two in.

const chipClass =
  'inline-flex max-w-full items-center gap-1.5 rounded-md border border-dark-200 px-3 py-1.5 text-sm font-medium text-dark-600 transition-colors hover:border-primary-300 hover:bg-surface-muted hover:text-primary-700 dark:border-dark-700 dark:text-dark-300 dark:hover:border-primary-800 dark:hover:text-primary-400';

// A bare host + path reads as a link; the scheme and any trailing slash are
// noise once it's already styled as one.
const prettyUrl = (url) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

const Link = ({ href, icon: Icon, label }) => (
  <a href={href} target="_blank" rel="noreferrer noopener" className={chipClass}>
    <Icon size={14} className="shrink-0" />
    <span className="truncate">{label}</span>
  </a>
);

const ProfileLinks = ({ websiteUrl, githubUrl, externalUrl, className = '' }) => {
  if (!websiteUrl && !githubUrl && !externalUrl) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {websiteUrl && <Link href={websiteUrl} icon={FiGlobe} label={prettyUrl(websiteUrl)} />}
      {githubUrl && <Link href={githubUrl} icon={FiGithub} label={prettyUrl(githubUrl)} />}
      {externalUrl && (
        <Link href={externalUrl} icon={FiExternalLink} label={prettyUrl(externalUrl)} />
      )}
    </div>
  );
};

export default ProfileLinks;
