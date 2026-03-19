// ============================================
// GENERAL MANAGER DASHBOARD
// ============================================

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  FolderKanban,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getAllUsers, getAllProjects, getAllDepartments, getAllTasks } from '@/services/firestoreService';
import type { User, Project, Department, Task } from '@/types';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/helpers';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ManagerDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [, setIsLoading] = useState(true);

  // Calendar state for monthly progress
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth()); // 0-indexed end month
  const [showCalendar, setShowCalendar] = useState(false);
  const [quickRange, setQuickRange] = useState<'3m'|'6m'|'1y'>('6m');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, projectsData, departmentsData, tasksData] = await Promise.all([
        getAllUsers(), getAllProjects(), getAllDepartments(), getAllTasks()
      ]);
      setUsers(usersData);
      setProjects(projectsData);
      setDepartments(departmentsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const totalEmployees = users.filter(u => ['employee','intern','apprentice'].includes(u.role)).length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const averageProgress = projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length) : 0;

  // Chart data
  const departmentData = departments.map(dept => ({
    name: dept.name,
    employees: users.filter(u => u.departmentId === dept.id).length,
    projects: projects.filter(p => p.departmentId === dept.id).length
  }));

  const projectStatusData = [
    { name: 'Active', value: projects.filter(p => p.status === 'active').length, color: '#10b981' },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: '#3b82f6' },
    { name: 'Planning', value: projects.filter(p => p.status === 'planning').length, color: '#f59e0b' },
    { name: 'On Hold', value: projects.filter(p => p.status === 'on_hold').length, color: '#ef4444' }
  ];

  // Dynamic monthly progress data based on selected range
  const monthlyProgressData = useMemo(() => {
    const rangeMonths = quickRange === '3m' ? 3 : quickRange === '6m' ? 6 : 12;
    const data: { month: string; completed: number; pending: number; inProgress: number }[] = [];

    for (let i = rangeMonths - 1; i >= 0; i--) {
      let m = calMonth - i;
      let y = calYear;
      while (m < 0) { m += 12; y--; }

      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);
      const label = `${MONTHS[m]} ${y}`;

      // Count tasks whose dueDate or createdAt falls in this month
      const monthTasks = tasks.filter(t => {
        const d = t.dueDate ? new Date(t.dueDate) : t.createdAt ? new Date(t.createdAt) : null;
        return d && d >= monthStart && d <= monthEnd;
      });

      data.push({
        month: label,
        completed: monthTasks.filter(t => t.status === 'completed').length,
        pending: monthTasks.filter(t => t.status === 'pending').length,
        inProgress: monthTasks.filter(t => t.status === 'in_progress').length
      });
    }
    return data;
  }, [tasks, calYear, calMonth, quickRange]);

  const handleQuickRange = (range: '3m'|'6m'|'1y') => {
    setQuickRange(range);
    setCalYear(new Date().getFullYear());
    setCalMonth(new Date().getMonth());
  };

  const stats = [
    { title: 'Total Employees', value: formatNumber(totalEmployees), change: 8, icon: Users, color: 'bg-blue-500' },
    { title: 'Active Projects', value: formatNumber(activeProjects), change: 12, icon: FolderKanban, color: 'bg-green-500' },
    { title: 'Departments', value: formatNumber(departments.length), change: 0, icon: Building2, color: 'bg-purple-500' },
    { title: 'Avg Progress', value: `${averageProgress}%`, change: 5, icon: TrendingUp, color: 'bg-orange-500' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            General Manager Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {userData?.name}. Overview of company performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
                  {stat.change !== 0 && (
                    <div className={`flex items-center gap-1 mt-2 ${stat.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span className="text-sm font-medium">{Math.abs(stat.change)}%</span>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Department Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Department Performance</h3>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Bar dataKey="employees" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="projects" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Project Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Status</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {projectStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Monthly Progress Trend with Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Progress Trend</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Quick Range Buttons */}
                {([['3m','Last 3 Months'],['6m','Last 6 Months'],['1y','Last Year']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleQuickRange(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      quickRange === key
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                {/* Calendar Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {MONTHS[calMonth]} {calYear}
                  </button>

                  {showCalendar && (
                    <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64">
                      {/* Year Selector */}
                      <div className="flex items-center justify-between mb-3">
                        <button onClick={() => setCalYear(y => y - 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                          <ChevronLeft className="w-4 h-4 text-gray-500" />
                        </button>
                        <span className="font-semibold text-gray-900 dark:text-white">{calYear}</span>
                        <button onClick={() => setCalYear(y => y + 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      {/* Month Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {MONTHS.map((m, i) => (
                          <button
                            key={m}
                            onClick={() => { setCalMonth(i); setShowCalendar(false); }}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              calMonth === i
                                ? 'bg-teal-600 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} angle={-20} textAnchor="end" height={50} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" fill="#3b82f6" name="In Progress" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Projects</h3>
              <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">View All</button>
            </div>
            <div className="space-y-4">
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{project.name}</p>
                    <p className="text-xs text-gray-500">{project.departmentName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{project.progress}%</p>
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
