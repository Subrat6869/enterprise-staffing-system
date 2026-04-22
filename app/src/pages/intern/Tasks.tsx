// INTERN TASKS PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getMyTasks } from '@/services/firestoreService';
import type { Task } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/utils/helpers';

const InternTasks: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try { setIsLoading(true); setTasks(await getMyTasks(userData!)); }
    catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Learning Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your assigned learning tasks</p></div>
        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800"><BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No tasks assigned yet</p></div>
        ) : (
          <div className="space-y-4">
            {tasks.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-semibold text-gray-900 dark:text-white">{t.title}</h3><p className="text-sm text-gray-500">{t.projectName}</p></div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${t.status === 'completed' ? 'bg-green-100 text-green-700' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${t.progress}%` }} /></div><span className="text-sm text-gray-500">{t.progress}%</span></div>
                  {t.dueDate && <div className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="w-4 h-4" /><span>{formatDate(t.dueDate)}</span></div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default InternTasks;
