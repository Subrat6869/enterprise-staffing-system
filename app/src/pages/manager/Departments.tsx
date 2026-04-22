// ============================================
// GM DEPARTMENTS — AREA-SCOPED + TEAM HIERARCHY
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, FolderKanban, ChevronDown, MapPin } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
  getDepartmentsByArea,
  getUsersByArea,
  getProjectsByArea,
  getTeamsByArea
} from '@/services/firestoreService';
import type { Department, User, Project, Team } from '@/types';
import { toast } from 'sonner';
import { formatArea } from '@/data/areaData';

const ManagerDepartments: React.FC = () => {
  const { userData } = useAuth();
  const gmAreaCode = userData?.areaCode || '';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Expand state for teams under each department
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  useEffect(() => { if (gmAreaCode) loadData(); }, [gmAreaCode]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [d, u, p, t] = await Promise.all([
        getDepartmentsByArea(gmAreaCode),
        getUsersByArea(gmAreaCode),
        getProjectsByArea(gmAreaCode),
        getTeamsByArea(gmAreaCode)
      ]);
      setDepartments(d);
      setUsers(u);
      setProjects(p);
      setTeams(t);
    } catch {
      toast.error('Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId); else next.add(deptId);
      return next;
    });
  };

  // Guard: no area
  if (!gmAreaCode) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Area Assigned</h2>
            <p className="text-gray-500 dark:text-gray-400">Please contact Admin to assign your area.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Department Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View department performance and staffing</p>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">{formatArea(gmAreaCode, userData?.areaName)}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, i) => {
              const deptUsers = users.filter(u => u.departmentId === dept.id);
              const deptProjects = projects.filter(p => p.departmentId === dept.id);
              const deptTeams = teams.filter(t => t.departmentId === dept.id);
              const isExpanded = expandedDepts.has(dept.id);

              return (
                <motion.div key={dept.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center"><Building2 className="w-6 h-6 text-purple-600" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dept.name}</h3>
                        <p className="text-sm text-gray-500">{dept.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600 dark:text-gray-400">{deptUsers.length} Members</span></div>
                      <div className="flex items-center gap-2"><FolderKanban className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600 dark:text-gray-400">{deptProjects.length} Projects</span></div>
                      <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600 dark:text-gray-400">{deptTeams.length} Teams</span></div>
                    </div>
                  </div>

                  {/* Expandable Teams Section */}
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => toggleDept(dept.id)}
                      className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Teams ({deptTeams.length})</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 space-y-2">
                            {deptTeams.length === 0 ? (
                              <p className="text-sm text-gray-400 py-1">No teams created yet</p>
                            ) : (
                              deptTeams.map(team => {
                                const teamMemberCount = users.filter(u => u.teamId === team.id).length;
                                return (
                                  <div key={team.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                                        <Users className="w-3 h-3 text-teal-600" />
                                      </div>
                                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{team.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{teamMemberCount} members</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
            {departments.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-12">No departments found in your area. Contact Admin to seed departments.</div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerDepartments;
