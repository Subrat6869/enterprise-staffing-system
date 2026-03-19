// ============================================
// GM REPORTS - DEPARTMENT-WISE DETAILED ANALYTICS
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, Calendar, ChevronLeft, ChevronRight, Building2, Users, ClipboardList, CheckCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllProjects, getAllUsers, getAllDepartments, getAllTasks } from '@/services/firestoreService';
import type { User, Project, Department, Task } from '@/types';
import { toast } from 'sonner';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ManagerReports: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [p, u, d, t] = await Promise.all([getAllProjects(), getAllUsers(), getAllDepartments(), getAllTasks()]);
      setProjects(p); setUsers(u); setDepartments(d); setTasks(t);
    } catch { toast.error('Failed to load data'); }
    finally { setIsLoading(false); }
  };

  // Filter tasks by selected month/year
  const filteredTasks = useMemo(() => {
    const start = new Date(calYear, calMonth, 1);
    const end = new Date(calYear, calMonth + 1, 0, 23, 59, 59);
    return tasks.filter(t => {
      const d = t.dueDate ? new Date(t.dueDate) : t.createdAt ? new Date(t.createdAt) : null;
      return d && d >= start && d <= end;
    });
  }, [tasks, calYear, calMonth]);

  // Department-wise breakdown
  const deptBreakdown = useMemo(() => {
    return departments.map(dept => {
      const deptUsers = users.filter(u => u.departmentId === dept.id);
      const deptProjects = projects.filter(p => p.departmentId === dept.id);
      const deptTasks = filteredTasks.filter(t => {
        const taskProject = projects.find(p => p.id === t.projectId);
        return taskProject?.departmentId === dept.id;
      });
      const completed = deptTasks.filter(t => t.status === 'completed').length;
      const inProgress = deptTasks.filter(t => t.status === 'in_progress').length;
      const pending = deptTasks.filter(t => t.status === 'pending').length;
      const total = deptTasks.length;
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        name: dept.name,
        id: dept.id,
        employees: deptUsers.length,
        projects: deptProjects.length,
        totalTasks: total,
        completed,
        inProgress,
        pending,
        completionPct
      };
    });
  }, [departments, users, projects, filteredTasks]);

  // Summary stats
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length;

  // Chart data for stacked bar
  const chartData = deptBreakdown.map(d => ({
    name: d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name,
    Completed: d.completed,
    'In Progress': d.inProgress,
    Pending: d.pending
  }));

  // Status pie data
  const statusPie = [
    { name: 'Completed', value: completedTasks, color: '#10b981' },
    { name: 'In Progress', value: inProgressTasks, color: '#3b82f6' },
    { name: 'Pending', value: pendingTasks, color: '#f59e0b' }
  ];

  // Export CSV
  const handleExport = () => {
    const header = 'Department,Employees,Projects,Total Tasks,Completed,In Progress,Pending,Completion %\n';
    const rows = deptBreakdown.map(d =>
      `"${d.name}",${d.employees},${d.projects},${d.totalTasks},${d.completed},${d.inProgress},${d.pending},${d.completionPct}%`
    ).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GM_Report_${MONTHS[calMonth]}_${calYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Monthly Reports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Department-wise performance analysis</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Calendar Picker */}
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Calendar className="w-4 h-4" />
                {MONTHS[calMonth]} {calYear}
              </button>
              {showCalendar && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-72">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setCalYear(y => y - 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
                    <span className="font-semibold text-gray-900 dark:text-white">{calYear}</span>
                    <button onClick={() => setCalYear(y => y + 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SHORT_MONTHS.map((m, i) => (
                      <button key={m} onClick={() => { setCalMonth(i); setShowCalendar(false); }}
                        className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${calMonth === i ? 'bg-teal-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium">
              <Download className="w-4 h-4" />Export Report
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Tasks', value: totalTasks, icon: ClipboardList, color: 'bg-blue-500' },
                { label: 'Completed', value: completedTasks, icon: CheckCircle, color: 'bg-green-500' },
                { label: 'In Progress', value: inProgressTasks, icon: Users, color: 'bg-indigo-500' },
                { label: 'Pending', value: pendingTasks, icon: Building2, color: 'bg-orange-500' }
              ].map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-5 h-5 text-white" /></div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Work Breakdown */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Work Done vs Pending by Department</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{MONTHS[calMonth]} {calYear}</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Status Pie */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Overall Task Distribution</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{MONTHS[calMonth]} {calYear}</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={statusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {statusPie.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{s.name} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Department-wise Detailed Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Department-wise Detailed Report — {MONTHS[calMonth]} {calYear}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      {['Department','Employees','Projects','Total Tasks','Completed','In Progress','Pending','Completion %'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deptBreakdown.map(d => (
                      <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{d.name}</td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{d.employees}</td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{d.projects}</td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{d.totalTasks}</td>
                        <td className="py-4 px-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{d.completed}</span></td>
                        <td className="py-4 px-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{d.inProgress}</span></td>
                        <td className="py-4 px-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{d.pending}</span></td>
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
                    {deptBreakdown.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-gray-500">No data available for the selected period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerReports;
