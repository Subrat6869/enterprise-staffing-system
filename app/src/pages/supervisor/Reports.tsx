// ============================================
// SUPERVISOR REPORTS — AGGREGATED REPORT VIEW
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { ClipboardList, Briefcase, Users, LayoutDashboard } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getMyTasks, getTeamsBySupervisor } from '@/services/firestoreService';
import type { Task, Team } from '@/types';
import { toast } from 'sonner';

const SupervisorReports: React.FC = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);

  const loadData = async () => {
    if (!userData) return;
    try {
      setIsLoading(true);
      const [t, tms] = await Promise.all([
        getMyTasks(userData),
        getTeamsBySupervisor(userData.uid)
      ]);
      setTasks(t);
      setTeams(tms);
    } catch { 
      toast.error('Failed to load report data'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // 1. Status Distribution
  const statusDist = useMemo(() => {
    const counts = { pending: 0, in_progress: 0, review: 0, completed: 0 };
    tasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return [
      { name: 'Pending', value: counts.pending, color: '#f59e0b' },
      { name: 'In Progress', value: counts.in_progress, color: '#3b82f6' },
      { name: 'Review', value: counts.review, color: '#8b5cf6' },
      { name: 'Completed', value: counts.completed, color: '#10b981' }
    ].filter(item => item.value > 0);
  }, [tasks]);

  // 2. Department-Wide Task Count
  const departmentCount = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { total, completed };
  }, [tasks]);

  // 3. Team-Wise Task Breakdown
  const teamBreakdown = useMemo(() => {
    // Collect team mappings from the tasks
    const map = new Map<string, { inProgress: number, pending: number, completed: number }>();

    // Seed map with supervisor's actual teams so they show even if 0 tasks
    teams.forEach(team => {
      map.set(team.name, { inProgress: 0, pending: 0, completed: 0 });
    });

    tasks.forEach(t => {
      let key = 'Department (Unassigned)';
      if (t.teamName) key = t.teamName;
      else if (t.assignmentLevel === 'department') key = 'Department All';

      if (!map.has(key)) map.set(key, { inProgress: 0, pending: 0, completed: 0 });
      const stats = map.get(key)!;
      
      if (t.status === 'completed') stats.completed++;
      else if (t.status === 'pending') stats.pending++;
      else stats.inProgress++;
    });

    return Array.from(map.entries()).map(([name, stats]) => ({
      name,
      'In Progress': stats.inProgress,
      Pending: stats.pending,
      Completed: stats.completed,
    }));
  }, [tasks, teams]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Aggregated Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Status distribution and distribution maps for your teams.</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No task data available to generate reports.</p>
          </div>
        ) : (
          <div className="space-y-6 flex flex-col h-full">

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Department Tasks</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{departmentCount.total}</h3>
                </div>
                <div className="p-3 rounded-xl bg-purple-500"><LayoutDashboard className="w-6 h-6 text-white" /></div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completed Volume</p>
                  <h3 className="text-2xl font-bold text-green-600 mt-1">{departmentCount.completed}</h3>
                </div>
                <div className="p-3 rounded-xl bg-green-500"><Briefcase className="w-6 h-6 text-white" /></div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Teams Reporting</p>
                  <h3 className="text-2xl font-bold text-blue-600 mt-1">{teams.length}</h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-500"><Users className="w-6 h-6 text-white" /></div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart: Status Distribution */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Status-wise Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDist} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                        {statusDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Bar Chart: Team Breakdown */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team-wise Task Count</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SupervisorReports;
