// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles
}) => {
  const { isAuthenticated, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role access
  if (allowedRoles && userData?.role) {
    if (!allowedRoles.includes(userData.role)) {
      // Redirect to appropriate dashboard based on role
      const roleRoutes: { [key: string]: string } = {
        admin: '/admin/dashboard',
        hr: '/hr/dashboard',
        general_manager: '/manager/dashboard',
        supervisor: '/supervisor/dashboard',
        project_manager: '/pm/dashboard',
        employee: '/employee/dashboard',
        intern: '/intern/dashboard',
        apprentice: '/intern/dashboard'
      };

      return <Navigate to={roleRoutes[userData.role] || '/'} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
