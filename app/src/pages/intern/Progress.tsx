// INTERN PROGRESS PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, CheckSquare, Clock } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getTasksByEmployee, getDailyWorkByEmployee } from '@/services/firestoreService';
import type { Task } from '@/types';
import { toast } from 'sonner';

const InternProgress: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [t, w] = await Promise.all([getTasksByEmployee(userData!.uid), getDailyWorkByEmployee(userData!.uid)]);
      setTasks(t); setTotalHours(w.reduce((a, x) => a + x.hoursWorked, 0));
    } catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  const completed = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Learning Progress</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your growth and achievements</p></div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div><p className="text-teal-100">Overall Progress</p><h2 className="text-4xl font-bold mt-1">{progress}%</h2><p className="text-teal-100 text-sm mt-1">Keep learning and growing!</p></div>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center"><Award className="w-10 h-10 text-white" /></div>
          </div>
          <div className="mt-6 h-3 bg-white/20 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} className="h-full bg-white rounded-full" /></div>
        </motion.div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { l: 'Total Tasks', v: tasks.length, icon: CheckSquare, c: 'bg-blue-500' },
              { l: 'Completed', v: completed, icon: CheckSquare, c: 'bg-green-500' },
              { l: 'Total Hours', v: `${totalHours.toFixed(1)}h`, icon: Clock, c: 'bg-purple-500' },
              { l: 'Progress', v: `${progress}%`, icon: TrendingUp, c: 'bg-orange-500' },
            ].map(s => (
              <motion.div key={s.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">{s.l}</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.v}</p></div>
                  <div className={`p-3 rounded-xl ${s.c}`}><s.icon className="w-5 h-5 text-white" /></div></div>
              </motion.div>
            ))}
          </div>
        )}

        {userData?.certificateURL && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Award className="w-6 h-6 text-green-600" /></div>
              <div><h3 className="font-semibold text-gray-900 dark:text-white">Certificate Status</h3>
                <p className={`text-sm ${userData.certificateVerified ? 'text-green-600' : 'text-orange-600'}`}>{userData.certificateVerified ? '✓ Verified' : '⏳ Pending Verification'}</p></div>
              <a href={userData.certificateURL} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm text-teal-600 hover:text-teal-700 font-medium">View Certificate →</a>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default InternProgress;
