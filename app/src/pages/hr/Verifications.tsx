// HR VERIFICATIONS PAGE  
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllUsers, updateUser } from '@/services/firestoreService';
import type { User } from '@/types';
import { toast } from 'sonner';
import { formatRole, getInitials, getAvatarColor } from '@/utils/helpers';

const HRVerifications: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { 
      setIsLoading(true); 
      const all = await getAllUsers(); 
      setUsers(all.filter(u => ['employee', 'intern', 'apprentice'].includes(u.role))); 
    }
    catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  const handleApprove = async (user: User, approved: boolean) => {
    try { 
      await updateUser(user.uid, { isApproved: approved, certificateVerified: approved }); 
      toast.success(`User ${approved ? 'approved' : 'rejected'} successfully`); 
      loadData(); 
    }
    catch { toast.error('Update failed'); }
  };

  const filtered = users.filter(u => {
    if (filter === 'pending') return u.isApproved !== true;
    if (filter === 'approved') return u.isApproved === true;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">User Approvals</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Approve employees, interns & apprentices before they can login</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total', value: users.length, color: 'bg-blue-500', icon: Users },
            { label: 'Pending', value: users.filter(u => u.isApproved !== true).length, color: 'bg-orange-500', icon: Clock },
            { label: 'Approved', value: users.filter(u => u.isApproved === true).length, color: 'bg-green-500', icon: CheckCircle },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-5 h-5 text-white" /></div>
              <div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p></div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === f ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" /><p className="text-gray-500">No verifications to show</p>
            </div>
          ) : filtered.map((user, i) => (
            <motion.div key={user.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(user.name)}`}>{getInitials(user.name)}</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">{formatRole(user.role)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {user.isApproved === true ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Approved ✓</span>
                ) : (
                  <>
                    <button onClick={() => handleApprove(user, true)} className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => handleApprove(user, false)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200" title="Reject"><XCircle className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HRVerifications;
