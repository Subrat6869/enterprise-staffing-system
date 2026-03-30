// ============================================
// ADMIN VERIFICATIONS PAGE (Higher Roles)
// ============================================
// Handles approval workflow for: Admin, HR, GM, PM, Supervisor

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllUsers, updateUser } from '@/services/firestoreService';
import type { User, ApprovalStatus } from '@/types';
import { toast } from 'sonner';
import { formatRole, getInitials, getAvatarColor } from '@/utils/helpers';

const HIGHER_ROLES = ['admin', 'hr', 'general_manager', 'project_manager', 'supervisor'];

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const AdminVerifications: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const all = await getAllUsers();
      setUsers(all.filter(u => HIGHER_ROLES.includes(u.role)));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatus = (user: User): ApprovalStatus => {
    if (user.approvalStatus) return user.approvalStatus;
    if (user.isApproved === true) return 'approved';
    if (user.isApproved === false) return 'pending';
    return 'pending';
  };

  const handleAction = async (user: User, status: 'approved' | 'rejected') => {
    try {
      await updateUser(user.uid, {
        approvalStatus: status,
        isApproved: status === 'approved',
      });
      toast.success(`${user.name} ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      loadData();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const filtered = users.filter(u => {
    const status = getStatus(u);
    if (filter === 'pending') return status === 'pending';
    if (filter === 'approved') return status === 'approved';
    if (filter === 'rejected') return status === 'rejected';
    return true;
  });

  const counts = {
    total: users.length,
    pending: users.filter(u => getStatus(u) === 'pending').length,
    approved: users.filter(u => getStatus(u) === 'approved').length,
    rejected: users.filter(u => getStatus(u) === 'rejected').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Role Verifications</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Approve Admin, HR, GM, PM & Supervisor accounts before they can login
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total', value: counts.total, color: 'bg-indigo-500', icon: Users },
            { label: 'Pending', value: counts.pending, color: 'bg-amber-500', icon: Clock },
            { label: 'Approved', value: counts.approved, color: 'bg-green-500', icon: CheckCircle },
            { label: 'Rejected', value: counts.rejected, color: 'bg-red-500', icon: XCircle },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3 sm:gap-4">
              <div className={`p-2.5 sm:p-3 rounded-xl ${s.color}`}><s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* User List */}
        <div className="space-y-3 sm:space-y-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <Shield className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No role verifications to show</p>
            </div>
          ) : filtered.map((user, i) => {
            const status = getStatus(user);
            return (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm sm:text-base ${getAvatarColor(user.name)}`}>
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">{user.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {formatRole(user.role)}
                      </span>
                      {user.department && (
                        <span className="text-[10px] sm:text-xs text-gray-400">• {user.department}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {status === 'approved' && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Approved ✓
                    </span>
                  )}
                  {status === 'rejected' && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Rejected
                      </span>
                      <button
                        onClick={() => handleAction(user, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 text-xs font-medium transition-colors"
                      >
                        Re-approve
                      </button>
                    </div>
                  )}
                  {status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction(user, 'approved')}
                        className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleAction(user, 'rejected')}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminVerifications;
