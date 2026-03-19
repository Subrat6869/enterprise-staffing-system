// ============================================
// SUPERVISOR WORK TRACKING — GROUPED BY TEAM & MEMBER
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle, Users, Clock, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getUsersByDepartment, getDailyWorkByEmployee, getAllTasks, getTeamsBySupervisor } from '@/services/firestoreService';
import type { User, DailyWork, Task, Team } from '@/types';
import { toast } from 'sonner';
import { formatDate, getInitials, getAvatarColor } from '@/utils/helpers';

const SupervisorWorkTracking: React.FC = () => {
  const { userData } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<DailyWork[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'team' | 'all'>('team');

  useEffect(() => { if (userData?.department) loadData(); }, [userData]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [m, t, tms] = await Promise.all([
        getUsersByDepartment(userData!.department!),
        getAllTasks(),
        getTeamsBySupervisor(userData!.uid)
      ]);
      const filteredMembers = m.filter(u => u.uid !== userData!.uid);
      setMembers(filteredMembers);
      setTasks(t);
      setTeams(tms.filter(tm => tm.status === 'active'));

      // Parallel fetch work for all members
      const workPromises = filteredMembers.map(mem => getDailyWorkByEmployee(mem.uid));
      const results = await Promise.all(workPromises);
      const all = results.flat().sort((a, b) => {
        const dA = (a.date as any)?.toDate?.() || new Date(a.date);
        const dB = (b.date as any)?.toDate?.() || new Date(b.date);
        return dB.getTime() - dA.getTime();
      });
      setSubmissions(all);
    } catch { toast.error('Failed to load data'); }
    finally { setIsLoading(false); }
  };

  // Group by team
  const teamGroups = useMemo(() => {
    return teams.map(team => {
      const teamMemberIds = new Set(team.memberIds || []);
      const teamMembers = members.filter(m => teamMemberIds.has(m.uid));
      const teamTasks = tasks.filter(t => teamMemberIds.has(t.employeeId));
      const completed = teamTasks.filter(t => t.status === 'completed').length;
      const total = teamTasks.length;

      const memberDetails = teamMembers.map(m => {
        const mTasks = tasks.filter(t => t.employeeId === m.uid);
        const mWork = submissions.filter(w => w.employeeId === m.uid);
        const mCompleted = mTasks.filter(t => t.status === 'completed').length;
        const mTotal = mTasks.length;
        const totalHours = mWork.reduce((acc, w) => acc + (w.hoursWorked || 0), 0);

        return {
          ...m,
          tasks: mTasks,
          work: mWork.slice(0, 3),
          completedTasks: mCompleted,
          totalTasks: mTotal,
          progress: mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0,
          totalHours
        };
      });

      return {
        team,
        members: memberDetails,
        completedTasks: completed,
        totalTasks: total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });
  }, [teams, members, tasks, submissions]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Work Tracking</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor daily work submissions from your teams</p>
          </div>
          <div className="flex items-center gap-2">
            {(['team', 'all'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === mode ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                {mode === 'team' ? 'By Team' : 'All Submissions'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : viewMode === 'team' ? (
          /* Team View */
          teamGroups.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active teams. Create teams from the Team page first.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {teamGroups.map(({ team, members: teamMembers, completedTasks, totalTasks, progress }) => (
                <motion.div key={team.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {/* Team Header */}
                  <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                        {team.description && <p className="text-sm text-gray-500 mt-0.5">{team.description}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-teal-600">{progress}%</p>
                          <p className="text-xs text-gray-500">{completedTasks}/{totalTasks} tasks</p>
                        </div>
                        <div className="w-16 h-16">
                          <svg viewBox="0 0 36 36" className="w-full h-full">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none" stroke="#0d9488" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members Detail */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {teamMembers.map(member => (
                      <div key={member.uid} className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(member.name)}`}>
                            {getInitials(member.name)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />{member.completedTasks} done</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-500" />{member.totalTasks - member.completedTasks} pending</span>
                              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-500" />{member.totalHours}h logged</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${member.progress}%` }} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{member.progress}%</span>
                          </div>
                        </div>

                        {member.work.length > 0 && (
                          <div className="ml-13 space-y-2">
                            {member.work.map(w => (
                              <div key={w.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-gray-500">{formatDate(w.date)}</span>
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{w.hoursWorked}h</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">{w.description}</p>
                                {w.accomplishments && (
                                  <div className="mt-1 flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-3 h-3" /><span className="text-xs">{w.accomplishments}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* All Submissions View */
          submissions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No work submissions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((w, i) => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(w.employeeName)}`}>{getInitials(w.employeeName)}</div>
                      <div><p className="font-medium text-gray-900 dark:text-white">{w.employeeName}</p><p className="text-sm text-gray-500">{formatDate(w.date)}</p></div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{w.hoursWorked}h</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{w.description}</p>
                  {w.accomplishments && <div className="mt-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm text-gray-600 dark:text-gray-400">{w.accomplishments}</span></div>}
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
};

export default SupervisorWorkTracking;
