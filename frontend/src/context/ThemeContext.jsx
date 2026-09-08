import { createContext, useState, useEffect, useContext, useCallback } from 'react';

const ThemeContext = createContext();

// Runs as a useState initialiser, i.e. during render — which also happens in
// Node when the public pages are prerendered at build time, where none of
// these globals exist. 'light' is the right answer there: the prerendered HTML
// is theme-neutral markup, and the inline script in index.html has already put
// the correct class on <html> before this ever runs in a browser.
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
