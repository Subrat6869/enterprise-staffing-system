// ============================================
// INTERN / APPRENTICE DASHBOARD
// ============================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Clock,
  Calendar,
  TrendingUp,
  Send,
  BookOpen,
  Award,
  Bell,
  ChevronRight,
  FileText
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { 
  getTasksByEmployee, 
  submitDailyWork,
  getDailyWorkByEmployee,
  getAllNotices
} from '@/services/firestoreService';
import type { Task, DailyWork, Notice } from '@/types';
import { toast } from 'sonner';
import { formatDate, formatRelativeTime } from '@/utils/helpers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const InternDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workHistory, setWorkHistory] = useState<DailyWork[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [, setIsLoading] = useState(true);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // Daily update form
  const [updateForm, setUpdateForm] = useState({
    hoursWorked: '',
    description: '',
    learnings: '',
    questions: '',
    tomorrowPlan: ''
  });

  useEffect(() => {
    loadData();
  }, [userData]);

  const loadData = async () => {
    if (!userData?.uid) return;
    
    try {
      setIsLoading(true);
      
      const [tasksData, noticesData, workData] = await Promise.all([
        getTasksByEmployee(userData.uid),
        getAllNotices(5),
        getDailyWorkByEmployee(userData.uid)
      ]);
      
      setTasks(tasksData);
      setNotices(noticesData);
      setWorkHistory(workData.slice(0, 5));
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitUpdate = async () => {
    if (!userData?.uid) return;
    
    try {
      await submitDailyWork({
        employeeId: userData.uid,
        employeeName: userData.name,
        date: new Date(),
        hoursWorked: parseFloat(updateForm.hoursWorked) || 0,
        description: updateForm.description,
        accomplishments: updateForm.learnings,
        challenges: updateForm.questions,
        tomorrowPlan: updateForm.tomorrowPlan,
        createdAt: new Date()
      });
      
      toast.success('Daily update submitted successfully');
      setIsUpdateDialogOpen(false);
      setUpdateForm({
        hoursWorked: '',
        description: '',
        learnings: '',
        questions: '',
        tomorrowPlan: ''
      });
      loadData();
    } catch (error) {
      toast.error('Failed to submit update');
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  // Calculate overall progress
  const totalTasks = tasks.length;
  const overallProgress = totalTasks > 0
    ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / totalTasks)
    : 0;

  const stats = [
    {
      title: 'Pending Tasks',
      value: pendingTasks,
      icon: CheckSquare,
      color: 'bg-orange-500'
    },
    {
      title: 'In Progress',
      value: inProgressTasks,
      icon: Clock,
      color: 'bg-blue-500'
    },
    {
      title: 'Completed',
      value: completedTasks,
      icon: CheckSquare,
      color: 'bg-green-500'
    },
    {
      title: 'Overall Progress',
      value: `${overallProgress}%`,
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              My Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {userData?.name}. Track your learning progress.
            </p>
          </div>
          <button
            onClick={() => setIsUpdateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm font-medium">Daily Update</span>
          </button>
        </div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100">Your Learning Progress</p>
              <h2 className="text-3xl font-bold mt-1">{overallProgress}%</h2>
              <p className="text-teal-100 text-sm mt-1">
                Keep up the great work! You're making excellent progress.
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Award className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="mt-6">
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                My Learning Tasks
              </h3>
              <button className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1">
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No tasks assigned yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your supervisor will assign tasks soon
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">{task.projectName}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {task.description}
                    </p>
                    
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Progress</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-teal-500 rounded-full"
                        />
                      </div>
                    </div>
                    
                    {task.dueDate && (
                      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Due {formatDate(task.dueDate)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Announcements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Announcements
                </h3>
                <Bell className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                {notices.map((notice) => (
                  <div
                    key={notice.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          notice.category === 'urgent'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : notice.category === 'event'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {notice.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(notice.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {notice.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {notice.message}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Updates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  My Updates
                </h3>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>

              {workHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No updates submitted yet</p>
              ) : (
                <div className="space-y-3">
                  {workHistory.map((work) => (
                    <div
                      key={work.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(work.date)}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {work.description}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {work.hoursWorked}h
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Certificate Status */}
            {userData?.certificateURL && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Certificate Status
                    </h3>
                    <p className={`text-sm ${userData.certificateVerified ? 'text-green-600' : 'text-orange-600'}`}>
                      {userData.certificateVerified ? 'Verified' : 'Pending Verification'}
                    </p>
                  </div>
                </div>
                <a
                  href={userData.certificateURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  View Certificate →
                </a>
              </motion.div>
            )}
          </div>
        </div>

        {/* Daily Update Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Daily Learning Update</DialogTitle>
              <DialogDescription>
                Share your learning progress for today
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hours Worked *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={updateForm.hoursWorked}
                  onChange={(e) => setUpdateForm({ ...updateForm, hoursWorked: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., 8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What did you work on? *
                </label>
                <textarea
                  value={updateForm.description}
                  onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  rows={3}
                  placeholder="Describe your work today"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What did you learn?
                </label>
                <textarea
                  value={updateForm.learnings}
                  onChange={(e) => setUpdateForm({ ...updateForm, learnings: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="Share your learnings"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Any questions?
                </label>
                <textarea
                  value={updateForm.questions}
                  onChange={(e) => setUpdateForm({ ...updateForm, questions: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="Any questions for your supervisor?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tomorrow's Plan
                </label>
                <textarea
                  value={updateForm.tomorrowPlan}
                  onChange={(e) => setUpdateForm({ ...updateForm, tomorrowPlan: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="What do you plan to learn tomorrow?"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setIsUpdateDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitUpdate}
                disabled={!updateForm.hoursWorked || !updateForm.description}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Update
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default InternDashboard;
