// ============================================
// PM REPORTS — WEEKLY CALENDAR-BASED WITH EXPORT
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Calendar, ChevronLeft, ChevronRight, Users, CheckCircle, Clock, ClipboardList } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getProjectsByManager, getTasksByProject, getDailyWorkByEmployee, getAllUsers } from '@/services/firestoreService';
import type { Task, DailyWork, User } from '@/types';
import { toast } from 'sonner';
import { getInitials, getAvatarColor } from '@/utils/helpers';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getWeeksOfMonth = (year: number, month: number) => {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let weekStart = new Date(firstDay);
  let weekNum = 1;
  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
    if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());
    weekEnd.setHours(23, 59, 59, 999);
    weeks.push({ start: new Date(weekStart), end: new Date(weekEnd), label: `Week ${weekNum} (${weekStart.getDate()}-${weekEnd.getDate()} ${SHORT_MONTHS[month]})` });
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
    weekStart.setHours(0, 0, 0, 0);
    weekNum++;
  }
  return weeks;
};

const PMReports: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyWork, setDailyWork] = useState<DailyWork[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [projects, allUsers] = await Promise.all([
        getProjectsByManager(userData!.uid),
        getAllUsers()
      ]);
      const employees = allUsers.filter(u => ['employee', 'intern', 'apprentice'].includes(u.role));
      setTeamMembers(employees);

      const taskResults = await Promise.all(projects.map(p => getTasksByProject(p.id)));
      const allTasks = taskResults.flat();
      setTasks(allTasks);

      // Get unique employee IDs from tasks
      const empIds = [...new Set(allTasks.map(t => t.employeeId))];
      const workResults = await Promise.all(empIds.map(id => getDailyWorkByEmployee(id)));
      setDailyWork(workResults.flat());
    } catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  const weeks = useMemo(() => getWeeksOfMonth(calYear, calMonth), [calYear, calMonth]);

  // Weekly data per team member
  const weeklyData = useMemo(() => {
    const empIds = [...new Set(tasks.map(t => t.employeeId))];
    return weeks.map(week => {
      const memberRows = empIds.map(empId => {
        const member = teamMembers.find(m => m.uid === empId);
        const empTasks = tasks.filter(t => t.employeeId === empId);
        const weekWork = dailyWork.filter(w => {
          const d = new Date(w.date);
          return w.employeeId === empId && d >= week.start && d <= week.end;
        });
        const completedInWeek = empTasks.filter(t => {
          if (t.status !== 'completed' || !t.completedAt) return false;
          const d = new Date(t.completedAt);
          return d >= week.start && d <= week.end;
        }).length;
        const hoursLogged = weekWork.reduce((a, w) => a + (w.hoursWorked || 0), 0);
        return {
          name: member?.name || tasks.find(t => t.employeeId === empId)?.employeeName || 'Unknown',
          uid: empId,
          totalTasks: empTasks.length,
          completedInWeek,
          pendingTasks: empTasks.filter(t => t.status === 'pending').length,
          inProgressTasks: empTasks.filter(t => t.status === 'in_progress').length,
          hoursLogged,
          submissions: weekWork.length,
          workDetails: weekWork.map(w => w.description).join('; ')
        };
      });
      return {
        weekLabel: week.label,
        members: memberRows,
        totalCompleted: memberRows.reduce((a, r) => a + r.completedInWeek, 0),
        totalHours: memberRows.reduce((a, r) => a + r.hoursLogged, 0)
      };
    });
  }, [weeks, tasks, dailyWork, teamMembers]);

  // Chart data
  const chartData = weeklyData.map((wd, i) => ({
    week: `W${i + 1}`,
    completed: wd.totalCompleted,
    hours: wd.totalHours,
    submissions: wd.members.reduce((a, m) => a + m.submissions, 0)
  }));

  // Export
  const handleExport = () => {
    let csv = `Project Manager Report — ${MONTHS[calMonth]} ${calYear}\n\n`;
    weeklyData.forEach(wd => {
      csv += `\n${wd.weekLabel}\n`;
      csv += 'Member,Total Tasks,Completed (Week),In Progress,Pending,Hours Logged,Work Done\n';
      wd.members.forEach(m => {
        csv += `"${m.name}",${m.totalTasks},${m.completedInWeek},${m.inProgressTasks},${m.pendingTasks},${m.hoursLogged},"${m.workDetails}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PM_Report_${SHORT_MONTHS[calMonth]}_${calYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Project Reports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Weekly team performance analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4" />{MONTHS[calMonth]} {calYear}
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
                        className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${calMonth === i ? 'bg-teal-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{m}</button>
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { label: 'Team Members', value: [...new Set(tasks.map(t => t.employeeId))].length, icon: Users, color: 'bg-blue-500' },
                { label: 'Total Tasks', value: tasks.length, icon: ClipboardList, color: 'bg-purple-500' },
                { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle, color: 'bg-green-500' },
                { label: 'Pending', value: tasks.filter(t => t.status !== 'completed').length, icon: Clock, color: 'bg-orange-500' }
              ].map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-5 h-5 text-white" /></div>
                  <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p><p className="text-sm text-gray-500">{s.label}</p></div>
                </motion.div>
              ))}
            </div>

            {/* Weekly Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Weekly Overview — {MONTHS[calMonth]} {calYear}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tasks completed and hours logged per week</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="hours" fill="#3b82f6" name="Hours" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="submissions" fill="#8b5cf6" name="Submissions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Weekly Detail Tables */}
            {weeklyData.map((wd, wi) => (
              <motion.div key={wi} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: wi * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 bg-teal-50 dark:bg-teal-900/10 flex items-center justify-between">
                  <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">{wd.weekLabel}</span>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />{wd.totalCompleted} completed</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" />{wd.totalHours}h logged</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                      {['Member','Total Tasks','Completed (Week)','In Progress','Pending','Hours','Work Done'].map(h => (
                        <th key={h} className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {wd.members.map(m => (
                        <tr key={m.uid} className="border-b border-gray-50 dark:border-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(m.name)}`}>{getInitials(m.name)}</div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{m.totalTasks}</td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{m.completedInWeek}</span></td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{m.inProgressTasks}</span></td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{m.pendingTasks}</span></td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">{m.hoursLogged}h</td>
                          <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">{m.workDetails || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
export default PMReports;
