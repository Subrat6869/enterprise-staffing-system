// ============================================
// SUPERVISOR WORK TRACKING — MEDIUM DETAIL VIEW
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Users, User, Building2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getUsersByDepartment, getUsersByArea, getMyTasks, getTeamsBySupervisor } from '@/services/firestoreService';
import type { User as AppUser, Task, Team } from '@/types';
import { toast } from 'sonner';

const SupervisorWorkTracking: React.FC = () => {
  const { userData } = useAuth();
  const [departmentUsers, setDepartmentUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);

  const loadData = async () => {
    if (!userData) return;
    try {
      setIsLoading(true);

      // Fetch members: department first, then area fallback
      const deptId = userData.departmentId || userData.department;
      let users: AppUser[] = [];
      if (deptId) {
        users = await getUsersByDepartment(deptId);
      } else if (userData.areaCode) {
        users = await getUsersByArea(userData.areaCode);
      }

      const [t, tms] = await Promise.all([
        getMyTasks(userData),
        getTeamsBySupervisor(userData.uid)
      ]);
      setDepartmentUsers(users);
      setTasks(t);
      setTeams(tms);
    } catch { toast.error('Failed to load tasks'); }
    finally { setIsLoading(false); }
  };

  // Process and group tasks according to medium detail spec
  const processedTasks = useMemo(() => {
    return tasks.map(task => {
      let membersWorking = 0;
      let assignedEntity = '';
      let entityIcon = <ClipboardList className="w-4 h-4" />;
      
      if (task.assignmentLevel === 'department') {
        membersWorking = departmentUsers.length;
        assignedEntity = `Department: ${task.departmentName || 'All'}`;
        entityIcon = <Building2 className="w-4 h-4 text-purple-500" />;
      } else if (task.assignmentLevel === 'team' || task.assignmentLevel === 'multi_team') {
        // Count members in this team
        membersWorking = departmentUsers.filter(u => u.teamId === task.teamId).length;
        assignedEntity = `Team: ${task.teamName || 'Multiple'}`;
        entityIcon = <Users className="w-4 h-4 text-blue-500" />;
      } else {
        // Member level
        membersWorking = 1;
        assignedEntity = `Member: ${task.employeeName || 'Unknown'}`;
        entityIcon = <User className="w-4 h-4 text-teal-500" />;
      }

      return {
        ...task,
        membersWorking,
        assignedEntity,
        entityIcon
      };
    }).sort((a,b) => {
      // Sort in-progress first, then pending, then completed
      const order = { in_progress: 0, pending: 1, review: 2, completed: 3 };
      return (order[a.status] || 99) - (order[b.status] || 99);
    });
  }, [tasks, departmentUsers]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Active Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Medium detail view of all tasks active in your department.</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : processedTasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tasks found in your department.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Task Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Entity</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Members Working</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 w-1/4">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {processedTasks.map((task) => (
                    <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                        {task.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">{task.entityIcon}</div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{task.assignedEntity}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {task.membersWorking}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>{task.status.replace('_', ' ')}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${task.progress}%` }} />
                          </div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8">{task.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SupervisorWorkTracking;
