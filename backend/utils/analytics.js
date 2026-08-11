// Shared helpers for the dashboard trend charts. Everything is keyed by UTC day
// ('YYYY-MM-DD') — the same key Post.dailyViews uses — so a viewer's timezone
// can never shift a hit into a neighbouring bucket.

export const dayKey = (date) => date.toISOString().slice(0, 10);

export const todayKey = () => dayKey(new Date());

// The last `days` UTC day keys, oldest first, ending today.
export const recentDayKeys = (days) => {
  const keys = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    keys.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
};

// Days with no traffic are absent from dailyViews entirely — the chart needs a
// zero there, not a gap, or the x-axis silently compresses quiet stretches.
export const buildViewsSeries = (posts, days) =>
  recentDayKeys(days).map((date) => ({
    date,
    views: posts.reduce((sum, post) => sum + (post.dailyViews?.get?.(date) || 0), 0),
  }));

export const sumSeries = (series, key = 'views') =>
  series.reduce((sum, point) => sum + (point[key] || 0), 0);

// A percentage change against a zero baseline is undefined, not infinite — the
// StatCard renders no delta at all in that case rather than a bogus "+100%".
export const percentDelta = (current, prior, period = 'vs last 30 days') => {
  if (!prior) return null;
  return { value: Math.round(((current - prior) / prior) * 1000) / 10, unit: '%', period };
};
