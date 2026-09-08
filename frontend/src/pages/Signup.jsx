import { Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import AuthLayout from '../components/AuthLayout';
import usePageMeta from '../lib/pageMeta';

const Signup = () => {
  usePageMeta('Sign up', 'Create a Devquora account to publish markdown posts, join discussions and build a reading list.');
  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Free, and takes less than a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:underline">
            Log in
          </Link>
        </>
      }>
      <AuthForm mode="signup" />
    </AuthLayout>
  );
};

export default Signup;
