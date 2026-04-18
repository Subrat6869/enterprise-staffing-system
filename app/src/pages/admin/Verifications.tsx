// ============================================
// ADMIN VERIFICATIONS PAGE (Higher Roles) — Bulk Actions
// ============================================
// Handles approval workflow for: Admin, HR, GM, PM, Supervisor
// Supports: Select all, select multiple, bulk approve/reject

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Clock, Shield, Users,
  CheckSquare, Square, MinusSquare, Zap
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllUsers, updateUser, logActivity } from '@/services/firestoreService';
import type { User, ApprovalStatus } from '@/types';
import { toast } from 'sonner';
import { formatRole, getInitials, getAvatarColor } from '@/utils/helpers';
import { AREAS } from '@/data/areaData';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const HIGHER_ROLES = ['admin', 'hr', 'general_manager', 'project_manager', 'supervisor'];

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const AdminVerifications: React.FC = () => {
  const { userData: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<{ action: 'approved' | 'rejected'; ids: string[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const all = await getAllUsers();
      setUsers(all.filter(u => HIGHER_ROLES.includes(u.role)));
      setSelectedIds(new Set());
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

  // ========== SINGLE ACTION ==========
  const handleAction = async (user: User, status: 'approved' | 'rejected') => {
    try {
      await updateUser(user.uid, {
        approvalStatus: status,
        isApproved: status === 'approved',
      });
      toast.success(`${user.name} ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      if (currentUser?.uid) {
        logActivity(
          currentUser.uid, currentUser.name, currentUser.role,
          status === 'approved' ? 'USER_APPROVED' : 'USER_REJECTED',
          `${currentUser.name} ${status} user ${user.name} (${formatRole(user.role)})`,
          'User'
        );
      }
      loadData();
    } catch {
      toast.error('Failed to update user');
    }
  };

  // ========== BULK ACTIONS ==========
  const handleBulkAction = async (action: 'approved' | 'rejected', ids: string[]) => {
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const uid of ids) {
      try {
        await updateUser(uid, {
          approvalStatus: action,
          isApproved: action === 'approved',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    // Log bulk activity
    if (currentUser?.uid) {
      logActivity(
        currentUser.uid, currentUser.name, currentUser.role,
        action === 'approved' ? 'USER_APPROVED' : 'USER_REJECTED',
        `${currentUser.name} bulk ${action} ${successCount} users (${failCount} failed)`,
        'User'
      );
    }

    if (successCount > 0) toast.success(`${successCount} user(s) ${action} successfully`);
    if (failCount > 0) toast.error(`${failCount} user(s) failed to update`);

    setConfirmAction(null);
    setIsProcessing(false);
    loadData();
  };

  // ========== SELECTION HELPERS ==========
  const toggleSelect = (uid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const filtered = users.filter(u => {
    const status = getStatus(u);
    const matchStatus = filter === 'all' || status === filter;
    const matchArea = areaFilter === 'all' || u.areaCode === areaFilter;
    return matchStatus && matchArea;
  });

  const selectableUsers = filtered; // all currently visible users can be selected
  const allSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedIds.has(u.uid));
  const someSelected = selectableUsers.some(u => selectedIds.has(u.uid));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableUsers.map(u => u.uid)));
    }
  };

  // Filtered pending for "Approve All / Reject All"
  const pendingUsers = users.filter(u => getStatus(u) === 'pending');
  const selectedArray = Array.from(selectedIds);

  const counts = {
    total: users.length,
    pending: users.filter(u => getStatus(u) === 'pending').length,
    approved: users.filter(u => getStatus(u) === 'approved').length,
    rejected: users.filter(u => getStatus(u) === 'rejected').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Role Verifications</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Approve Admin, HR, GM, PM & Supervisor accounts before they can login
            </p>
          </div>
          {/* Global Bulk Actions */}
          {pendingUsers.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setConfirmAction({ action: 'approved', ids: pendingUsers.map(u => u.uid) })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 text-sm font-medium shadow-lg shadow-green-500/20 transition-all"
              >
                <Zap className="w-4 h-4" /> Approve All ({pendingUsers.length})
              </button>
              <button
                onClick={() => setConfirmAction({ action: 'rejected', ids: pendingUsers.map(u => u.uid) })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 text-sm font-medium shadow-lg shadow-red-500/20 transition-all"
              >
                <Zap className="w-4 h-4" /> Reject All ({pendingUsers.length})
              </button>
            </div>
          )}
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

        {/* Filter Tabs + Area */}
        <div className="flex gap-2 flex-wrap items-center">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); setSelectedIds(new Set()); }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${counts[f]})`}
            </button>
          ))}
          <select
            value={areaFilter}
            onChange={(e) => { setAreaFilter(e.target.value); setSelectedIds(new Set()); }}
            className="px-3 sm:px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Areas</option>
            {AREAS.map(area => (
              <option key={area.code} value={area.code}>
                {area.code} — {area.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                {selectedIds.size} user(s) selected
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (selectedArray.length === 0) { toast.error('Please select at least one request'); return; }
                    setConfirmAction({ action: 'approved', ids: selectedArray });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Approve Selected
                </button>
                <button
                  onClick={() => {
                    if (selectedArray.length === 0) { toast.error('Please select at least one request'); return; }
                    setConfirmAction({ action: 'rejected', ids: selectedArray });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Reject Selected
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >Clear</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-[40px_1fr_120px_100px_120px_130px] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="flex items-center">
              <button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600 transition-colors">
                {allSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : someSelected ? <MinusSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
              </button>
            </div>
            <div>Name</div>
            <div>Role</div>
            <div>Area</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No role verifications to show</p>
            </div>
          ) : filtered.map((user, i) => {
            const status = getStatus(user);
            const isSelected = selectedIds.has(user.uid);
            return (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={`grid grid-cols-1 sm:grid-cols-[40px_1fr_120px_100px_120px_130px] gap-3 sm:gap-4 px-4 sm:px-5 py-4 border-b border-gray-50 dark:border-gray-800/50 last:border-0 items-center transition-colors ${
                  isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                }`}
              >
                {/* Checkbox */}
                <div className="hidden sm:flex items-center">
                  <button onClick={() => toggleSelect(user.uid)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </div>

                {/* Name + Email */}
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleSelect(user.uid)} className="sm:hidden text-gray-400 hover:text-indigo-600 flex-shrink-0">
                    {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                  </button>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 text-xs ${getAvatarColor(user.name)}`}>
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {formatRole(user.role)}
                  </span>
                </div>

                {/* Area */}
                <div>
                  {user.areaCode ? (
                    <span className="text-xs text-gray-600 dark:text-gray-400" title={user.areaName || ''}>
                      {user.areaCode}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                    status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {status === 'approved' ? '✓ Approved' : status === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 justify-end">
                  {status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(user, 'approved')}
                        className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors touch-manipulation" title="Approve">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAction(user, 'rejected')}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors touch-manipulation" title="Reject">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {status === 'approved' && (
                    <button onClick={() => handleAction(user, 'rejected')}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors">Revoke</button>
                  )}
                  {status === 'rejected' && (
                    <button onClick={() => handleAction(user, 'approved')}
                      className="px-2.5 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-xs font-medium transition-colors">Re-approve</button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={!!confirmAction} onOpenChange={() => { if (!isProcessing) setConfirmAction(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmAction?.action === 'approved' ? '✅ Confirm Bulk Approve' : '❌ Confirm Bulk Reject'}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to <strong>{confirmAction?.action === 'approved' ? 'approve' : 'reject'}</strong> {confirmAction?.ids.length} selected request(s)?
                {confirmAction?.action === 'rejected' && ' Rejected users will not be able to login.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                {confirmAction?.ids.map(uid => {
                  const user = users.find(u => u.uid === uid);
                  if (!user) return null;
                  return (
                    <div key={uid} className="flex items-center gap-2 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ${getAvatarColor(user.name)}`}>
                        {getInitials(user.name)}
                      </div>
                      <span className="text-gray-900 dark:text-white">{user.name}</span>
                      <span className="text-xs text-gray-400">({formatRole(user.role)})</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setConfirmAction(null)} disabled={isProcessing}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => confirmAction && handleBulkAction(confirmAction.action, confirmAction.ids)}
                disabled={isProcessing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-colors disabled:opacity-50 ${
                  confirmAction?.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isProcessing ? 'Processing...' : confirmAction?.action === 'approved' ? 'Approve All' : 'Reject All'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminVerifications;
