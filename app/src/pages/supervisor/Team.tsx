// ============================================
// SUPERVISOR TEAM — READ-ONLY MEMBER LIST
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, Building2, User, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getUsersByDepartment, getUsersByArea } from '@/services/firestoreService';
import type { User as AppUser } from '@/types';
import { toast } from 'sonner';
import { getInitials, getAvatarColor, formatRole } from '@/utils/helpers';

const SupervisorTeam: React.FC = () => {
  const { userData } = useAuth();
  const [members, setMembers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);

  const loadData = async () => {
    if (!userData) return;
    try {
      setIsLoading(true);
      let allUsers: AppUser[] = [];

      const deptId = userData.departmentId || userData.department;
      if (deptId) {
        // Fetch by department
        allUsers = await getUsersByDepartment(deptId);
      } else if (userData.areaCode) {
        // Fallback: fetch by area if no department assigned
        allUsers = await getUsersByArea(userData.areaCode);
      }

      // Exclude self
      let filtered = allUsers.filter(u => u.uid !== userData.uid);

      // If supervisor is assigned to a specific team, narrow down to team members
      if (userData.teamId) {
        filtered = filtered.filter(u => u.teamId === userData.teamId);
      }

      // Only show member-level roles (not other supervisors, GMs, PMs)
      filtered = filtered.filter(u => ['employee', 'intern', 'apprentice'].includes(u.role));

      setMembers(filtered);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.teamName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Team</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of members assigned to your scope</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No members found in your scope.</p>
            {!userData?.departmentId && !userData?.department && (
              <p className="text-sm text-amber-500 mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4" /> You are not assigned to a department yet. Contact your admin.
              </p>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Member Roster ({members.length})</h3>
              <input
                type="text"
                placeholder="Search name, email, or team..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-64 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="pb-3 text-sm font-medium text-gray-500">Member</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Contact</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">System Role</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Assigned Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredMembers.map((member) => (
                    <tr key={member.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(member.name)}`}>
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="w-4 h-4" />
                          <a href={`mailto:${member.email}`} className="hover:text-teal-600 transition-colors">{member.email}</a>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-teal-50 dark:bg-teal-900/30 text-teal-600">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {formatRole(member.role)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        {member.teamName ? (
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{member.teamName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No members found matching "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SupervisorTeam;
