import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { landingFor } from '../lib/roleLanding';

// The mirror of ProtectedRoute: /login and /signup only make sense when you're
// signed out. Someone already authenticated gets sent to the same place a fresh
// login would have taken them, so the two paths can't disagree.
//
// `replace` matters here — without it the login page stays in history and the
// back button bounces the user straight back into this redirect.
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to={landingFor(user.role)} replace />;

  return children;
};

export default GuestRoute;
