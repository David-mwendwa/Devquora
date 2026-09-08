import { useEffect, useState } from 'react';
import { API_AWAKE_EVENT, API_SLOW_EVENT } from '../api/apiClient';

// The API is on Render's free plan, which stops the container after a period of
// inactivity and cold-starts it on the next request — measured at 22 seconds.
// For that whole time the app looks broken rather than slow, and the honest fix
// (paying for an always-on instance) is not available here. Saying what is
// happening costs one small pill and turns a dead page into a wait.
const WakingNotice = () => {
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    const show = () => setWaking(true);
    const hide = () => setWaking(false);
    window.addEventListener(API_SLOW_EVENT, show);
    window.addEventListener(API_AWAKE_EVENT, hide);
    return () => {
      window.removeEventListener(API_SLOW_EVENT, show);
      window.removeEventListener(API_AWAKE_EVENT, hide);
    };
  }, []);

  if (!waking) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <p className="flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm text-primary-900 shadow-card dark:border-primary-800 dark:bg-primary-950 dark:text-primary-100">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
        Waking the server — the free tier sleeps, so this first load takes a few seconds
      </p>
    </div>
  );
};

export default WakingNotice;
