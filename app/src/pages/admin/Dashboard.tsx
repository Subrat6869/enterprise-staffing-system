// ============================================
// ADMIN DASHBOARD (with Real-Time Activity Feed)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  FolderKanban,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Plus,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  LogIn,
  LogOut,
  Shield,
  Upload,
  ClipboardList,
  Bell,
  Settings,
  RefreshCw,
  Filter,
  XCircle,
  ChevronDown,
  MapPin,
  Layers
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDashboardAnalytics, getRecentActivities, getDepartmentsByArea, getAllDepartments, getAllTeams } from '@/services/firestoreService';
import type { Analytics, ActivityLog, ActivityModule, ActivityActionType, Department } from '@/types';
import { formatNumber } from '@/utils/helpers';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AREAS, getAreaName } from '@/data/areaData';

// ============================================
// ACTIVITY ICON / COLOR MAPPING
// ============================================

const getActivityConfig = (actionType: ActivityActionType): {
  icon: React.ElementType;
  color: string;
  bgColor: string;
} => {
  switch (actionType) {
    case 'USER_REGISTERED':
      return { icon: UserPlus, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
    case 'USER_BULK_UPLOADED':
      return { icon: Upload, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-100 dark:bg-violet-900/30' };
    case 'USER_UPDATED':
    case 'ROLE_CHANGED':
      return { icon: Settings, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' };
    case 'USER_DELETED':
      return { icon: UserMinus, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' };
    case 'USER_ACTIVATED':
      return { icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' };
    case 'USER_DEACTIVATED':
      return { icon: UserX, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' };
    case 'USER_APPROVED':
      return { icon: Shield, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' };
    case 'USER_REJECTED':
      return { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' };
    case 'TASK_CREATED':
    case 'TASK_ASSIGNED':
    case 'TASK_UPDATED':
    case 'TASK_COMPLETED':
      return { icon: ClipboardList, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' };
    case 'PROJECT_CREATED':
    case 'PROJECT_UPDATED':
      return { icon: FolderKanban, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' };
    case 'DEPARTMENT_CREATED':
    case 'DEPARTMENT_UPDATED':
      return { icon: Building2, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/30' };
    case 'NOTICE_CREATED':
      return { icon: Bell, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30' };
    case 'LOGIN_SUCCESS':
      return { icon: LogIn, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' };
    case 'LOGIN_FAILED':
      return { icon: LogIn, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' };
    case 'LOGOUT':
      return { icon: LogOut, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700' };
    default:
      return { icon: Settings, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700' };
  }
};

const getModuleBadge = (module: ActivityModule): { label: string; className: string } => {
  switch (module) {
    case 'User':
      return { label: 'User', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'Auth':
      return { label: 'Auth', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    case 'Task':
      return { label: 'Task', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'Project':
      return { label: 'Project', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'Department':
      return { label: 'Dept', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' };
    case 'Notice':
      return { label: 'Notice', className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' };
    default:
      return { label: module, className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' };
  }
};

// ============================================
// TIME AGO HELPER
// ============================================

const formatTimeAgo = (timestamp: any): string => {
  if (!timestamp) return 'just now';

  let date: Date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp?.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  color: string;
}

const StatsCard = ({ title, value, change, icon: Icon, color }: StatsCardProps) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {value}
        </h3>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
            <span className="text-xs text-gray-400">vs last month</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const AdminDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [analytics, setAnalytics] = useState<Partial<Analytics & { totalTeams?: number; totalAreas?: number; usersPerArea?: Record<string, number>; teamsPerDepartment?: Record<string, number> }>>({});
  const [, setIsLoading] = useState(true);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptTeamCounts, setDeptTeamCounts] = useState<Record<string, number>>({});
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [deptAreaFilter, setDeptAreaFilter] = useState<string>('all');
  const navigate = useNavigate();

  const loadActivities = useCallback(async () => {
    try {
      setIsLoadingActivities(true);
      const data = await getRecentActivities(30);
      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    loadActivities();
    loadDepartments();

    // Auto-refresh activity feed every 30 seconds
    const interval = setInterval(() => {
      loadActivities();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadActivities]);

  // Reload departments when area filter changes
  useEffect(() => {
    loadDepartments();
  }, [deptAreaFilter]);

  const loadDepartments = async () => {
    try {
      let data: Department[];
      if (deptAreaFilter === 'all') {
        data = await getAllDepartments();
      } else {
        data = await getDepartmentsByArea(deptAreaFilter);
      }
      setDepartments(data);

      // Load team counts for each department
      const allTeams = await getAllTeams();
      const counts: Record<string, number> = {};
      allTeams.forEach(t => {
        counts[t.departmentId] = (counts[t.departmentId] || 0) + 1;
      });
      setDeptTeamCounts(counts);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await getDashboardAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      title: 'Total Employees',
      value: formatNumber(analytics.totalEmployees || 0),
      change: 12,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Departments',
      value: formatNumber(analytics.totalDepartments || 0),
      change: 5,
      icon: Building2,
      color: 'bg-purple-500'
    },
    {
      title: 'Active Projects',
      value: formatNumber(analytics.activeProjects || 0),
      change: -3,
      icon: FolderKanban,
      color: 'bg-orange-500'
    },
    {
      title: 'Tasks Completed',
      value: formatNumber(analytics.completedTasks || 0),
      change: 18,
      icon: CheckSquare,
      color: 'bg-green-500'
    },
    {
      title: 'Total Teams',
      value: formatNumber((analytics as any).totalTeams || 0),
      icon: Layers,
      color: 'bg-indigo-500'
    },
    {
      title: 'Active Areas',
      value: formatNumber((analytics as any).totalAreas || 0),
      icon: MapPin,
      color: 'bg-rose-500'
    }
  ];

  const filteredActivities = moduleFilter === 'all'
    ? activities
    : activities.filter(a => a.module === moduleFilter);

  const modules: { value: string; label: string }[] = [
    { value: 'all', label: 'All Modules' },
    { value: 'User', label: 'User Management' },
    { value: 'Auth', label: 'Authentication' },
    { value: 'Task', label: 'Tasks' },
    { value: 'Project', label: 'Projects' },
    { value: 'Department', label: 'Departments' },
    { value: 'Notice', label: 'Notices' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {userData?.name}. Here's what's happening today.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add User</span>
            </button>
          </div>
        </div>

        {/* Stats Grid — 6 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatsCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            {/* Activity Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">
                  Live
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Module Filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Filter className="w-3 h-3" />
                    {modules.find(m => m.value === moduleFilter)?.label || 'All'}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <AnimatePresence>
                    {showFilterDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20"
                      >
                        {modules.map(m => (
                          <button
                            key={m.value}
                            onClick={() => { setModuleFilter(m.value); setShowFilterDropdown(false); }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              moduleFilter === m.value
                                ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-medium'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={loadActivities}
                  disabled={isLoadingActivities}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-teal-600 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingActivities ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Activity List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {isLoadingActivities ? (
                // Skeleton loader
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {moduleFilter !== 'all' ? 'No activities in this module' : 'No activity recorded yet'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Activities will appear here as users perform actions
                  </p>
                </div>
              ) : (
                filteredActivities.slice(0, 20).map((activity, idx) => {
                  const config = getActivityConfig(activity.actionType);
                  const moduleBadge = getModuleBadge(activity.module);
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`flex items-start gap-3 p-3.5 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/70 ${
                        activity.status === 'failed'
                          ? 'bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30'
                          : 'bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {/* Module Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${moduleBadge.className}`}>
                            {moduleBadge.label}
                          </span>
                          {/* Status Badge */}
                          {activity.status === 'failed' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              Failed
                            </span>
                          )}
                          {/* Role Badge */}
                          {activity.userRole && activity.userRole !== 'unknown' && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              by {activity.userRole.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap mt-0.5">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              {[
                { label: 'Add New User', icon: Users, color: 'bg-blue-500', path: '/admin/users' },
                { label: 'Create Department', icon: Building2, color: 'bg-purple-500', path: '/admin/departments' },
                { label: 'Post Notice', icon: CheckSquare, color: 'bg-green-500', path: '/admin/notices' },
                { label: 'Generate Report', icon: TrendingUp, color: 'bg-orange-500', path: '/admin/analytics' }
              ].map((action, index) => (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Department Overview — REAL DATA with Area Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Department Overview
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Area Filter */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                <select
                  value={deptAreaFilter}
                  onChange={(e) => setDeptAreaFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
                >
                  <option value="all">All Areas</option>
                  {AREAS.map(area => (
                    <option key={area.code} value={area.code}>
                      {area.code} — {area.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {departments.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Area</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Employees</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Teams</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments
                    .filter(dept => (dept.name || '').toLowerCase().includes(departmentSearch.toLowerCase()))
                    .map((dept) => {
                      const teamCount = deptTeamCounts[dept.id] || 0;
                      const teamLimit = dept.teamLimit || 3;
                      return (
                    <tr key={dept.id} className="border-b border-gray-100 dark:border-gray-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-teal-600" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{dept.name}</span>
                            {dept.headName && (
                              <p className="text-xs text-gray-400">Head: {dept.headName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {dept.areaCode ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium" title={dept.areaName || getAreaName(dept.areaCode)}>
                            {dept.areaCode}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Global</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                        {dept.employeeCount || 0}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{teamCount}</span>
                          <span className="text-xs text-gray-400">/ {teamLimit}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button 
                          onClick={() => navigate('/admin/departments')}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No departments found{deptAreaFilter !== 'all' ? ' for this area' : ''}</p>
                <button
                  onClick={() => navigate('/admin/departments')}
                  className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  + Create Department
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
