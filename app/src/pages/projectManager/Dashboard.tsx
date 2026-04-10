// ============================================
// PROJECT MANAGER DASHBOARD — FULLY FUNCTIONAL
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanban, CheckSquare, Users, Clock, Plus, ChevronRight, Search, Filter, Calendar, MessageSquare
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getProjectsByManager, getTasksByProject, getAllUsers, createProject, createTask, getDailyWorkByEmployee } from '@/services/firestoreService';
import type { Project, Task, User, DailyWork } from '@/types';
import { toast } from 'sonner';
import { formatDate, getInitials, getAvatarColor } from '@/utils/helpers';
import { formatArea } from '@/data/areaData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ProjectManagerDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<DailyWork[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Form states
  const [newProject, setNewProject] = useState({ name: '', description: '', departmentId: '', priority: 'medium' as const, deadline: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', employeeId: '', priority: 'medium' as const, dueDate: '' });

  useEffect(() => { loadData(); }, [userData]);

  const loadData = async () => {
    if (!userData?.uid) return;
    try {
      const [projectsData, usersData] = await Promise.all([
        getProjectsByManager(userData.uid), getAllUsers()
      ]);
      setProjects(projectsData);
      setTeamMembers(usersData.filter(u => ['employee', 'intern', 'apprentice'].includes(u.role)));
      // Parallel task fetch
      const taskResults = await Promise.all(projectsData.map(p => getTasksByProject(p.id)));
      const allTasks = taskResults.flat();
      setTasks(allTasks);

      // Fetch recent daily work for team members involved in PM's projects
      const empIds = [...new Set(allTasks.map(t => t.employeeId))];
      if (empIds.length > 0) {
        const workResults = await Promise.all(empIds.map(id => getDailyWorkByEmployee(id)));
        setSubmissions(workResults.flat().sort((a, b) => {
          const dA = (a.date as any)?.toDate?.() || new Date(a.date);
          const dB = (b.date as any)?.toDate?.() || new Date(b.date);
          return dB.getTime() - dA.getTime();
        }));
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally { }
  };

  const handleCreateProject = async () => {
    if (!userData?.uid) return;
    try {
      await createProject({
        name: newProject.name, description: newProject.description,
        departmentId: newProject.departmentId || userData.departmentId || '',
        departmentName: userData.department || '',
        assignedManagerId: userData.uid, assignedManagerName: userData.name,
        status: 'planning', progress: 0, priority: newProject.priority,
        startDate: new Date(), deadline: new Date(newProject.deadline),
        createdAt: new Date(), updatedAt: new Date()
      });
      toast.success('Project created successfully');
      setIsProjectDialogOpen(false);
      setNewProject({ name: '', description: '', departmentId: '', priority: 'medium', deadline: '' });
      loadData();
    } catch { toast.error('Failed to create project'); }
  };

  const handleCreateTask = async () => {
    if (!selectedProject) return;
    try {
      const employee = teamMembers.find(m => m.uid === newTask.employeeId);
      await createTask({
        projectId: selectedProject.id, projectName: selectedProject.name,
        employeeId: newTask.employeeId, employeeName: employee?.name || '',
        title: newTask.title, description: newTask.description,
        status: 'pending', priority: newTask.priority, progress: 0,
        assignedBy: userData?.uid || '', assignedAt: new Date(),
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
        createdAt: new Date(), updatedAt: new Date()
      });
      toast.success('Task assigned successfully');
      setIsTaskDialogOpen(false);
      setNewTask({ title: '', description: '', employeeId: '', priority: 'medium', dueDate: '' });
      loadData();
    } catch { toast.error('Failed to create task'); }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.departmentName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  // Member performance chart
  const memberPerformance = useMemo(() => {
    const members = new Map<string, { name: string; completed: number; pending: number; inProgress: number }>();
    tasks.forEach(t => {
      if (!members.has(t.employeeId)) {
        members.set(t.employeeId, { name: t.employeeName?.split(' ')[0] || 'Unknown', completed: 0, pending: 0, inProgress: 0 });
      }
      const m = members.get(t.employeeId)!;
      if (t.status === 'completed') m.completed++;
      else if (t.status === 'in_progress') m.inProgress++;
      else m.pending++;
    });
    return Array.from(members.values()).slice(0, 8);
  }, [tasks]);

  const stats = [
    { title: 'Active Projects', value: activeProjects, icon: FolderKanban, color: 'bg-blue-500' },
    { title: 'Completed', value: completedProjects, icon: CheckSquare, color: 'bg-green-500' },
    { title: 'Pending Tasks', value: pendingTasks, icon: Clock, color: 'bg-orange-500' },
    { title: 'Team Members', value: teamMembers.length, icon: Users, color: 'bg-purple-500' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Project Manager Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {userData?.name}. Manage your projects and team.</p>
            {userData?.areaCode && (
              <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mt-1">
                📍 {formatArea(userData.areaCode, userData.areaName)}
              </p>
            )}
          </div>
          <button onClick={() => setIsProjectDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors">
            <Plus className="w-4 h-4" /><span className="text-sm font-medium">New Project</span>
          </button>
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

        {/* Team Performance Chart */}
        {memberPerformance.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team Member Performance</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberPerformance}>
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
          </motion.div>
        )}

        {/* Projects Grid */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Projects ({filteredProjects.length})</h3>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
              </div>
              <div className="relative">
                <button onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">{statusFilter === 'all' ? 'Filter' : statusFilter}</span>
                </button>
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 w-40">
                    {['all', 'active', 'planning', 'completed', 'on_hold', 'cancelled'].map(s => (
                      <button key={s} onClick={() => { setStatusFilter(s); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${statusFilter === s ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        {s === 'all' ? 'All Status' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{searchQuery || statusFilter !== 'all' ? 'No projects match your filters' : 'No projects yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project, index) => {
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                const pCompleted = projectTasks.filter(t => t.status === 'completed').length;
                return (
                  <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.05 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div><h4 className="font-semibold text-gray-900 dark:text-white">{project.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{project.departmentName}</p></div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>{project.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{project.description}</p>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Progress</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${project.progress}%` }} transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-4 h-4" /><span>Due {formatDate(project.deadline)}</span>
                      </div>
                      <span className="text-xs text-gray-400">{pCompleted}/{projectTasks.length} tasks</span>
                    </div>
                    <button onClick={() => { setSelectedProject(project); setIsTaskDialogOpen(true); }}
                      className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium py-2 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/10">
                      Add Task <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Tasks ({tasks.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200 dark:border-gray-800">
                {['Task','Project','Assigned To','Status','Progress'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {tasks.slice(0, 8).map(task => (
                  <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800/50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      {task.employeeComment && (
                        <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 flex items-start gap-1">
                          <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="max-w-[200px] truncate" title={task.employeeComment}>{task.employeeComment}</span>
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{task.projectName}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(task.employeeName)}`}>{getInitials(task.employeeName)}</div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{task.employeeName}</span>
                      </div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Recent Work Submissions Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Work Submissions</h3>
          </div>
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <FolderKanban className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No recent work submitted by team members.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
              {submissions.map(work => (
                <div key={work.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(work.employeeName)}`}>{getInitials(work.employeeName)}</div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{work.employeeName}</p>
                        <p className="text-xs text-gray-500">{formatDate(work.date)}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {work.hoursWorked}h
                    </span>
                  </div>
                  {work.projectName && (
                    <span className="inline-block px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-[10px] text-gray-500 mb-2 bg-white dark:bg-gray-800">
                      {work.projectName}
                    </span>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{work.description}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Create Project Dialog */}
        <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Project</DialogTitle><DialogDescription>Fill in the details to create a new project</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
                <input type="text" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" placeholder="Enter project name" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" rows={3} placeholder="Enter project description" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select value={newProject.priority} onChange={e => setNewProject({ ...newProject, priority: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deadline</label>
                  <input type="date" value={newProject.deadline} onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" /></div>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setIsProjectDialogOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleCreateProject} disabled={!newProject.name || !newProject.deadline} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Create Project</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Task Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Assign New Task</DialogTitle><DialogDescription>Assign a task to a team member for {selectedProject?.name}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Title</label>
                <input type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" placeholder="Enter task title" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" rows={3} placeholder="Enter task description" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</label>
                <select value={newTask.employeeId} onChange={e => setNewTask({ ...newTask, employeeId: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                  <option value="">Select team member</option>
                  {teamMembers.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                  <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" /></div>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setIsTaskDialogOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleCreateTask} disabled={!newTask.title || !newTask.employeeId} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Assign Task</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ProjectManagerDashboard;
