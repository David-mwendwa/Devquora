import { useCallback, useEffect, useState } from 'react';
import getErrorMessage from '../utils/getErrorMessage';

// Load-once-then-render plumbing shared by the three dashboards: status, error
// text, a retry, and a setter so an action (suspend, unpublish, delete) can
// patch the loaded data in place instead of refetching the whole screen.
//
// `loader` must be stable — wrap it in useCallback at the call site, or pass a
// module-level function; an inline arrow re-runs the fetch on every render.
const useAsyncData = (loader) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setStatus('loading');
    loader()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [loader]);

  useEffect(load, [load]);

  return { data, setData, status, error, reload: load };
};

export default useAsyncData;
