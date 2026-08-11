import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { landingFor } from '../lib/roleLanding';

// `roles` narrows a route to specific account types. Without it the route only
// requires a session, which is the right rule for most of the app.
//
// A signed-in account that isn't allowed goes to its own landing page rather
// than to /login — it isn't a missing session, and bouncing someone to a login
// form they're already past reads as the app being broken. Hiding the entry
// point in the header is not a guard on its own: /post/new can be typed.
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={landingFor(user.role)} replace />;

  return children;
};

export default ProtectedRoute;
