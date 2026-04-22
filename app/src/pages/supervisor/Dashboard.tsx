// ============================================
// SUPERVISOR DASHBOARD - ENHANCED
// ============================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, ClipboardList, CheckCircle, Clock, ArrowRight, MoreHorizontal, TrendingUp
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getUsersByDepartment, getUsersByArea, getMyTasks, getDailyWorkByEmployee, getTeamsBySupervisor } from '@/services/firestoreService';
import type { User, Task, DailyWork, Team } from '@/types';
import { toast } from 'sonner';
import { formatDate, getInitials, getAvatarColor } from '@/utils/helpers';
import { formatArea } from '@/data/areaData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const SupervisorDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentWork, setRecentWork] = useState<DailyWork[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);

  const loadData = async () => {
    if (!userData) return;
    try {
      setIsLoading(true);

      // Fetch members: try department first, then fallback to area
      const deptId = userData.departmentId || userData.department;
      let members: User[] = [];
      if (deptId) {
        members = await getUsersByDepartment(deptId);
      } else if (userData.areaCode) {
        members = await getUsersByArea(userData.areaCode);
      }

      const [allTasks, supervisorTeams] = await Promise.all([
        getMyTasks(userData),
        getTeamsBySupervisor(userData.uid)
      ]);

      const filteredMembers = members.filter(m => m.uid !== userData.uid && ['employee', 'intern', 'apprentice'].includes(m.role));
      setTeamMembers(filteredMembers);
      setTeams(supervisorTeams.filter(t => t.status === 'active'));

      // Filter tasks for team members
      setTasks(allTasks);

      // Get recent work (parallel for first 5 members)
      const workPromises = filteredMembers.slice(0, 5).map(m => getDailyWorkByEmployee(m.uid));
      const workResults = await Promise.all(workPromises);
      const allWork = workResults.flat();
      setRecentWork(allWork.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const stats = [
    { title: 'Team Members', value: teamMembers.length, icon: Users, color: 'bg-blue-500' },
    { title: 'Active Teams', value: teams.length, icon: TrendingUp, color: 'bg-teal-500' },
    { title: 'Pending Tasks', value: pendingTasks, icon: Clock, color: 'bg-orange-500' },
    { title: 'Completed', value: completedTasks, icon: CheckCircle, color: 'bg-green-500' }
  ];

  // Performance chart data per member
  const performanceData = teamMembers.slice(0, 8).map(m => {
    const mTasks = tasks.filter(t => t.employeeId === m.uid);
    return {
      name: m.name.split(' ')[0],
      completed: mTasks.filter(t => t.status === 'completed').length,
      inProgress: mTasks.filter(t => t.status === 'in_progress').length,
      pending: mTasks.filter(t => t.status === 'pending').length
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Supervisor Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {userData?.name}. Monitor your team's progress.</p>
          {userData?.areaCode && (
            <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mt-1">
              📍 {formatArea(userData.areaCode, userData.areaName)}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}><stat.icon className="w-6 h-6 text-white" /></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Performance Chart & Team Members */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Member Performance Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team Member Performance</h3>
            {performanceData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inProgress" fill="#3b82f6" name="In Progress" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>No performance data yet</p>
              </div>
            )}
          </motion.div>

          {/* Team Members */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Team</h3>
              <button className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1">
                View All<ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {isLoading ? (
              <div className="p-4 text-center"><div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
            ) : teamMembers.length === 0 ? (
              <div className="p-4 text-center text-gray-500"><Users className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>No team members found</p></div>
            ) : (
              <div className="space-y-4">
                {teamMembers.slice(0, 6).map((member) => {
                  const mTasks = tasks.filter(t => t.employeeId === member.uid);
                  const completed = mTasks.filter(t => t.status === 'completed').length;
                  const total = mTasks.length;
                  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={member.uid} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(member.name)}`}>
                        {getInitials(member.name)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{progress}%</p>
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Work Submissions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Work Submissions</h3>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><MoreHorizontal className="w-4 h-4 text-gray-500" /></button>
          </div>
          {recentWork.length === 0 ? (
            <div className="p-8 text-center text-gray-500"><ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>No recent work submissions</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentWork.map((work) => (
                <div key={work.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(work.employeeName)}`}>
                        {getInitials(work.employeeName)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{work.employeeName}</p>
                        <p className="text-sm text-gray-500">{formatDate(work.date)}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{work.hoursWorked} hours</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{work.description}</p>
                  {work.accomplishments && (
                    <div className="mt-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{work.accomplishments}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Task Overview Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Tasks Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  {['Task','Assigned Entity','Members Working','Status','Progress','Due Date'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 8).map((task) => (
                  <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800/50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.projectName}</p>
                    </td>
                    <td className="py-4 px-4">
                      {task.assignmentLevel === 'department' ? 'Department' :
                        task.assignmentLevel === 'team' || task.assignmentLevel === 'multi_team' ? `Team: ${task.teamName}` :
                        `Member: ${task.employeeName}`}
                    </td>
                    <td className="py-4 px-4">
                      {task.assignmentLevel === 'department' ? teamMembers.length : 
                       task.assignmentLevel === 'team' || task.assignmentLevel === 'multi_team' ? teamMembers.filter(m => m.teamId === task.teamId).length : 1}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>{task.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{task.dueDate ? formatDate(task.dueDate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default SupervisorDashboard;
