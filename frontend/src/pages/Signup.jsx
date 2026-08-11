import { Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import AuthLayout from '../components/AuthLayout';
import usePageTitle from '../hooks/usePageTitle';

const Signup = () => {
  usePageTitle('Sign up');
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
