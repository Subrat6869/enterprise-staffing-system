// ============================================
// EMPLOYEE PROJECTS — FUNCTIONAL WITH TASK DETAILS
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Calendar, Search, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getProjectsByEmployee, getMyTasks } from '@/services/firestoreService';
import type { Project, Task } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/utils/helpers';

const EmployeeProjects: React.FC = () => {
  const { userData } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [p, t] = await Promise.allSettled([
        getProjectsByEmployee(userData!.uid),
        getMyTasks(userData!)
      ]);
      if (p.status === 'fulfilled') setProjects(p.value);
      else { console.error('Projects error:', p.reason); setProjects([]); }
      if (t.status === 'fulfilled') setTasks(t.value);
      else { console.error('Tasks error:', t.reason); setTasks([]); }
    } catch (e) { console.error('Load error:', e); toast.error('Failed to load projects'); }
    finally { setIsLoading(false); }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Projects in your department with your assigned tasks</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
            <option value="all">All Status</option><option value="active">Active</option><option value="completed">Completed</option><option value="planning">Planning</option>
          </select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, icon: FolderKanban, color: 'bg-blue-500' },
            { label: 'My Tasks', value: tasks.length, icon: CheckCircle, color: 'bg-green-500' },
            { label: 'Pending Tasks', value: tasks.filter(t => t.status !== 'completed').length, icon: Clock, color: 'bg-orange-500' }
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-5 h-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p><p className="text-sm text-gray-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No projects found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((p, i) => {
              const myTasks = tasks.filter(t => t.projectId === p.id);
              const isExpanded = expandedProject === p.id;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {/* Project Header */}
                  <div className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    onClick={() => setExpandedProject(isExpanded ? null : p.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{p.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            p.status === 'active' ? 'bg-green-100 text-green-700' :
                            p.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{p.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{p.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {myTasks.length > 0 && <span className="text-xs text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-full">{myTasks.length} tasks</span>}
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{p.progress}%</span>
                      <div className="flex items-center gap-1 text-sm text-gray-400"><Calendar className="w-4 h-4" />{formatDate(p.deadline)}</div>
                    </div>
                  </div>

                  {/* Expanded Tasks */}
                  {isExpanded && myTasks.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4 bg-gray-50 dark:bg-gray-800/20">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">My Tasks in this Project</p>
                      <div className="space-y-2">
                        {myTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            {task.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> :
                             task.status === 'in_progress' ? <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" /> :
                             <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                              <p className="text-xs text-gray-500 truncate">{task.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${task.progress}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-8">{task.progress}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isExpanded && myTasks.length === 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/20">
                      No tasks assigned to you in this project
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default EmployeeProjects;
