// EMPLOYEE WORK LOG PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Send } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDailyWorkByEmployee, submitDailyWork } from '@/services/firestoreService';
import type { DailyWork } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/utils/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const EmployeeWorkLog: React.FC = () => {
  const { userData } = useAuth();
  const [workHistory, setWorkHistory] = useState<DailyWork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ hoursWorked: '', description: '', accomplishments: '', challenges: '', tomorrowPlan: '' });

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try { setIsLoading(true); setWorkHistory(await getDailyWorkByEmployee(userData!.uid)); }
    catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async () => {
    if (!userData?.uid) return;
    try {
      await submitDailyWork({ employeeId: userData.uid, employeeName: userData.name, date: new Date(), hoursWorked: parseFloat(form.hoursWorked) || 0, description: form.description, accomplishments: form.accomplishments, challenges: form.challenges, tomorrowPlan: form.tomorrowPlan, createdAt: new Date() });
      toast.success('Work submitted'); setIsDialogOpen(false); setForm({ hoursWorked: '', description: '', accomplishments: '', challenges: '', tomorrowPlan: '' }); loadData();
    } catch { toast.error('Submit failed'); }
  };

  const totalHours = workHistory.reduce((a, w) => a + w.hoursWorked, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Work Log</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track your daily work submissions</p></div>
          <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700">
            <Plus className="w-4 h-4" /><span className="text-sm font-medium">Log Work</span></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500"><Clock className="w-5 h-5 text-white" /></div>
            <div><p className="text-sm text-gray-500">Total Hours</p><p className="text-xl font-bold text-gray-900 dark:text-white">{totalHours.toFixed(1)}h</p></div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500"><Send className="w-5 h-5 text-white" /></div>
            <div><p className="text-sm text-gray-500">Entries</p><p className="text-xl font-bold text-gray-900 dark:text-white">{workHistory.length}</p></div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : workHistory.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800"><Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No work logged yet</p></div>
        ) : (
          <div className="space-y-4">
            {workHistory.map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3"><p className="font-medium text-gray-900 dark:text-white">{formatDate(w.date)}</p>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{w.hoursWorked}h</span></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{w.description}</p>
                {w.accomplishments && <p className="text-sm text-green-600 mt-2">✓ {w.accomplishments}</p>}
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Log Daily Work</DialogTitle><DialogDescription>Record your work for today</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hours Worked *</label>
                <input type="number" step="0.5" min="0" max="24" value={form.hoursWorked} onChange={e => setForm({ ...form, hoursWorked: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500" placeholder="e.g., 8" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500" rows={3} placeholder="What did you work on?" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accomplishments</label>
                <textarea value={form.accomplishments} onChange={e => setForm({ ...form, accomplishments: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500" rows={2} /></div>
            </div>
            <DialogFooter>
              <button onClick={() => setIsDialogOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.hoursWorked || !form.description} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"><Send className="w-4 h-4 inline mr-2" />Submit</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};
export default EmployeeWorkLog;
