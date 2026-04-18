// ============================================
// PM TEAM PAGE — READ-ONLY MEMBER LIST
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Shield, ShieldOff, MoreHorizontal, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getProjectsByManager, getTasksByProject, updateUser, deleteUser, getUsersByArea } from '@/services/firestoreService';
import type { User, Task } from '@/types';
import { toast } from 'sonner';
import { getInitials, getAvatarColor, formatRole } from '@/utils/helpers';

const PMTeam: React.FC = () => {
  const { userData } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [areaUsers, projects] = await Promise.all([
        getUsersByArea(userData!.areaCode || ''),
        getProjectsByManager(userData!.uid)
      ]);
      setMembers(areaUsers.filter(u => {
        const isTeamRole = ['employee', 'intern', 'apprentice'].includes(u.role);
        // If PM is assigned to a specific department, only show members of that department
        const sameDept = userData?.departmentId ? u.departmentId === userData.departmentId : true;
        return isTeamRole && sameDept;
      }));
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
            <p className="text-gray-500 dark:text-gray-400 mt-1">View team members and their task progress</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
            <Users className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-700 dark:text-teal-400">{members.length} Members</span>
          </div>
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
    </DashboardLayout>
  );
};
export default PMTeam;
