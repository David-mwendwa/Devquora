import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

const ErrorState = ({ message = "Couldn't load this content.", onRetry }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-danger-200 py-16 text-center dark:border-danger-900">
    <FiAlertCircle size={24} className="text-danger-500" />
    <p className="text-sm text-dark-500">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-md border border-dark-200 px-3 py-1.5 text-sm font-medium text-dark-600 hover:bg-surface-muted dark:border-dark-700">
        <FiRefreshCw size={13} />
        Try again
      </button>
    )}
  </div>
);

export default ErrorState;
