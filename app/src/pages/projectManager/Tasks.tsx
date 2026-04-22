// ============================================
// PM TASKS — Multi-Team Task Assignment
// ============================================

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Plus, Edit2, Trash2, Search, Filter,
  Building2, Users as UsersIcon, User as UserIcon,
  ChevronDown, Clock, AlertCircle, Check
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
  getDepartmentsByArea, getTeamsByDepartment, getTeamMembers,
  createTask, updateTask, deleteTask, getTasksByArea,
  logActivity
} from '@/services/firestoreService';
import type { Department, Team, Task, User } from '@/types';
import { toast } from 'sonner';
import { formatArea } from '@/data/areaData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getInitials, getAvatarColor, formatRole } from '@/utils/helpers';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
};

const LEVEL_ICONS: Record<string, React.ElementType> = {
  department: Building2,
  team: UsersIcon,
  multi_team: UsersIcon,
  member: UserIcon
};

const PMTasks: React.FC = () => {
  const { userData } = useAuth();
  const pmArea = userData?.areaCode || '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Create/Edit Task Dialog
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeptId, setTaskDeptId] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [taskMemberId, setTaskMemberId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskStatus, setTaskStatus] = useState<'pending' | 'in_progress' | 'review' | 'completed'>('pending');

  // Cascading dropdown data
  const [deptTeams, setDeptTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);

  useEffect(() => { if (pmArea) loadData(); }, [pmArea]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [depts, tasksData] = await Promise.all([
        getDepartmentsByArea(pmArea),
        getTasksByArea(pmArea)
      ]);
      setDepartments(depts);
      setTasks(tasksData);
    } catch { toast.error('Failed to load data'); }
    finally { setIsLoading(false); }
  };

  // Cascading: Department change
  const handleDeptChange = async (deptId: string) => {
    setTaskDeptId(deptId);
    setSelectedTeamIds([]);
    setTaskMemberId('');
    setDeptTeams([]);
    setTeamMembers([]);
    if (!deptId) return;
    setIsLoadingTeams(true);
    try { setDeptTeams(await getTeamsByDepartment(deptId)); }
    catch { setDeptTeams([]); }
    finally { setIsLoadingTeams(false); }
  };

  // Toggle team selection
  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds(prev => {
      const next = prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId];
      // If more than 1 team, clear member selection
      if (next.length !== 1) {
        setTaskMemberId('');
        setTeamMembers([]);
      }
      return next;
    });
  };

  // Load members when exactly 1 team selected
  useEffect(() => {
    if (selectedTeamIds.length === 1) {
      setIsLoadingMembers(true);
      getTeamMembers(selectedTeamIds[0])
        .then(members => setTeamMembers(members))
        .catch(() => setTeamMembers([]))
        .finally(() => setIsLoadingMembers(false));
    } else {
      setTeamMembers([]);
      setTaskMemberId('');
    }
  }, [selectedTeamIds]);

  // Select / deselect all teams
  const handleSelectAllTeams = () => {
    const activeTeams = deptTeams.filter(t => t.status === 'active');
    if (selectedTeamIds.length === activeTeams.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(activeTeams.map(t => t.id));
    }
  };

  // Determine assignment level
  const getAssignmentLevel = (): 'department' | 'team' | 'multi_team' | 'member' => {
    if (taskMemberId) return 'member';
    if (selectedTeamIds.length > 1) return 'multi_team';
    if (selectedTeamIds.length === 1) return 'team';
    return 'department';
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingTask(null);
    setTaskTitle(''); setTaskDesc(''); setTaskDeptId(''); setSelectedTeamIds([]); setTaskMemberId(''); setTaskStartDate('');
    setTaskPriority('medium'); setTaskDeadline(''); setTaskStatus('pending');
    setDeptTeams([]); setTeamMembers([]);
    setIsTaskDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = async (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskDeadline(task.dueDate ? new Date(typeof task.dueDate === 'object' && 'toDate' in task.dueDate ? (task.dueDate as any).toDate() : task.dueDate).toISOString().split('T')[0] : '');
    setTaskDeptId(task.departmentId || '');
    // Support both old single teamId and new teamIds array
    const teamIds = (task as any).teamIds || (task.teamId ? [task.teamId] : []);
    setSelectedTeamIds(teamIds);
    setTaskMemberId(task.employeeId || '');
    // Load cascade data
    if (task.departmentId) {
      try { setDeptTeams(await getTeamsByDepartment(task.departmentId)); } catch { setDeptTeams([]); }
    }
    if (teamIds.length === 1) {
      try { setTeamMembers(await getTeamMembers(teamIds[0])); } catch { setTeamMembers([]); }
    }
    setIsTaskDialogOpen(true);
  };

  // Submit create/edit
  const handleSubmitTask = async () => {
    if (!taskTitle.trim() || !taskDeptId) { toast.error('Title and Department are required'); return; }
    setIsSubmitting(true);
    const level = getAssignmentLevel();
    const dept = departments.find(d => d.id === taskDeptId);
    const member = teamMembers.find(m => m.uid === taskMemberId);

    try {
      if (level === 'multi_team') {
        // Create one task per selected team
        for (const teamId of selectedTeamIds) {
          const team = deptTeams.find(t => t.id === teamId);
          const taskData: any = {
            title: taskTitle.trim(),
            description: taskDesc.trim(),
            departmentId: taskDeptId,
            departmentName: dept?.name || '',
            teamId: teamId,
            teamName: team?.name || '',
            teamIds: selectedTeamIds,
            employeeId: '',
            employeeName: '',
            priority: taskPriority,
            status: taskStatus,
            assignmentLevel: 'team',
            areaCode: pmArea,
            projectId: '',
            projectName: '',
            assignedBy: userData?.uid || '',
            assignedByName: userData?.name || '',
            dueDate: taskDeadline ? new Date(taskDeadline) : null,
            updatedAt: new Date(),
            assignedAt: taskStartDate ? new Date(taskStartDate) : new Date(),
            createdAt: new Date(),
            progress: 0
          };
          await createTask(taskData);
        }
        toast.success(`Task created for ${selectedTeamIds.length} teams!`);
        if (userData?.uid) logActivity(userData.uid, userData.name, userData.role, 'TASK_CREATED', `Created task: ${taskTitle} (multi-team: ${selectedTeamIds.length} teams)`, 'Task');
      } else {
        // Single task
        const team = selectedTeamIds.length === 1 ? deptTeams.find(t => t.id === selectedTeamIds[0]) : null;
        const taskData: any = {
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          departmentId: taskDeptId,
          departmentName: dept?.name || '',
          teamId: selectedTeamIds[0] || '',
          teamName: team?.name || '',
          teamIds: selectedTeamIds,
          employeeId: taskMemberId || '',
          employeeName: member?.name || '',
          priority: taskPriority,
          status: taskStatus,
          assignmentLevel: level,
          areaCode: pmArea,
          projectId: '',
          projectName: '',
          assignedBy: userData?.uid || '',
          assignedByName: userData?.name || '',
          dueDate: taskDeadline ? new Date(taskDeadline) : null,
          updatedAt: new Date()
        };

        if (editingTask) {
          await updateTask(editingTask.id, taskData);
          toast.success('Task updated!');
          if (userData?.uid) logActivity(userData.uid, userData.name, userData.role, 'TASK_UPDATED', `Updated task: ${taskTitle}`, 'Task');
        } else {
          taskData.assignedAt = taskStartDate ? new Date(taskStartDate) : new Date();
          taskData.createdAt = new Date();
          taskData.progress = 0;
          await createTask(taskData);
          toast.success('Task created!');
          if (userData?.uid) logActivity(userData.uid, userData.name, userData.role, 'TASK_CREATED', `Created task: ${taskTitle} (${level}-level)`, 'Task');
        }
      }
      setIsTaskDialogOpen(false);
      loadData();
    } catch { toast.error('Failed to save task'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if (!confirm(`Delete task "${taskName}"?`)) return;
    try {
      await deleteTask(taskId);
      toast.success('Task deleted');
      loadData();
    } catch { toast.error('Failed'); }
  };

  const handleQuickStatusUpdate = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'review' | 'completed') => {
    try {
      await updateTask(taskId, { status: newStatus, updatedAt: new Date() as any, ...(newStatus === 'completed' ? { completedAt: new Date() as any, progress: 100 } : {}) });
      toast.success(`Status → ${newStatus.replace('_', ' ')}`);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch { toast.error('Failed'); }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.departmentName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = filterDept === 'all' || t.departmentId === filterDept;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
      return matchSearch && matchDept && matchStatus && matchPriority;
    });
  }, [tasks, searchQuery, filterDept, filterStatus, filterPriority]);

  const stats = [
    { label: 'Total', value: tasks.length, color: 'text-gray-900 dark:text-white' },
    { label: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: 'text-yellow-600' },
    { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600' },
    { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'text-green-600' }
  ];

  const activeTeams = deptTeams.filter(t => t.status === 'active');

  // Get selected team names for display
  const getSelectedTeamLabel = () => {
    if (selectedTeamIds.length === 0) return 'Entire Department (no team selected)';
    if (selectedTeamIds.length === 1) {
      const t = deptTeams.find(t => t.id === selectedTeamIds[0]);
      return t?.name || '1 team';
    }
    return `${selectedTeamIds.length} teams selected`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Task Management</h1>
            <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">📍 {formatArea(pmArea, userData?.areaName)}</p>
          </div>
          <button onClick={openCreateDialog}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors">
            <Plus className="w-4 h-4" /><span className="text-sm font-medium">Create Task</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Filter className="w-4 h-4" /><span className="text-sm">Filters</span>
            {(filterDept !== 'all' || filterStatus !== 'all' || filterPriority !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-teal-500" />
            )}
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilterPanel && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                  <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
                    <option value="all">All Departments</option>
                    {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option><option value="in_progress">In Progress</option>
                    <option value="review">Review</option><option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option><option value="medium">Medium</option>
                    <option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <button onClick={() => { setFilterDept('all'); setFilterStatus('all'); setFilterPriority('all'); }}
                className="mt-3 text-xs text-teal-600 font-medium hover:text-teal-700">Clear all filters</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task List */}
        {isLoading ? (
          <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" /></div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{tasks.length === 0 ? 'No tasks yet. Create your first task!' : 'No tasks match your filters.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task, index) => {
              const LevelIcon = LEVEL_ICONS[task.assignmentLevel || 'member'] || UserIcon;
              const deadline = task.dueDate ? new Date(typeof task.dueDate === 'object' && 'toDate' in task.dueDate ? (task.dueDate as any).toDate() : task.dueDate) : null;
              const isOverdue = deadline && deadline < new Date() && task.status !== 'completed';

              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border ${isOverdue ? 'border-red-200 dark:border-red-900/30' : 'border-gray-100 dark:border-gray-800'} p-4 hover:shadow-md transition-shadow`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{task.title}</h3>
                        {isOverdue && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      </div>
                      {task.description && <p className="text-sm text-gray-500 line-clamp-1 mb-2">{task.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <LevelIcon className="w-3 h-3" />
                          {task.assignmentLevel || 'member'}
                        </span>
                        {task.departmentName && <span className="text-[10px] text-gray-400">📁 {task.departmentName}</span>}
                        {task.teamName && <span className="text-[10px] text-gray-400">👥 {task.teamName}</span>}
                        {task.employeeName && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-semibold ${getAvatarColor(task.employeeName)}`}>
                              {getInitials(task.employeeName)}
                            </div>
                            {task.employeeName}
                          </span>
                        )}
                        {deadline && (
                          <span className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            <Clock className="w-3 h-3" />{deadline.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Quick status */}
                      <select value={task.status} onChange={e => handleQuickStatusUpdate(task.id, e.target.value as any)}
                        className="px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
                        <option value="pending">Pending</option><option value="in_progress">In Progress</option>
                        <option value="review">Review</option><option value="completed">Completed</option>
                      </select>
                      <button onClick={() => openEditDialog(task)} className="p-2 text-gray-400 hover:text-teal-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteTask(task.id, task.title)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Task Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task details and assignment' : 'Assign a task to a department, team(s), or specific member'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title *</label>
                <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Enter task title"
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={3} placeholder="Task details..."
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 resize-none text-gray-900 dark:text-white" />
              </div>

              {/* Cascading: Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />Department *
                </label>
                <select value={taskDeptId} onChange={e => handleDeptChange(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                  <option value="">Select Department</option>
                  {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>

              {/* Multi-select Team picker */}
              {taskDeptId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <UsersIcon className="w-4 h-4 inline mr-1" />Team(s) <span className="text-gray-400">(optional — select one or more)</span>
                  </label>
                  {isLoadingTeams ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-gray-400"><div className="animate-spin w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full" /> Loading teams...</div>
                  ) : activeTeams.length === 0 ? (
                    <p className="text-sm text-amber-500 py-2">No active teams in this department.</p>
                  ) : (
                    <div className="relative">
                      {/* Custom multi-select trigger */}
                      <button type="button" onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                        className="w-full text-left px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white flex items-center justify-between">
                        <span className={selectedTeamIds.length === 0 ? 'text-gray-400' : ''}>
                          {getSelectedTeamLabel()}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTeamDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown */}
                      <AnimatePresence>
                        {showTeamDropdown && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {/* Select All */}
                            <button type="button" onClick={handleSelectAllTeams}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-b border-gray-100 dark:border-gray-700">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTeamIds.length === activeTeams.length ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                {selectedTeamIds.length === activeTeams.length && <Check className="w-3 h-3 text-white" />}
                              </div>
                              {selectedTeamIds.length === activeTeams.length ? 'Deselect All' : 'Select All'}
                            </button>
                            {activeTeams.map(team => (
                              <button key={team.id} type="button" onClick={() => toggleTeamSelection(team.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedTeamIds.includes(team.id) ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                  {selectedTeamIds.includes(team.id) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{team.name}</p>
                                  <p className="text-[10px] text-gray-400">{team.memberIds?.length || 0} members</p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {/* Member selection — only when exactly 1 team selected */}
              {selectedTeamIds.length === 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <UserIcon className="w-4 h-4 inline mr-1" />Member <span className="text-gray-400">(optional)</span>
                  </label>
                  {isLoadingMembers ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-gray-400"><div className="animate-spin w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full" /> Loading members...</div>
                  ) : (
                    <select value={taskMemberId} onChange={e => setTaskMemberId(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                      <option value="">Entire Team</option>
                      {teamMembers.map(m => (<option key={m.uid} value={m.uid}>{m.name} — {formatRole(m.role)}</option>))}
                    </select>
                  )}
                </div>
              )}

              {/* Assignment Level Indicator */}
              {taskDeptId && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800">
                  <ChevronDown className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
                    Assignment Level: <strong className="capitalize">{getAssignmentLevel().replace('_', ' ')}</strong>
                    {getAssignmentLevel() === 'department' && ' — Task visible to entire department'}
                    {getAssignmentLevel() === 'team' && ' — Task visible to entire team'}
                    {getAssignmentLevel() === 'multi_team' && ` — Task assigned to ${selectedTeamIds.length} teams (creates ${selectedTeamIds.length} tasks)`}
                    {getAssignmentLevel() === 'member' && ' — Task assigned to specific member'}
                  </span>
                </div>
              )}

              {/* Start Date + End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                  <input type="date" value={taskStartDate} onChange={e => setTaskStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                  <input type="date" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white" />
                </div>
              </div>

              {/* Priority + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
                    <option value="low">Low</option><option value="medium">Medium</option>
                    <option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={taskStatus} onChange={e => setTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
                    <option value="pending">Pending</option><option value="in_progress">In Progress</option>
                    <option value="review">Review</option><option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setIsTaskDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleSubmitTask} disabled={isSubmitting || !taskTitle.trim() || !taskDeptId}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PMTasks;
