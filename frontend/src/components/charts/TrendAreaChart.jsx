import { useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';

// Single-series trend over time — sequential job, one hue (primary), per the
// workspace dataviz convention: sequential = safe default for "trend over time".
const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

const niceMax = (max) => {
  if (max <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
};

// data: [{ date: 'YYYY-MM-DD', [valueKey]: number }]
// unitLabel: singular noun shown in the tooltip and aria-label, e.g. "views", "posts published"
const TrendAreaChart = ({ data, valueKey = 'value', unitLabel = 'value' }) => {
  const svgRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(null);

  const { points, yTicks, plotW, plotH, yMax } = useMemo(() => {
    const plotW = WIDTH - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(...data.map((d) => d[valueKey])));
    const stepX = plotW / (data.length - 1);
    const toY = (v) => PAD.top + plotH - (v / max) * plotH;
    const points = data.map((d, i) => ({
      x: PAD.left + i * stepX,
      y: toY(d[valueKey]),
      ...d,
    }));
    const yTicks = [0, max / 2, max];
    return { points, yTicks, plotW, plotH, yMax: max };
  }, [data, valueKey]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath =
    `M${points[0].x},${PAD.top + plotH} ` +
    points.map((p) => `L${p.x},${p.y}`).join(' ') +
    ` L${points[points.length - 1].x},${PAD.top + plotH} Z`;

  const updateFromClientX = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * WIDTH;
    const stepX = plotW / (data.length - 1);
    const idx = Math.round((relX - PAD.left) / stepX);
    setActiveIndex(Math.min(Math.max(idx, 0), data.length - 1));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((i) => Math.min((i ?? -1) + 1, data.length - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((i) => Math.max((i ?? 1) - 1, 0));
    }
  };

  const active = activeIndex !== null ? points[activeIndex] : null;
  // Keep the tooltip on-screen near the right edge of the chart.
  const tooltipAlign = active && active.x > WIDTH - 140 ? 'right' : 'left';

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label={`${unitLabel} per day over the last ${data.length} days`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerMove={(e) => updateFromClientX(e.clientX)}
        onPointerLeave={() => setActiveIndex(null)}
        onBlur={() => setActiveIndex(null)}>
        {yTicks.map((t) => {
          const y = PAD.top + plotH - (t / yMax) * plotH;
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y}
                y2={y}
                className="stroke-dark-200 dark:stroke-dark-700"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-dark-400 text-[10px] tabular-nums">
                {Math.round(t).toLocaleString()}
              </text>
            </g>
          );
        })}

        {points
          .filter((_, i) => (i % 7 === 0 && points.length - 1 - i >= 4) || i === points.length - 1)
          .map((p) => (
            <text
              key={p.date}
              x={p.x}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-dark-400 text-[10px]">
              {format(parseISO(p.date), 'MMM d')}
            </text>
          ))}

        <path d={areaPath} className="fill-primary-500/10" />
        <path
          d={linePath}
          fill="none"
          className="stroke-primary-500"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD.top}
              y2={PAD.top + plotH}
              className="stroke-dark-300 dark:stroke-dark-600"
              strokeWidth="1"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="4"
              className="fill-primary-500 stroke-surface"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {active && (
        <div
          className={`pointer-events-none absolute top-2 rounded-md border border-dark-200 bg-surface px-3 py-2 text-xs shadow-card dark:border-dark-700 ${
            tooltipAlign === 'right' ? 'right-2' : 'left-2'
          }`}>
          <p className="font-semibold tabular-nums text-dark-900 dark:text-dark-50">
            {active[valueKey].toLocaleString()} {unitLabel}
          </p>
          <p className="text-dark-400">{format(parseISO(active.date), 'EEEE, MMM d')}</p>
        </div>
      )}
    </div>
  );
};

export default TrendAreaChart;
