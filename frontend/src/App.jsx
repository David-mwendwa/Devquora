import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import WakingNotice from './components/WakingNotice';
import {
  Home,
  Explore,
  About,
  PostView,
  Editor,
  Profile,
  Account,
  Activity,
  Login,
  Signup,
  Dashboard,
  NotFound,
} from './routes.jsx';

// Authoring is withheld from the reader role; admins are included because they
// can already manage anyone's post. Mirrors the guard on POST /api/v1/posts —
// this one is the UX, that one is the enforcement.
const WRITER_ROLES = ['author', 'admin'];

// The router is a parameter rather than a fixed <BrowserRouter> because this
// same tree is rendered twice: by main.jsx in the browser, and by
// scripts/prerender.mjs under a MemoryRouter at build time. Defining the
// providers once is the point — a prerendered page assembled from a
// second, hand-kept copy of this tree drifts from the real app the first time
// a provider is added, and the failure shows up as a hydration mismatch that
// blanks the page rather than as anything obviously wrong here.
function App({ router: Router, routerProps }) {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <Router {...routerProps}>
          <AuthProvider>
            <ScrollToTop />
            <WakingNotice />
            <Header />
            <main className="min-h-[calc(100vh-14rem)]">
              {/* The fallback is deliberately empty: every page renders its own
                  skeleton, and a spinner that flashes for the ~20ms a chunk takes
                  on a warm connection reads as jank rather than as progress. */}
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/about" element={<About />} />
                  <Route
                    path="/post/new"
                    element={
                      <ProtectedRoute roles={WRITER_ROLES}>
                        <Editor />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/post/:slug" element={<PostView />} />
                  <Route
                    path="/post/:id/edit"
                    element={
                      <ProtectedRoute roles={WRITER_ROLES}>
                        <Editor />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/u/:username"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <Account />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/activity"
                    element={
                      <ProtectedRoute>
                        <Activity />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <GuestRoute>
                        <Login />
                      </GuestRoute>
                    }
                  />
                  <Route
                    path="/signup"
                    element={
                      <GuestRoute>
                        <Signup />
                      </GuestRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute roles={WRITER_ROLES}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  {/* Last, and deliberately unguarded — an unknown URL is a dead
                      link for everyone, signed in or not. */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </AuthProvider>
        </Router>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;
