import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

/**
 * Route protection wrapper enforcing authentication and role permissions
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Verifying authentication session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2">
          Your account role (<code className="font-mono font-semibold text-red-700 bg-red-50 px-1 py-0.5 rounded">{user.role}</code>) does not have permission to view this section.
        </p>
      </div>
    );
  }

  return children;
}
