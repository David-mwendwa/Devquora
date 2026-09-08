import { FiShield, FiEdit3 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import usePageMeta from '../lib/pageMeta';
import AuthorDashboard from './dashboard/AuthorDashboard';
import AdminDashboard from './dashboard/AdminDashboard';

// This page is the author/admin work surface (manage posts, moderate users) —
// ProtectedRoute gates /dashboard to those two roles, so there's no reader
// entry here. A reader's own activity (saved posts, likes, comments) lives on
// /account instead, alongside the rest of their account info.
//
// Same role → icon/color mapping as AdminDashboard's user table, so a role reads
// the same way everywhere it appears in the app.
const ROLE_META = {
  admin: { icon: FiShield, label: 'Admin', className: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300' },
  author: { icon: FiEdit3, label: 'Author', className: 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300' },
};

const Dashboard = () => {
  usePageMeta('Dashboard', 'Your posts, drafts and readership stats.', { noindex: true });
  const { user } = useAuth();
  const roleMeta = ROLE_META[user.role];
  const RoleIcon = roleMeta.icon;

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-heading text-3xl font-bold">Welcome, {user.name}</h1>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleMeta.className}`}>
          <RoleIcon size={12} />
          {roleMeta.label}
        </span>
      </div>

      {user.role === 'author' && <AuthorDashboard />}
      {user.role === 'admin' && <AdminDashboard />}
    </div>
  );
};

export default Dashboard;
