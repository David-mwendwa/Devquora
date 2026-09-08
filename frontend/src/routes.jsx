import { lazy } from 'react';

// Every page is loaded on demand. Before this the app shipped as one file, so
// a reader landing on an article downloaded the markdown editor, the admin
// dashboard and the charting code before anything appeared on screen.
//
// `route()` wraps React.lazy with a preload hook. The wrapper matters for the
// prerendered pages: hydration has to find the same markup the build wrote,
// and a bare React.lazy component renders its Suspense fallback on the first
// pass — which does not match, so React throws the server HTML away and the
// page blanks before it repaints. main.jsx preloads the current route's chunk
// and only then hydrates; once the module is in `loaded`, the wrapper renders
// it synchronously and the first paint survives.
const loaded = new Map();

const route = (key, factory) => {
  const Lazy = lazy(factory);
  const Component = (props) => {
    const Ready = loaded.get(key);
    return Ready ? <Ready {...props} /> : <Lazy {...props} />;
  };
  Component.preload = () =>
    factory().then((mod) => {
      loaded.set(key, mod.default);
      return mod;
    });
  return Component;
};

export const Home = route('home', () => import('./pages/Home.jsx'));
export const Explore = route('explore', () => import('./pages/Explore.jsx'));
export const About = route('about', () => import('./pages/About.jsx'));
export const PostView = route('post-view', () => import('./pages/PostView.jsx'));
export const Editor = route('editor', () => import('./pages/Editor.jsx'));
export const Profile = route('profile', () => import('./pages/Profile.jsx'));
export const Account = route('account', () => import('./pages/Account.jsx'));
export const Activity = route('activity', () => import('./pages/Activity.jsx'));
export const Login = route('login', () => import('./pages/Login.jsx'));
export const Signup = route('signup', () => import('./pages/Signup.jsx'));
export const Dashboard = route('dashboard', () => import('./pages/Dashboard.jsx'));
export const NotFound = route('not-found', () => import('./pages/NotFound.jsx'));

// Only the routes the build prerenders need preloading — they are the only
// ones whose first paint comes from HTML rather than from React. Anything else
// mounts into an empty root, where a Suspense fallback is correct behaviour.
const PRELOADERS = {
  '/': Home,
  '/explore': Explore,
  '/about': About,
  '/login': Login,
  '/signup': Signup,
  '/404': NotFound,
};

export const preloadRoute = (pathname) => {
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const match = PRELOADERS[key] || NotFound;
  return match.preload().catch(() => {});
};
