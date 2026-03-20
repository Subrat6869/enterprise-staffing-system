// ============================================
// EMPLOYEE REPORTS — DAILY & WEEKLY DETAILED WITH EXPORT
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Download, Calendar, ChevronLeft, ChevronRight, CheckCircle, Clock, ClipboardList, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getTasksByEmployee, getDailyWorkByEmployee } from '@/services/firestoreService';
import type { Task, DailyWork } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/utils/helpers';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const getWeeksOfMonth = (year: number, month: number) => {
  const weeks: { start: Date; end: Date; label: string; num: number }[] = [];
  const lastDay = new Date(year, month + 1, 0);
  let weekStart = new Date(year, month, 1);
  let weekNum = 1;
  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
    if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());
    weekEnd.setHours(23, 59, 59, 999);
    weeks.push({ start: new Date(weekStart), end: new Date(weekEnd), label: `Week ${weekNum} (${weekStart.getDate()}-${weekEnd.getDate()} ${SHORT_MONTHS[month]})`, num: weekNum });
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
    weekStart.setHours(0, 0, 0, 0);
    weekNum++;
  }
  return weeks;
};

const EmployeeReports: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workHistory, setWorkHistory] = useState<DailyWork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportView, setReportView] = useState<'daily' | 'weekly'>('weekly');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [showCalendar, setShowCalendar] = useState(false);
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

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [t, w] = await Promise.all([getTasksByEmployee(userData!.uid), getDailyWorkByEmployee(userData!.uid)]);
      setTasks(t);
      setWorkHistory(w);
    } catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  const taskStats = useMemo(() => ({
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    total: tasks.length
  }), [tasks]);

  const pieData = [
    { name: 'Completed', value: taskStats.completed },
    { name: 'In Progress', value: taskStats.inProgress },
    { name: 'Pending', value: taskStats.pending }
  ].filter(d => d.value > 0);

  // Weekly report data
  const weeks = useMemo(() => getWeeksOfMonth(calYear, calMonth), [calYear, calMonth]);
  const weeklyReport = useMemo(() => {
    return weeks.map(week => {
      const weekWork = workHistory.filter(w => {
        const d = new Date(w.date);
        return d >= week.start && d <= week.end;
      });
      const tasksCompletedThisWeek = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        const d = new Date(t.completedAt);
        return d >= week.start && d <= week.end;
      });
      return {
        ...week,
        hoursLogged: weekWork.reduce((a, w) => a + (w.hoursWorked || 0), 0),
        submissions: weekWork.length,
        tasksCompleted: tasksCompletedThisWeek.length,
        workEntries: weekWork.map(w => ({
          date: w.date,
          hours: w.hoursWorked,
          description: w.description,
          accomplishments: w.accomplishments,
          project: w.projectName || 'General',
          task: w.taskTitle || '-'
        }))
      };
    });
  }, [weeks, workHistory, tasks]);

  // Daily report data
  const dailyReport = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const days: { date: string; day: string; hours: number; entries: DailyWork[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calYear, calMonth, d);
      const dayWork = workHistory.filter(w => new Date(w.date).toDateString() === date.toDateString());
      if (dayWork.length > 0) {
        days.push({
          date: formatDate(date),
          day: date.toLocaleDateString('en', { weekday: 'short' }),
          hours: dayWork.reduce((a, w) => a + (w.hoursWorked || 0), 0),
          entries: dayWork
        });
      }
    }
    return days;
  }, [workHistory, calYear, calMonth]);

  // Chart data
  const chartData = weeklyReport.map((wr, i) => ({
    week: `W${i + 1}`,
    hours: wr.hoursLogged,
    tasks: wr.tasksCompleted,
    submissions: wr.submissions
  }));

  const monthWorked = workHistory.filter(w => {
    const d = new Date(w.date);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  });
  const totalMonthHours = monthWorked.reduce((a, w) => a + (w.hoursWorked || 0), 0);

  // Export
  const handleExport = () => {
    let csv = `Employee Report — ${userData?.name} — ${MONTHS[calMonth]} ${calYear}\n\n`;
    if (reportView === 'weekly') {
      weeklyReport.forEach(wr => {
        csv += `\n${wr.label}\nTotal Hours: ${wr.hoursLogged}, Tasks Completed: ${wr.tasksCompleted}, Submissions: ${wr.submissions}\n`;
        csv += 'Date,Hours,Project,Task,Description,Accomplishments\n';
        wr.workEntries.forEach(e => {
          csv += `"${formatDate(e.date)}",${e.hours},"${e.project}","${e.task}","${e.description}","${e.accomplishments || ''}"\n`;
        });
      });
    } else {
      csv += 'Date,Day,Hours,Description,Project,Task\n';
      dailyReport.forEach(dr => {
        dr.entries.forEach(e => {
          csv += `"${dr.date}","${dr.day}",${e.hoursWorked},"${e.description}","${e.projectName || 'General'}","${e.taskTitle || '-'}"\n`;
        });
      });
    }
    csv += `\n\nSummary\nTotal Hours: ${totalMonthHours}\nTotal Tasks: ${taskStats.total}\nCompleted: ${taskStats.completed}\nIn Progress: ${taskStats.inProgress}\nPending: ${taskStats.pending}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Employee_Report_${SHORT_MONTHS[calMonth]}_${calYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Reports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Personal performance — daily & weekly analysis</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Report view toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <button onClick={() => setReportView('daily')}
                className={`px-3 py-2 text-sm font-medium ${reportView === 'daily' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}>Daily</button>
              <button onClick={() => setReportView('weekly')}
                className={`px-3 py-2 text-sm font-medium ${reportView === 'weekly' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}>Weekly</button>
            </div>
            {/* Calendar */}
            <div className="relative">
              <button ref={calBtnRef} onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4" />{MONTHS[calMonth]} {calYear}
              </button>
              {showCalendar && (
                <div className="absolute right-0 top-full mt-2 sm:w-72 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4" style={calStyle}>
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setCalYear(y => y - 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="font-semibold text-gray-900 dark:text-white">{calYear}</span>
                    <button onClick={() => setCalYear(y => y + 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SHORT_MONTHS.map((m, i) => (
                      <button key={m} onClick={() => { setCalMonth(i); setShowCalendar(false); }}
                        className={`px-2 py-2 rounded-lg text-sm font-medium ${calMonth === i ? 'bg-teal-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{m}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium">
              <Download className="w-4 h-4" />Export
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Tasks', value: taskStats.total, icon: ClipboardList, color: 'bg-purple-500' },
                { label: 'Completed', value: taskStats.completed, icon: CheckCircle, color: 'bg-green-500' },
                { label: 'In Progress', value: taskStats.inProgress, icon: Clock, color: 'bg-blue-500' },
                { label: `Hours (${SHORT_MONTHS[calMonth]})`, value: totalMonthHours.toFixed(1), icon: TrendingUp, color: 'bg-teal-500' }
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${s.color}`}><s.icon className="w-5 h-5 text-white" /></div>
                  <div><p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weekly Chart */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Weekly Overview</h3>
                <p className="text-sm text-gray-500 mb-4">{MONTHS[calMonth]} {calYear}</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Bar dataKey="hours" fill="#0d9488" name="Hours" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="tasks" fill="#10b981" name="Tasks Done" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="submissions" fill="#8b5cf6" name="Submissions" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Pie Chart */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Distribution</h3>
                {pieData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-center text-gray-500 py-8">No task data</p>}
              </motion.div>
            </div>

            {/* Detailed Report Tables */}
            {reportView === 'weekly' ? (
              <div className="space-y-4">
                {weeklyReport.map((wr, wi) => (
                  <motion.div key={wi} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: wi * 0.05 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 bg-teal-50 dark:bg-teal-900/10 flex items-center justify-between">
                      <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">{wr.label}</span>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{wr.hoursLogged}h logged</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />{wr.tasksCompleted} completed</span>
                        <span>{wr.submissions} submissions</span>
                      </div>
                    </div>
                    {wr.workEntries.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                            {['Date','Hours','Project','Task','Description','Accomplishments'].map(h => (
                              <th key={h} className="text-left py-2 px-4 text-xs font-medium text-gray-500">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {wr.workEntries.map((e, ei) => (
                              <tr key={ei} className="border-b border-gray-50 dark:border-gray-800/30">
                                <td className="py-2.5 px-4 text-sm text-gray-700 dark:text-gray-300">{formatDate(e.date)}</td>
                                <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{e.hours}h</span></td>
                                <td className="py-2.5 px-4 text-sm text-gray-600 dark:text-gray-400">{e.project}</td>
                                <td className="py-2.5 px-4 text-sm text-gray-600 dark:text-gray-400">{e.task}</td>
                                <td className="py-2.5 px-4 text-xs text-gray-500 max-w-xs truncate">{e.description}</td>
                                <td className="py-2.5 px-4 text-xs text-gray-500 max-w-xs truncate">{e.accomplishments || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-6 py-4 text-center text-sm text-gray-400">No work logged this week</div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Daily View */
              <div className="space-y-3">
                {dailyReport.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-gray-500">No work logged in {MONTHS[calMonth]} {calYear}</p>
                  </div>
                ) : (
                  dailyReport.map((dr, di) => (
                    <motion.div key={di} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.02 }}
                      className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{dr.date}</span>
                          <span className="text-xs text-gray-400">{dr.day}</span>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{dr.hours}h total</span>
                      </div>
                      {dr.entries.map((e, ei) => (
                        <div key={ei} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 mt-2">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{e.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{e.hoursWorked}h</span>
                            {e.projectName && <span className="text-teal-600">{e.projectName}</span>}
                            {e.accomplishments && <span className="text-green-600">✓ {e.accomplishments}</span>}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
export default EmployeeReports;
