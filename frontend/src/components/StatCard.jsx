import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import Sparkline from './charts/Sparkline';

// delta: { value, unit?, period, goodDirection? } — goodDirection defaults to 'up'
// (more views/posts is good); pass 'down' for stats where lower is better.
const StatCard = ({ label, value, hint, delta, trend }) => {
  const isFlat = delta && delta.value === 0;
  const isUp = delta && delta.value > 0;
  const goodDirection = delta?.goodDirection ?? 'up';
  const isGood = isFlat ? null : isUp === (goodDirection === 'up');

  return (
    <div className="rounded-lg border border-dark-200 bg-surface p-4 shadow-card dark:border-dark-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-dark-400">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight">{value}</p>
        </div>
        {trend && <Sparkline data={trend} />}
      </div>

      {delta && !isFlat && (
        <p
          className={`mt-2 flex items-center gap-1 text-xs font-medium ${
            isGood ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
          }`}>
          {isUp ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
          {Math.abs(delta.value)}
          {delta.unit ?? ''} <span className="font-normal text-dark-400">{delta.period}</span>
        </p>
      )}
      {delta && isFlat && <p className="mt-2 text-xs text-dark-400">No change {delta.period}</p>}
      {!delta && hint && <p className="mt-1 text-xs text-dark-400">{hint}</p>}
    </div>
  );
};

export default StatCard;
