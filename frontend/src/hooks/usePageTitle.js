import { useEffect } from 'react';

// A small hook instead of react-helmet/react-helmet-async — this app only
// ever needs to set one <title> per route, so a dependency for arbitrary
// <head> management would be more than the job calls for.
const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} | Devquora` : 'Devquora';
  }, [title]);
};

export default usePageTitle;
