import { Link } from 'react-router-dom';
import { FiExternalLink } from 'react-icons/fi';
import Logo from './Logo';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-dark-200 bg-background/80 backdrop-blur-sm dark:border-dark-700">
      <div className="container flex flex-col items-center justify-between gap-2 py-4 text-[11px] text-dark-500 sm:flex-row sm:text-xs md:text-sm">
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-center leading-snug sm:justify-start sm:text-left">
          <Logo textClassName="text-xs sm:text-sm" />
          <span className="hidden text-dark-300 sm:inline">&middot;</span>
          <span className="text-[11px] text-dark-500 sm:text-xs md:text-sm">
            built for developers who write
          </span>
          <span className="text-dark-300">&middot;</span>
          <Link
            to="/about"
            className="text-[11px] font-medium text-dark-500 transition-colors hover:text-primary-600 sm:text-xs md:text-sm">
            About
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 leading-snug sm:justify-end sm:gap-4">
          <span className="text-dark-400">&copy; {year}</span>
          <span className="text-dark-400">
            Developed by{' '}
            <a
              href="https://techdave.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary-600 transition-colors duration-150 hover:text-primary-500">
              David
              <FiExternalLink size={12} aria-hidden="true" />
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
