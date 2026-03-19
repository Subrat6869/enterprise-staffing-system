// ============================================
// ROLE ACCESS HOOK
// ============================================

import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

// Role hierarchy (higher index = higher permission)
const roleHierarchy: UserRole[] = [
  'intern',
  'apprentice',
  'employee',
  'project_manager',
  'supervisor',
  'hr',
  'general_manager',
  'admin'
];

export const useRoleAccess = () => {
  const { userData, hasRole } = useAuth();

  const getRoleLevel = (role: UserRole): number => {
    return roleHierarchy.indexOf(role);
  };

  const currentRoleLevel = userData ? getRoleLevel(userData.role) : -1;

  const canAccess = (requiredRoles: UserRole[]): boolean => {
    return hasRole(requiredRoles);
  };

  const isHigherOrEqualRole = (role: UserRole): boolean => {
    if (!userData) return false;
    return currentRoleLevel >= getRoleLevel(role);
  };

  const isAdmin = (): boolean => {
    return userData?.role === 'admin';
  };

  const isHR = (): boolean => {
    return userData?.role === 'hr';
  };

  const isManager = (): boolean => {
    return ['general_manager', 'supervisor', 'project_manager'].includes(userData?.role || '');
  };

  const isEmployee = (): boolean => {
    return ['employee', 'intern', 'apprentice'].includes(userData?.role || '');
  };

  const canManageUsers = (): boolean => {
    return ['admin', 'hr', 'general_manager'].includes(userData?.role || '');
  };

  const canManageProjects = (): boolean => {
    return ['admin', 'general_manager', 'project_manager'].includes(userData?.role || '');
  };

  const canAssignTasks = (): boolean => {
    return ['admin', 'project_manager', 'supervisor'].includes(userData?.role || '');
  };

  const canViewReports = (): boolean => {
    return ['admin', 'hr', 'general_manager', 'supervisor'].includes(userData?.role || '');
  };

  const canSubmitWork = (): boolean => {
    return ['employee', 'intern', 'apprentice'].includes(userData?.role || '');
  };

  return {
    canAccess,
    isHigherOrEqualRole,
    isAdmin,
    isHR,
    isManager,
    isEmployee,
    canManageUsers,
    canManageProjects,
    canAssignTasks,
    canViewReports,
    canSubmitWork,
    currentRole: userData?.role,
    roleLevel: currentRoleLevel
  };
};

export default useRoleAccess;
