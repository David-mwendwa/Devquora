// Minimal inline trend for a stat tile: past points in the de-emphasis hue,
// the most recent segment in the accent so the reader sees "where it's headed."
const Sparkline = ({ data, width = 72, height = 24 }) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const toY = (v) => height - ((v - min) / range) * height;

  const points = data.map((v, i) => [i * stepX, toY(v)]);
  const path = (pts) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  const pastPoints = points.slice(0, -1);
  const recentPoints = points.slice(-2); // last segment, drawn in accent

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <path
        d={path(pastPoints)}
        fill="none"
        className="stroke-dark-300 dark:stroke-dark-600"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path(recentPoints)}
        fill="none"
        className="stroke-primary-500"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="3"
        className="fill-primary-500 stroke-surface"
        strokeWidth="2"
      />
    </svg>
  );
};

export default Sparkline;
