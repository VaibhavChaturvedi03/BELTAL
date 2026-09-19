import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#060D1A]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#1E5FA8] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 mt-4 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is allowed
  const userRole = user.role?.toUpperCase();
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/403" replace />;
  }

  // This component is used as a route wrapper in App.jsx. Nested routes are
  // rendered through React Router's Outlet rather than a `children` prop.
  return <Outlet />;
}
