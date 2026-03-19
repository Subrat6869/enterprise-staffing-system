// PM TASKS PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, MoreVertical, Trash2, AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { getProjectsByManager, getTasksByProject, updateTask, deleteTask } from '@/services/firestoreService';
import type { Task } from '@/types';
import { toast } from 'sonner';
import { getInitials, getAvatarColor } from '@/utils/helpers';

const PMTasks: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Action States
  const [activeDropdown, setActiveDropdown] = useState<{id: string, rect: DOMRect} | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try {
      setIsLoading(true);
      const projects = await getProjectsByManager(userData!.uid);
      const allTasks: Task[] = [];
      for (const p of projects) { allTasks.push(...await getTasksByProject(p.id)); }
      setTasks(allTasks);
    } catch { toast.error('Failed to load tasks'); }
    finally { setIsLoading(false); }
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    try {
      setIsActionLoading(true);
      const update: any = { status: newStatus, updatedAt: new Date() };
      if (newStatus === 'completed') { update.progress = 100; update.completedAt = new Date(); }
      else if (newStatus === 'in_progress') update.progress = 50;
      else update.progress = 0;
      
      await updateTask(task.id, update);
      toast.success(`Task marked as ${newStatus.replace('_', ' ')}`);
      setTasks(tasks.map(t => t.id === task.id ? { ...t, ...update } : t));
    } catch (error) {
      toast.error('Failed to update task status');
    } finally {
      setIsActionLoading(false);
      setActiveDropdown(null);
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      setIsActionLoading(true);
      await deleteTask(taskToDelete.id);
      toast.success('Task deleted successfully');
      setTasks(tasks.filter(t => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filtered = tasks.filter(t => statusFilter === 'all' || t.status === statusFilter);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Task Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage all tasks across your projects</p></div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${statusFilter === s ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center"><CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No tasks found</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Task</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Project</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Assigned To</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Progress</th>
            </tr></thead><tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="py-4 px-6">
                    <p className="font-medium text-gray-900 dark:text-white">{t.title}</p>
                    {t.employeeComment && (
                      <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 flex items-start gap-1">
                        <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="max-w-[200px] truncate" title={t.employeeComment}>{t.employeeComment}</span>
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{t.projectName}</td>
                  <td className="py-4 px-6"><div className="flex items-center gap-2"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(t.employeeName)}`}>{getInitials(t.employeeName)}</div><span className="text-sm">{t.employeeName}</span></div></td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      t.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 
                      t.status === 'review' ? 'bg-purple-100 text-purple-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 w-full pr-4">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${t.progress}%` }} />
                        </div>
                        <span className="text-sm">{t.progress}%</span>
                      </div>
                      
                      {/* Actions Dropdown */}
                      <div className="flex justify-end relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeDropdown?.id === t.id) {
                              setActiveDropdown(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveDropdown({ id: t.id, rect });
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </motion.div>

        {/* Delete Confirmation Modal */}
        <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle>Delete Task</DialogTitle>
                  <DialogDescription className="mt-1">
                    Are you sure you want to delete this task? This action cannot be undone.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {taskToDelete && (
              <div className="my-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{taskToDelete.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Project: {taskToDelete.projectName}</p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ${getAvatarColor(taskToDelete.employeeName)}`}>
                    {getInitials(taskToDelete.employeeName)}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Assigned to {taskToDelete.employeeName}</span>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Task
                  </>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      {/* FIXED DROPDOWN MENU */}
      {activeDropdown && (() => {
        const t = tasks.find(task => task.id === activeDropdown.id);
        if (!t) return null;
        
        // Calculate position based on the trigger button's rect
        // We open it to the left of the button to avoid screen edges
        const top = activeDropdown.rect.top + window.scrollY;
        const left = activeDropdown.rect.left + window.scrollX - 200; // 200 is approx width of menu + margin

        return (
          <div 
            className="fixed w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-[100] overflow-hidden"
            style={{ top: `${top}px`, left: `${left}px` }}
            onClick={e => e.stopPropagation()}
          >
            {t.status !== 'pending' && (
              <button
                disabled={isActionLoading}
                onClick={() => handleStatusChange(t, 'pending')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <Clock className="w-4 h-4 text-yellow-500" /> Mark Pending
              </button>
            )}
            {t.status !== 'review' && (
              <button
                disabled={isActionLoading}
                onClick={() => handleStatusChange(t, 'review')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <CheckSquare className="w-4 h-4 text-purple-500" /> Mark for Review
              </button>
            )}
            {t.status !== 'completed' && (
              <button
                disabled={isActionLoading}
                onClick={() => handleStatusChange(t, 'completed')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 text-green-500" /> Mark Completed
              </button>
            )}
            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
            <button
              disabled={isActionLoading}
              onClick={() => { setActiveDropdown(null); setTaskToDelete(t); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Delete Task
            </button>
          </div>
        );
      })()}
      </div>
    </DashboardLayout>
  );
};
export default PMTasks;
