import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Explore from './pages/Explore';
import About from './pages/About';
import PostView from './pages/PostView';
import Editor from './pages/Editor';
import Profile from './pages/Profile';
import Account from './pages/Account';
import Activity from './pages/Activity';
import NotFound from './pages/NotFound';

// Authoring is withheld from the reader role; admins are included because they
// can already manage anyone's post. Mirrors the guard on POST /api/v1/posts —
// this one is the UX, that one is the enforcement.
const WRITER_ROLES = ['author', 'admin'];
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';

function App() {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Header />
            <main className="min-h-[calc(100vh-14rem)]">
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
            </main>
            <Footer />
          </AuthProvider>
        </BrowserRouter>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;
