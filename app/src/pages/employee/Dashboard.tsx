// ============================================
// EMPLOYEE DASHBOARD — ENHANCED WITH WORK DETAILS & WORKING SUBMIT
// ============================================
import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, Calendar, Plus, Bell, Send, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getTasksByEmployee, getProjectsByEmployee, submitDailyWork, getDailyWorkByEmployee, getAllNotices, updateTask } from '@/services/firestoreService';
import type { Task, Project, DailyWork, Notice } from '@/types';
import { toast } from 'sonner';
import { formatDate, formatRelativeTime } from '@/utils/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EmployeeDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workHistory, setWorkHistory] = useState<DailyWork[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);

  // Task Status Update State
  const [statusUpdate, setStatusUpdate] = useState<{task: Task, newStatus: string} | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [workForm, setWorkForm] = useState({
    projectId: '',
    projectName: '',
    taskId: '',
    taskTitle: '',
    hoursWorked: '',
    description: '',
    accomplishments: '',
    challenges: '',
    tomorrowPlan: ''
  });

  useEffect(() => { loadData(); }, [userData]);

  const loadData = async () => {
    if (!userData?.uid) return;
    try { setTasks(await getTasksByEmployee(userData.uid)); } catch (e) { console.error('Tasks error:', e); setTasks([]); }
    try { setNotices(await getAllNotices(5)); } catch (e) { console.error('Notices error:', e); setNotices([]); }
    try { setWorkHistory(await getDailyWorkByEmployee(userData.uid)); } catch (e) { console.error('Work history error:', e); setWorkHistory([]); }
    
    try { setProjects(await getProjectsByEmployee(userData.uid)); } catch (e) { console.error('Projects error:', e); setProjects([]); }
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

  const handleSubmitWork = async () => {
    if (!userData?.uid) return;
    if (!workForm.hoursWorked || !workForm.description) { toast.error('Hours and description are required'); return; }
    try {
      const workData: Omit<DailyWork, 'id'> = {
        employeeId: userData.uid,
        employeeName: userData.name,
        date: new Date(),
        hoursWorked: parseFloat(workForm.hoursWorked) || 0,
        description: workForm.description,
        accomplishments: workForm.accomplishments || '',
        createdAt: new Date()
      };
      if (workForm.projectId) { workData.projectId = workForm.projectId; workData.projectName = workForm.projectName; }
      if (workForm.taskId) { workData.taskId = workForm.taskId; workData.taskTitle = workForm.taskTitle; }
      if (workForm.challenges) workData.challenges = workForm.challenges;
      if (workForm.tomorrowPlan) workData.tomorrowPlan = workForm.tomorrowPlan;

      await submitDailyWork(workData);
      toast.success('Daily work submitted successfully! Your manager will be notified.');
      setIsWorkDialogOpen(false);
      setWorkForm({ projectId: '', projectName: '', taskId: '', taskTitle: '', hoursWorked: '', description: '', accomplishments: '', challenges: '', tomorrowPlan: '' });
      loadData();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit work');
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setWorkForm({ ...workForm, projectId, projectName: project?.name || '', taskId: '', taskTitle: '' });
  };

  const handleTaskSelect = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setWorkForm({ ...workForm, taskId, taskTitle: task?.title || '' });
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalHoursThisWeek = workHistory
    .filter(w => { const d = new Date(w.date); const now = new Date(); const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); return d >= weekAgo; })
    .reduce((a, w) => a + (w.hoursWorked || 0), 0);

  // Weekly hours chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayWork = workHistory.filter(w => {
      const wd = new Date(w.date);
      return wd.toDateString() === d.toDateString();
    });
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), hours: dayWork.reduce((a, w) => a + (w.hoursWorked || 0), 0) };
  });

  const stats = [
    { title: 'Pending Tasks', value: pendingTasks, icon: CheckSquare, color: 'bg-orange-500' },
    { title: 'In Progress', value: inProgressTasks, icon: Clock, color: 'bg-blue-500' },
    { title: 'Completed', value: completedTasks, icon: CheckSquare, color: 'bg-green-500' },
    { title: 'Hours (Week)', value: totalHoursThisWeek.toFixed(1), icon: TrendingUp, color: 'bg-purple-500' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {userData?.name}. Here's your work overview.</p>
          </div>
          <button onClick={() => setIsWorkDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors">
            <Plus className="w-4 h-4" /><span className="text-sm font-medium">Submit Work</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}><stat.icon className="w-6 h-6 text-white" /></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Weekly Hours Chart + Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hours Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">This Week's Hours</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* My Tasks */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Tasks ({tasks.length})</h3>
            </div>
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500"><CheckSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>No tasks assigned yet</p></div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {tasks.map(task => (
                  <div key={task.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                        <p className="text-sm text-gray-500 mt-0.5">{task.projectName}</p>
                      </div>
                      <select value={task.status} onChange={e => {
                          if (e.target.value !== task.status) {
                            setStatusUpdate({ task, newStatus: e.target.value });
                            setStatusComment(task.employeeComment || '');
                          }
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                        <option value="pending">Pending</option><option value="in_progress">In Prog.</option><option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{task.progress}%</span>
                      {task.dueDate && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(task.dueDate)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Work + Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Work */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Work Submissions</h3>
            {workHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No work submitted yet</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {workHistory.slice(0, 10).map(work => (
                  <div key={work.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(work.date)}</p>
                        {work.projectName && <span className="text-xs text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">{work.projectName}</span>}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{work.description}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ml-2">{work.hoursWorked}h</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Announcements */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Announcements</h3>
              <Bell className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {notices.map(notice => (
                <div key={notice.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      notice.category === 'urgent' ? 'bg-red-100 text-red-700' :
                      notice.category === 'event' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{notice.category}</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(notice.createdAt)}</span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">{notice.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notice.message}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Submit Work Dialog */}
        <Dialog open={isWorkDialogOpen} onOpenChange={setIsWorkDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Daily Work</DialogTitle>
              <DialogDescription>Log your work for today. Your project manager will see this submission.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
                <select value={workForm.projectId} onChange={e => handleProjectSelect(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                  <option value="">Select project (optional)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Task Selection */}
              {workForm.projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task</label>
                  <select value={workForm.taskId} onChange={e => handleTaskSelect(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                    <option value="">Select task (optional)</option>
                    {tasks.filter(t => t.projectId === workForm.projectId).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hours Worked *</label>
                <input type="number" step="0.5" min="0" max="24" value={workForm.hoursWorked}
                  onChange={e => setWorkForm({ ...workForm, hoursWorked: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" placeholder="e.g., 8" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Work Description *</label>
                <textarea value={workForm.description} onChange={e => setWorkForm({ ...workForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" rows={3} placeholder="Describe what you worked on today" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accomplishments</label>
                <textarea value={workForm.accomplishments} onChange={e => setWorkForm({ ...workForm, accomplishments: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" rows={2} placeholder="What did you accomplish?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Challenges</label>
                <textarea value={workForm.challenges} onChange={e => setWorkForm({ ...workForm, challenges: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" rows={2} placeholder="Any challenges faced?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tomorrow's Plan</label>
                <textarea value={workForm.tomorrowPlan} onChange={e => setWorkForm({ ...workForm, tomorrowPlan: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" rows={2} placeholder="What do you plan to work on tomorrow?" />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setIsWorkDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleSubmitWork} disabled={!workForm.hoursWorked || !workForm.description}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                <Send className="w-4 h-4" />Submit Work
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

export default EmployeeDashboard;
