// ============================================
// SIDEBAR COMPONENT - Matching MCL Portal Style
// ============================================

import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  ClipboardList,
  FileText,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logoutUser } from '@/services/authService';
import type { UserRole } from '@/types';
import { formatRole, getInitials } from '@/utils/helpers';
import { toast } from 'sonner';
import MCLLogo from '@/components/ui/MCLLogo';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  // Admin
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { path: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { path: '/admin/departments', label: 'Departments', icon: Building2, roles: ['admin'] },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { path: '/admin/notices', label: 'Notices', icon: Bell, roles: ['admin'] },
  
  // HR
  { path: '/hr/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['hr'] },
  { path: '/hr/employees', label: 'Employees', icon: Users, roles: ['hr'] },
  { path: '/hr/verifications', label: 'Verifications', icon: CheckSquare, roles: ['hr'] },
  { path: '/hr/reports', label: 'Reports', icon: FileText, roles: ['hr'] },
  
  // General Manager
  { path: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['general_manager'] },
  { path: '/manager/assignments', label: 'Assignments', icon: Users, roles: ['general_manager'] },
  { path: '/manager/departments', label: 'Departments', icon: Building2, roles: ['general_manager'] },
  { path: '/manager/reports', label: 'Reports', icon: BarChart3, roles: ['general_manager'] },
  
  // Supervisor
  { path: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['supervisor'] },
  { path: '/supervisor/team', label: 'My Team', icon: Users, roles: ['supervisor'] },
  { path: '/supervisor/work-tracking', label: 'Work Tracking', icon: ClipboardList, roles: ['supervisor'] },
  { path: '/supervisor/reports', label: 'Reports', icon: FileText, roles: ['supervisor'] },
  
  // Project Manager
  { path: '/pm/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['project_manager'] },
  { path: '/pm/projects', label: 'Projects', icon: FolderKanban, roles: ['project_manager'] },
  { path: '/pm/tasks', label: 'Tasks', icon: CheckSquare, roles: ['project_manager'] },
  { path: '/pm/team', label: 'Team', icon: Users, roles: ['project_manager'] },
  { path: '/pm/work-submissions', label: 'Work Submissions', icon: ClipboardList, roles: ['project_manager'] },
  { path: '/pm/reports', label: 'Reports', icon: FileText, roles: ['project_manager'] },
  
  // Employee
  { path: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['employee'] },
  { path: '/employee/projects', label: 'My Projects', icon: FolderKanban, roles: ['employee'] },
  { path: '/employee/tasks', label: 'My Tasks', icon: CheckSquare, roles: ['employee'] },
  { path: '/employee/work-log', label: 'Work Log', icon: ClipboardList, roles: ['employee'] },
  { path: '/employee/reports', label: 'Reports', icon: FileText, roles: ['employee'] },
  
  // Intern/Apprentice
  { path: '/intern/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['intern', 'apprentice'] },
  { path: '/intern/tasks', label: 'My Tasks', icon: CheckSquare, roles: ['intern', 'apprentice'] },
  { path: '/intern/updates', label: 'Daily Updates', icon: ClipboardList, roles: ['intern', 'apprentice'] },
  { path: '/intern/progress', label: 'Progress', icon: BarChart3, roles: ['intern', 'apprentice'] },
];

const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const filteredNavItems = navItems.filter(item =>
    userData?.role && item.roles.includes(userData.role)
  );

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full z-50 flex flex-col shadow-xl"
      style={{ backgroundColor: '#144c41' }}
    >
      {/* MCL Logo Header — exact match with reference screenshot */}
      <div className="relative flex items-center justify-center py-6 border-b border-white/10 w-full min-h-[88px]">
        {!isCollapsed ? (
          <div className="bg-white rounded-xl p-3 shadow-md flex items-center justify-center w-[75%] max-w-[160px]">
            <MCLLogo className="h-10 w-auto" />
          </div>
        ) : (
          <div className="bg-white rounded-md p-2 shadow-sm flex items-center justify-center">
            <MCLLogo className="h-6 w-auto" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="absolute right-3 p-1 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-white/80" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white/80" />
          )}
        </button>
      </div>

      {/* Navigation — simple text links like reference */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-0.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 transition-all duration-150 rounded ${
                      isActive
                        ? 'bg-black/15 text-white font-medium'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm whitespace-nowrap">{item.label}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* No bottom logo as per requirement */}

      {/* User Profile — compact */}
      <div className="px-3 py-3 border-t border-white/15">
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-white/20 text-white">
            {getInitials(userData?.name || '')}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs text-white truncate">
                {userData?.name}
              </p>
              <p className="text-[10px] text-white/60 truncate">
                {formatRole(userData?.role || '')}
              </p>
            </div>
          )}
          
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-red-300 transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
