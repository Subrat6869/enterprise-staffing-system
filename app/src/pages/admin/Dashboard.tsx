// ============================================
// ADMIN DASHBOARD
// ============================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDashboardAnalytics } from '@/services/firestoreService';
import type { Analytics } from '@/types';
import { formatNumber } from '@/utils/helpers';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

const AdminDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [analytics, setAnalytics] = useState<Partial<Analytics>>({});
  const [, setIsLoading] = useState(true);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadAnalytics();
  }, []);

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
    }
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
              <button 
                onClick={() => navigate('/admin/users')}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      New employee registered
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      John Doe joined the Engineering department
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">2 hours ago</span>
                </div>
              ))}
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

        {/* Department Overview */}
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
            <div className="flex items-center gap-3">
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Department
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Employees
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Projects
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Progress
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {['Engineering', 'Design', 'Marketing', 'Sales', 'HR']
                  .filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase()))
                  .map((dept, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-teal-600" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{dept}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {20 + index * 5}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {5 + index}
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${60 + index * 10}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
