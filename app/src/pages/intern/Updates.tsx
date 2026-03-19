// INTERN UPDATES PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, FileText } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDailyWorkByEmployee, submitDailyWork } from '@/services/firestoreService';
import type { DailyWork } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/utils/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const InternUpdates: React.FC = () => {
  const { userData } = useAuth();
  const [updates, setUpdates] = useState<DailyWork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ hoursWorked: '', description: '', learnings: '', questions: '', tomorrowPlan: '' });

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try { setIsLoading(true); setUpdates(await getDailyWorkByEmployee(userData!.uid)); }
    catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async () => {
    if (!userData?.uid) return;
    try {
      await submitDailyWork({ employeeId: userData.uid, employeeName: userData.name, date: new Date(), hoursWorked: parseFloat(form.hoursWorked) || 0, description: form.description, accomplishments: form.learnings, challenges: form.questions, tomorrowPlan: form.tomorrowPlan, createdAt: new Date() });
      toast.success('Update submitted'); setIsDialogOpen(false); setForm({ hoursWorked: '', description: '', learnings: '', questions: '', tomorrowPlan: '' }); loadData();
    } catch { toast.error('Submit failed'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Daily Updates</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Submit and view your learning updates</p></div>
          <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700">
            <Send className="w-4 h-4" /><span className="text-sm font-medium">New Update</span></button>
        </div>
        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : updates.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No updates submitted yet</p></div>
        ) : (
          <div className="space-y-4">
            {updates.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3"><p className="font-medium text-gray-900 dark:text-white">{formatDate(u.date)}</p>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{u.hoursWorked}h</span></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{u.description}</p>
                {u.accomplishments && <p className="text-sm text-green-600 mt-2">📚 {u.accomplishments}</p>}
              </motion.div>
            ))}
          </div>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Daily Learning Update</DialogTitle><DialogDescription>Share your learning progress</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hours *</label>
                <input type="number" step="0.5" min="0" max="24" value={form.hoursWorked} onChange={e => setForm({ ...form, hoursWorked: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What did you work on? *</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500" rows={3} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What did you learn?</label>
                <textarea value={form.learnings} onChange={e => setForm({ ...form, learnings: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500" rows={2} /></div>
            </div>
            <DialogFooter>
              <button onClick={() => setIsDialogOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.hoursWorked || !form.description} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Submit</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};
export default InternUpdates;
