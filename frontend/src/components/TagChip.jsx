import { Link } from 'react-router-dom';

const TagChip = ({ tag }) => (
  <Link
    to={`/explore?tag=${encodeURIComponent(tag)}`}
    className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-950 dark:text-primary-300">
    #{tag}
  </Link>
);

export default TagChip;
