// ============================================
// GENERAL MANAGER DASHBOARD — SUMMARY-ONLY VIEW
// Area-scoped aggregated metrics, no detailed task lists
// ============================================

import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  FolderKanban,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
  ClipboardList,
  MapPin
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
  getUsersByArea,
  getDepartmentsByArea,
  getTeamsByArea,
  getTasksByArea,
  getProjectsByArea,
  getRecentActivities
} from '@/services/firestoreService';
import type { User, Project, Department, Task, Team, ActivityLog } from '@/types';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/helpers';
import { formatArea } from '@/data/areaData';
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
  const gmAreaCode = userData?.areaCode || '';

  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [, setIsLoading] = useState(true);

  // Hierarchy expand state
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Calendar state for monthly progress
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [showCalendar, setShowCalendar] = useState(false);
  const [quickRange, setQuickRange] = useState<'3m'|'6m'|'1y'>('6m');
  const calBtnRef = useRef<HTMLButtonElement>(null);
  const [calStyle, setCalStyle] = useState<React.CSSProperties>({});

  const updateCalPosition = useCallback(() => {
    if (!calBtnRef.current) return;
    const rect = calBtnRef.current.getBoundingClientRect();
    const sw = window.innerWidth;
    if (sw < 640) {
      const w = sw - 24;
      setCalStyle({ left: `${12 - rect.left}px`, right: 'auto', width: `${w}px` });
    } else {
      setCalStyle({});
    }
  }, []);

  useEffect(() => {
    if (showCalendar) {
      updateCalPosition();
      window.addEventListener('resize', updateCalPosition);
      return () => window.removeEventListener('resize', updateCalPosition);
    }
  }, [showCalendar, updateCalPosition]);

  useEffect(() => { if (gmAreaCode) loadData(); }, [gmAreaCode]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, projectsData, departmentsData, teamsData, tasksData, activityData] = await Promise.all([
        getUsersByArea(gmAreaCode),
        getProjectsByArea(gmAreaCode),
        getDepartmentsByArea(gmAreaCode),
        getTeamsByArea(gmAreaCode),
        getTasksByArea(gmAreaCode),
        getRecentActivities(30)
      ]);
      setUsers(usersData);
      setProjects(projectsData);
      setDepartments(departmentsData);
      setTeams(teamsData);
      setTasks(tasksData);
      // Filter activity logs to only show this area's users
      const areaUserIds = new Set(usersData.map(u => u.uid));
      setRecentActivity(activityData.filter(a => areaUserIds.has(a.userId)).slice(0, 10));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // AGGREGATED SUMMARY METRICS (no raw task lists)
  // ============================================

  const totalEmployees = users.filter(u => ['employee','intern','apprentice','supervisor'].includes(u.role)).length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Department-wise aggregated summary
  const deptSummary = useMemo(() => {
    return departments.map(dept => {
      const deptTasks = tasks.filter(t => t.departmentId === dept.id);
      const deptTeams = teams.filter(t => t.departmentId === dept.id);
      const deptMembers = users.filter(u => u.departmentId === dept.id);
      const completed = deptTasks.filter(t => t.status === 'completed').length;
      const total = deptTasks.length;
      return {
        id: dept.id,
        name: dept.name,
        totalTasks: total,
        completed,
        inProgress: deptTasks.filter(t => t.status === 'in_progress').length,
        pending: deptTasks.filter(t => t.status === 'pending').length,
        completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
        teamCount: deptTeams.length,
        memberCount: deptMembers.length
      };
    });
  }, [departments, tasks, teams, users]);

  // Team-wise aggregated summary
  const teamSummary = useMemo(() => {
    return teams.map(team => {
      const teamTasks = tasks.filter(t => t.teamId === team.id);
      const teamMembers = users.filter(u => u.teamId === team.id);
      const completed = teamTasks.filter(t => t.status === 'completed').length;
      const total = teamTasks.length;
      return {
        id: team.id,
        name: team.name,
        departmentName: team.departmentName || '',
        departmentId: team.departmentId,
        totalTasks: total,
        completed,
        inProgress: teamTasks.filter(t => t.status === 'in_progress').length,
        pending: teamTasks.filter(t => t.status === 'pending').length,
        completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
        memberCount: teamMembers.length
      };
    });
  }, [teams, tasks, users]);

  // Task status pie data
  const taskStatusPie = [
    { name: 'Pending', value: pendingTasks, color: '#f59e0b' },
    { name: 'In Progress', value: inProgressTasks, color: '#3b82f6' },
    { name: 'Completed', value: completedTasks, color: '#10b981' }
  ];

  // Department-wise chart data
  const deptChartData = deptSummary.map(d => ({
    name: d.name.length > 10 ? d.name.substring(0, 10) + '…' : d.name,
    Completed: d.completed,
    'In Progress': d.inProgress,
    Pending: d.pending
  }));

  // Monthly progress trend
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

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId); else next.add(deptId);
      return next;
    });
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId); else next.add(teamId);
      return next;
    });
  };

  // Format relative time for activity
  const formatRelativeTime = (timestamp: any): string => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Guard: GM must have areaCode
  if (!gmAreaCode) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Area Assigned</h2>
            <p className="text-gray-500 dark:text-gray-400">Your account does not have an area code assigned. Please contact the Admin to assign you to an area.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            General Manager Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {userData?.name}. Area summary overview.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
              {formatArea(userData?.areaCode, userData?.areaName)}
            </span>
          </div>
        </div>

        {/* ============================================
            TASK SUMMARY CARDS — Primary aggregated metrics
            ============================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { title: 'Total Tasks', value: totalTasks, icon: ClipboardList, color: 'bg-gray-600', textColor: 'text-gray-900 dark:text-white' },
            { title: 'Pending', value: pendingTasks, icon: Clock, color: 'bg-amber-500', textColor: 'text-amber-600' },
            { title: 'In Progress', value: inProgressTasks, icon: AlertCircle, color: 'bg-blue-500', textColor: 'text-blue-600' },
            { title: 'Completed', value: completedTasks, icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-600' },
            { title: 'Completion', value: `${completionRate}%`, icon: TrendingUp, color: 'bg-teal-500', textColor: 'text-teal-600' },
            { title: 'Members', value: totalEmployees, icon: Users, color: 'bg-purple-500', textColor: 'text-purple-600' }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</p>
                  <p className="text-[11px] text-gray-400">{stat.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ============================================
            COMPLETION PROGRESS BAR
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Area Task Completion</h3>
            <span className="text-2xl font-bold text-teal-600">{completionRate}%</span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{completedTasks} of {totalTasks} tasks completed</span>
            <span>{pendingTasks} pending · {inProgressTasks} in progress</span>
          </div>
        </motion.div>

        {/* ============================================
            CHARTS ROW — Task Distribution + Dept Breakdown
            ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Task Status Distribution (Pie) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Task Status Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={taskStatusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                    {taskStatusPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-5 mt-4">
              {taskStatusPie.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Department Work Breakdown (Stacked Bar) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Department Task Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* ============================================
            DEPARTMENT-WISE SUMMARY TABLE (aggregated, not detailed)
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Department-wise Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  {['Department','Teams','Members','Tasks','Completed','In Progress','Pending','Completion'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptSummary.map(d => (
                  <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{d.name}</td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{d.teamCount}</td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{d.memberCount}</td>
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{d.totalTasks}</td>
                    <td className="py-4 px-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{d.completed}</span></td>
                    <td className="py-4 px-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{d.inProgress}</span></td>
                    <td className="py-4 px-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{d.pending}</span></td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${d.completionPct}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.completionPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {deptSummary.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-500">No departments in this area</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ============================================
            MONTHLY PROGRESS TREND with Calendar
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Progress Trend</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {([['3m','3 Months'],['6m','6 Months'],['1y','12 Months']] as const).map(([key, label]) => (
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
              <div className="relative">
                <button
                  ref={calBtnRef}
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {MONTHS[calMonth]} {calYear}
                </button>
                {showCalendar && (
                  <div className="absolute right-0 mt-2 sm:w-64 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4" style={calStyle}>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => setCalYear(y => y - 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                      </button>
                      <span className="font-semibold text-gray-900 dark:text-white">{calYear}</span>
                      <button onClick={() => setCalYear(y => y + 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

        {/* ============================================
            BOTTOM ROW — Recent Activity + Area Hierarchy
            ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Recent Activity Snapshot (last 10) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                <Activity className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {recentActivity.length === 0 ? (
                <p className="text-center text-gray-400 py-6">No recent activity in your area</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.actionType.includes('COMPLETED') ? 'bg-green-50 dark:bg-green-900/20' :
                      activity.actionType.includes('CREATED') ? 'bg-blue-50 dark:bg-blue-900/20' :
                      activity.actionType.includes('UPDATED') ? 'bg-amber-50 dark:bg-amber-900/20' :
                      'bg-gray-50 dark:bg-gray-800'
                    }`}>
                      {activity.actionType.includes('COMPLETED') ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                       activity.actionType.includes('CREATED') ? <FolderKanban className="w-4 h-4 text-blue-600" /> :
                       activity.actionType.includes('UPDATED') ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                       <Activity className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-1">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400">{activity.userName}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">{formatRelativeTime(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Area Hierarchy — Expandable: Department → Team → Members */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                <Layers className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Area Hierarchy</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{departments.length} depts · {teams.length} teams · {totalEmployees} members</p>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {departments.map(dept => {
                const deptTeams = teams.filter(t => t.departmentId === dept.id);
                const deptMembers = users.filter(u => u.departmentId === dept.id);
                const isExpanded = expandedDepts.has(dept.id);

                return (
                  <div key={dept.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleDept(dept.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{dept.name}</p>
                          <p className="text-xs text-gray-500">{deptTeams.length} teams · {deptMembers.length} members</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-8 pr-4 pb-3 space-y-1">
                            {deptTeams.length === 0 && (
                              <p className="text-sm text-gray-400 py-2 pl-4">No teams</p>
                            )}
                            {deptTeams.map(team => {
                              const teamMembers = users.filter(u => u.teamId === team.id);
                              const teamExpanded = expandedTeams.has(team.id);

                              return (
                                <div key={team.id}>
                                  <button
                                    onClick={() => toggleTeam(team.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                                        <Users className="w-3 h-3 text-teal-600" />
                                      </div>
                                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{team.name}</span>
                                      <span className="text-xs text-gray-400">({teamMembers.length})</span>
                                    </div>
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${teamExpanded ? 'rotate-180' : ''}`} />
                                  </button>

                                  <AnimatePresence>
                                    {teamExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="pl-10 pr-2 py-1 space-y-1">
                                          {teamMembers.length === 0 && (
                                            <p className="text-xs text-gray-400 py-1">No members</p>
                                          )}
                                          {teamMembers.map(member => (
                                            <div key={member.uid} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                              <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{member.name}</span>
                                              </div>
                                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 capitalize">
                                                {member.role?.replace('_', ' ')}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {departments.length === 0 && (
                <p className="text-center text-gray-400 py-6">No departments found. Contact Admin to seed departments.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
