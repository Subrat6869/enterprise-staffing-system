// ============================================
// EMPLOYEE TASKS — WITH WEEKLY/MONTHLY WORK LOG
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Calendar, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getTasksByEmployee, updateTask, getDailyWorkByEmployee } from '@/services/firestoreService';
import type { Task, DailyWork } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/utils/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EmployeeTasks: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workHistory, setWorkHistory] = useState<DailyWork[]>([]);
  // const [stats, setStats] = useState<any>(null);
  // const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [logView, setLogView] = useState<'weekly' | 'monthly'>('weekly');
  const [logMonth, setLogMonth] = useState(new Date().getMonth());
  const [logYear, setLogYear] = useState(new Date().getFullYear());

  // Task Status Update State
  const [statusUpdate, setStatusUpdate] = useState<{task: Task, newStatus: string} | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try {
      // setIsLoading(true); // Commented out as per instruction
      const [t, w] = await Promise.all([
        getTasksByEmployee(userData!.uid),
        getDailyWorkByEmployee(userData!.uid)
      ]);
      setTasks(t);
      setWorkHistory(w);
    } catch { toast.error('Failed to load'); }
    finally { /* setIsLoading(false); */ } // Commented out as per instruction
  };

  const confirmStatusChange = async () => {
    if (!statusUpdate) return;
    try {
      setIsUpdating(true);
      const { task, newStatus } = statusUpdate;
      const update: any = { status: newStatus, updatedAt: new Date() };
      if (newStatus === 'completed') { update.progress = 100; update.completedAt = new Date(); }
      else if (newStatus === 'in_progress') update.progress = 50;
      else update.progress = 0;
      
      if (statusComment.trim()) {
        update.employeeComment = statusComment.trim();
      }
      
      await updateTask(task.id, update);
      toast.success('Status updated');
      setStatusUpdate(null);
      setStatusComment('');
      loadData();
    } catch { toast.error('Update failed'); }
    finally { setIsUpdating(false); }
  };

  const filtered = tasks.filter(t => statusFilter === 'all' || t.status === statusFilter);

  // Work log data
  const weeklyLogData = useMemo(() => {
    const daysInMonth = new Date(logYear, logMonth + 1, 0).getDate();
    const weeks: { label: string; hours: number; entries: number; tasks: number }[] = [];
    let weekStart = 1;
    let weekNum = 1;
    while (weekStart <= daysInMonth) {
      const weekEnd = Math.min(weekStart + 6, daysInMonth);
      const weekWork = workHistory.filter(w => {
        const d = new Date(w.date);
        return d.getFullYear() === logYear && d.getMonth() === logMonth && d.getDate() >= weekStart && d.getDate() <= weekEnd;
      });
      weeks.push({
        label: `W${weekNum} (${weekStart}-${weekEnd})`,
        hours: weekWork.reduce((a, w) => a + (w.hoursWorked || 0), 0),
        entries: weekWork.length,
        tasks: [...new Set(weekWork.map(w => w.taskId).filter(Boolean))].length
      });
      weekStart = weekEnd + 1;
      weekNum++;
    }
    return weeks;
  }, [workHistory, logYear, logMonth]);

  const monthlyLogData = useMemo(() => {
    return MONTHS.map((_name, i) => {
      const monthWork = workHistory.filter(w => {
        const d = new Date(w.date);
        return d.getFullYear() === logYear && d.getMonth() === i;
      });
      return {
        month: SHORT_MONTHS[i],
        hours: monthWork.reduce((a, w) => a + (w.hoursWorked || 0), 0),
        entries: monthWork.length
      };
    });
  }, [workHistory, logYear]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View, update tasks, and track your work log</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${statusFilter === s ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {s === 'all' ? `All (${tasks.length})` : `${s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} (${tasks.filter(t => t.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        {/* {isLoading ? ( // Commented out as per instruction */}
        {false ? ( // Replaced with false to avoid rendering loading state if isLoading is commented out
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{task.projectName}</p>
                  </div>
                  <select value={task.status} onChange={e => {
                      if (e.target.value !== task.status) {
                        setStatusUpdate({ task, newStatus: e.target.value });
                        setStatusComment(task.employeeComment || '');
                      }
                    }}
                    className="text-sm px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                    <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="text-sm text-gray-500">{task.progress}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.priority && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{task.priority}</span>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="w-4 h-4" /><span>{formatDate(task.dueDate)}</span></div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Work Log Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />Work Log — {logView === 'weekly' ? `${MONTHS[logMonth]} ${logYear}` : logYear}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Hours tracked on {logView} basis</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <button onClick={() => setLogView('weekly')}
                  className={`px-3 py-1.5 text-xs font-medium ${logView === 'weekly' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}>Weekly</button>
                <button onClick={() => setLogView('monthly')}
                  className={`px-3 py-1.5 text-xs font-medium ${logView === 'monthly' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}>Monthly</button>
              </div>
              {/* Month/Year nav */}
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-2 py-1">
                <button onClick={() => { if (logView === 'weekly') { if (logMonth === 0) { setLogMonth(11); setLogYear(y => y - 1); } else setLogMonth(m => m - 1); } else { setLogYear(y => y - 1); } }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-16 text-center">
                  {logView === 'weekly' ? `${SHORT_MONTHS[logMonth]} ${logYear}` : logYear}</span>
                <button onClick={() => { if (logView === 'weekly') { if (logMonth === 11) { setLogMonth(0); setLogYear(y => y + 1); } else setLogMonth(m => m + 1); } else { setLogYear(y => y + 1); } }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={logView === 'weekly' ? weeklyLogData : monthlyLogData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey={logView === 'weekly' ? 'label' : 'month'} stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Bar dataKey="hours" fill="#0d9488" name="Hours" radius={[4, 4, 0, 0]} />
                <Bar dataKey="entries" fill="#8b5cf6" name="Entries" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={!!statusUpdate} onOpenChange={(open) => !open && setStatusUpdate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Task Status</DialogTitle>
            <DialogDescription>
              You are moving this task to <span className="font-semibold text-gray-900 dark:text-white">{statusUpdate?.newStatus.replace('_', ' ')}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add a comment for the Project Manager (Optional)
            </label>
            <textarea
              value={statusComment}
              onChange={e => setStatusComment(e.target.value)}
              placeholder="e.g. Waiting on design assets..."
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setStatusUpdate(null)}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={confirmStatusChange}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUpdating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Update Status
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};
export default EmployeeTasks;
