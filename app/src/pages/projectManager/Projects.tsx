// PM PROJECTS PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Search, Calendar, MoreVertical, Play, Pause, CheckCircle, Trash2, AlertTriangle, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { getProjectsByManager, updateProject, deleteProject, getUsersByDepartment } from '@/services/firestoreService';
import type { Project, User } from '@/types';
import { toast } from 'sonner';
import { formatDate, getInitials, getAvatarColor } from '@/utils/helpers';

const PMProjects: React.FC = () => {
  const { userData } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Action States
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Manage Members States
  const [projectToManageMembers, setProjectToManageMembers] = useState<Project | null>(null);
  const [departmentUsers, setDepartmentUsers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);
  const loadData = async () => {
    try { setIsLoading(true); setProjects(await getProjectsByManager(userData!.uid)); }
    catch { toast.error('Failed to load projects'); }
    finally { setIsLoading(false); }
  };

  const handleStatusChange = async (project: Project, newStatus: Project['status']) => {
    try {
      setIsActionLoading(true);
      await updateProject(project.id, { status: newStatus });
      toast.success(`Project marked as ${newStatus.replace('_', ' ')}`);
      setProjects(projects.map(p => p.id === project.id ? { ...p, status: newStatus } : p));
    } catch (error) {
      toast.error('Failed to update project status');
    } finally {
      setIsActionLoading(false);
      setActiveDropdown(null);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      setIsActionLoading(true);
      await deleteProject(projectToDelete.id);
      toast.success('Project deleted successfully');
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenManageMembers = async (project: Project) => {
    setActiveDropdown(null);
    setProjectToManageMembers(project);
    setSelectedMemberIds(project.teamMembers || []);
    setIsUsersLoading(true);
    try {
      const users = await getUsersByDepartment(project.departmentId);
      // Filter out users who are admins, hrs or the manager themselves
      setDepartmentUsers(users.filter(u => !['admin', 'hr', 'general_manager', 'project_manager'].includes(u.role)));
    } catch {
      toast.error('Failed to load department employees');
    } finally {
      setIsUsersLoading(false);
    }
  };

  const toggleMember = (uid: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSaveMembers = async () => {
    if (!projectToManageMembers) return;
    try {
      setIsActionLoading(true);
      await updateProject(projectToManageMembers.id, { teamMembers: selectedMemberIds });
      toast.success('Project members updated successfully');
      setProjects(projects.map(p => p.id === projectToManageMembers.id ? { ...p, teamMembers: selectedMemberIds } : p));
      setProjectToManageMembers(null);
    } catch {
      toast.error('Failed to update members');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage all your assigned projects</p></div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
            <option value="all">All Status</option><option value="active">Active</option><option value="completed">Completed</option><option value="planning">Planning</option><option value="on_hold">On Hold</option>
          </select>
        </div>
        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800"><FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No projects found</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="pr-8">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                      p.status === 'active' ? 'bg-green-100 text-green-700' : 
                      p.status === 'completed' ? 'bg-blue-100 text-blue-700' : 
                      p.status === 'on_hold' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {p.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Actions Dropdown */}
                  <div className="absolute top-6 right-4" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === p.id ? null : p.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {activeDropdown === p.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-10 overflow-hidden">
                        {p.status !== 'active' && (
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleStatusChange(p, 'active')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                          >
                            <Play className="w-4 h-4 text-green-500" /> Resume Project
                          </button>
                        )}
                        {p.status !== 'on_hold' && p.status !== 'completed' && (
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleStatusChange(p, 'on_hold')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                          >
                            <Pause className="w-4 h-4 text-orange-500" /> Put on Hold
                          </button>
                        )}
                        {p.status !== 'completed' && (
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleStatusChange(p, 'completed')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4 text-blue-500" /> Mark Completed
                          </button>
                        )}
                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleOpenManageMembers(p)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                        >
                          <Users className="w-4 h-4 text-indigo-500" /> Manage Members
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                        <button
                          disabled={isActionLoading}
                          onClick={() => { setActiveDropdown(null); setProjectToDelete(p); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Project
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">{p.description}</p>
                <div className="mb-4"><div className="flex justify-between mb-1"><span className="text-sm text-gray-500">Progress</span><span className="text-sm font-medium">{p.progress}%</span></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"><motion.div initial={{ width: 0 }} animate={{ width: `${p.progress}%` }} className="h-full bg-teal-500 rounded-full" /></div></div>
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-4"><Calendar className="w-4 h-4" /><span>Due {formatDate(p.deadline)}</span></div>
                
                {/* Members Avatars preview */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {p.teamMembers?.length ? `${p.teamMembers.length} members assigned` : 'No members assigned'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle>Delete Project</DialogTitle>
                  <DialogDescription className="mt-1">
                    Are you sure you want to delete this project? All associated tasks will be orphaned.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {projectToDelete && (
              <div className="my-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">{projectToDelete.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{projectToDelete.description}</p>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Members Modal */}
        <Dialog open={!!projectToManageMembers} onOpenChange={(open) => !open && setProjectToManageMembers(null)}>
          <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Manage Project Members</DialogTitle>
              <DialogDescription>
                Assign employees, interns, or apprentices from {projectToManageMembers?.departmentName} to this project.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-2 my-2 space-y-2">
              {isUsersLoading ? (
                <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
              ) : departmentUsers.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  No eligible employees found in this department.
                </div>
              ) : (
                departmentUsers.map(user => {
                  const isSelected = selectedMemberIds.includes(user.uid);
                  return (
                    <div 
                      key={user.uid}
                      onClick={() => toggleMember(user.uid)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(user.name)}`}>
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className={`font-medium ${isSelected ? 'text-teal-900 dark:text-teal-100' : 'text-gray-900 dark:text-white'}`}>
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-teal-500 bg-teal-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setProjectToManageMembers(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMembers}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center gap-2"
                disabled={isActionLoading || isUsersLoading}
              >
                {isActionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Save Members
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};
export default PMProjects;
