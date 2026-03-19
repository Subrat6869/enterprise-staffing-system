// ============================================
// PM TEAM PAGE — MEMBER MANAGEMENT
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Shield, ShieldOff, MoreHorizontal, UserPlus, Trash2, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getAllUsers, getProjectsByManager, getTasksByProject, updateUser, createUser, deleteUser } from '@/services/firestoreService';
import type { User, Task, UserRole } from '@/types';
import { toast } from 'sonner';
import { getInitials, getAvatarColor, formatRole } from '@/utils/helpers';
import { AnimatePresence } from 'framer-motion';

const PMTeam: React.FC = () => {
  const { userData } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Add Member State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'employee' });

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allUsers, projects] = await Promise.all([
        getAllUsers(),
        getProjectsByManager(userData!.uid)
      ]);
      setMembers(allUsers.filter(u => ['employee', 'intern', 'apprentice'].includes(u.role)));
      const taskResults = await Promise.all(projects.map(p => getTasksByProject(p.id)));
      setTasks(taskResults.flat());
    } catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  const handleToggleActive = async (uid: string, currentActive: boolean) => {
    try {
      await updateUser(uid, { isActive: !currentActive });
      toast.success(currentActive ? 'Member deactivated' : 'Member activated');
      setActiveMenu(null);
      loadData();
    } catch { toast.error('Failed to update'); }
  };

  const handleDeleteMember = async (uid: string) => {
    if (!confirm('Are you sure you want to completely delete this member?')) return;
    try {
      await deleteUser(uid);
      toast.success('Member deleted successfully');
      setActiveMenu(null);
      loadData();
    } catch { toast.error('Failed to delete member'); }
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email) { toast.error('Name and email are required'); return; }
    try {
      const uid = 'user_' + new Date().getTime().toString();
      await createUser(uid, {
        email: newMember.email,
        name: newMember.name,
        role: newMember.role as UserRole,
        departmentId: userData?.departmentId || '',
        department: userData?.department || '',
        isActive: true,
        createdAt: new Date() as any
      });
      toast.success('Member added successfully');
      setShowAddModal(false);
      setNewMember({ name: '', email: '', role: 'employee' });
      loadData();
    } catch { toast.error('Failed to add member'); }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'all' || m.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [members, searchQuery, roleFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Team Members</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage team members for project assignments</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors text-sm font-medium">
            <UserPlus className="w-4 h-4" /> Add Member
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
            <option value="all">All Roles</option>
            <option value="employee">Employee</option>
            <option value="intern">Intern</option>
            <option value="apprentice">Apprentice</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No team members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((m, i) => {
              const memberTasks = tasks.filter(t => t.employeeId === m.uid);
              const completed = memberTasks.filter(t => t.status === 'completed').length;
              const total = memberTasks.length;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <motion.div key={m.uid} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border ${m.isActive !== false ? 'border-gray-100 dark:border-gray-800' : 'border-red-200 dark:border-red-800 opacity-60'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold ${getAvatarColor(m.name)}`}>{getInitials(m.name)}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                        <p className="text-sm text-gray-500">{m.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">{formatRole(m.role)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {m.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <button onClick={() => setActiveMenu(activeMenu === m.uid ? null : m.uid)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                      {activeMenu === m.uid && (
                        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 w-40">
                          <button onClick={() => handleToggleActive(m.uid, m.isActive !== false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                            {m.isActive !== false ? <><ShieldOff className="w-4 h-4 text-yellow-600" /> Deactivate</> : <><Shield className="w-4 h-4 text-green-600" /> Activate</>}
                          </button>
                          <button onClick={() => handleDeleteMember(m.uid)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-left border-t border-gray-100 dark:border-gray-800">
                            <Trash2 className="w-4 h-4 text-red-500" /> Delete Member
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Progress */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">Task Progress</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{completed}/{total}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Team Member</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input type="text" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <input type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500">
                    <option value="employee">Employee</option><option value="intern">Intern</option><option value="apprentice">Apprentice</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">Cancel</button>
                <button onClick={handleAddMember} disabled={!newMember.name || !newMember.email} className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" /> Add Member
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};
export default PMTeam;
