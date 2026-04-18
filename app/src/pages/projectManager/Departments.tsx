// ============================================
// PM DEPARTMENTS (Area-scoped — Same as Admin but locked to PM's area)
// ============================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, Plus, Edit2, Trash2, Users, MapPin,
  ChevronDown, ChevronRight, Layers, UserMinus,
  ArrowRightLeft, Power, Eye, EyeOff, UserPlus, Check
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  createDepartment, deleteDepartment, updateDepartment,
  getDepartmentsByArea, getTeamsByDepartment, createTeam, deleteTeam, updateTeam,
  addTeamMember, removeTeamMember, transferTeamMember,
  getTeamMembers, getUsersAvailableForTeam, logActivity,
  seedDepartmentsAndTeams
} from '@/services/firestoreService';
import type { Department, Team, User } from '@/types';
import { toast } from 'sonner';
import { STANDARD_DEPARTMENTS, getTeamLimit } from '@/data/organizationData';
import { useAuth } from '@/context/AuthContext';
import { formatArea } from '@/data/areaData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getInitials, getAvatarColor, formatRole } from '@/utils/helpers';

const PMDepartments: React.FC = () => {
  const { userData } = useAuth();
  const pmArea = userData?.areaCode || '';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Department
  const [isAddDialogVisible, setIsAddDialogVisible] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  // Edit Department
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

  // Teams
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [deptTeams, setDeptTeams] = useState<Record<string, Team[]>>({});
  const [isAddTeamVisible, setIsAddTeamVisible] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [renamingTeam, setRenamingTeam] = useState<Team | null>(null);
  const [renameTeamName, setRenameTeamName] = useState('');

  // Members
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
  const [teamMembersList, setTeamMembersList] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Add Member — Enhanced with role filter + multi-select
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');

  // Transfer
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferUser, setTransferUser] = useState<User | null>(null);
  const [transferFromTeam, setTransferFromTeam] = useState<Team | null>(null);
  const [transferToTeamId, setTransferToTeamId] = useState('');
  const [allTeamsInArea, setAllTeamsInArea] = useState<Team[]>([]);

  useEffect(() => { if (pmArea) loadDepartments(); }, [pmArea]);

  const loadDepartments = async () => {
    if (!pmArea) return;
    try {
      setIsLoading(true);
      const data = await getDepartmentsByArea(pmArea);
      setDepartments(data);
    } catch { toast.error('Failed to load departments'); }
    finally { setIsLoading(false); }
  };

  const loadTeamsForDept = async (deptId: string) => {
    try {
      const teams = await getTeamsByDepartment(deptId);
      setDeptTeams(prev => ({ ...prev, [deptId]: teams }));
    } catch { console.error('Error loading teams'); }
  };

  const toggleExpand = (deptId: string) => {
    if (expandedDept === deptId) { setExpandedDept(null); setViewingTeam(null); }
    else { setExpandedDept(deptId); setViewingTeam(null); if (!deptTeams[deptId]) loadTeamsForDept(deptId); }
  };

  // Compute dynamic employee count from teams' memberIds
  const getDeptEmployeeCount = (deptId: string): number => {
    const teams = deptTeams[deptId];
    if (!teams) return departments.find(d => d.id === deptId)?.employeeCount || 0;
    return teams.reduce((sum, t) => sum + (t.memberIds?.length || 0), 0);
  };

  // ========== DEPARTMENT ==========
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department and all teams?')) return;
    try {
      await deleteDepartment(id);
      toast.success('Department deleted');
      loadDepartments();
    } catch { toast.error('Failed to delete'); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editDeptName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDepartment(editingDept.id, { name: editDeptName.trim() });
      toast.success('Renamed!');
      setIsEditDialogVisible(false);
      setEditingDept(null);
      loadDepartments();
    } catch { toast.error('Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setIsSubmitting(true);
    try {
      const deptConfig = STANDARD_DEPARTMENTS.find(d => d.name.toLowerCase() === newDeptName.trim().toLowerCase());
      const teamLimit = deptConfig?.teamLimit || getTeamLimit(newDeptName.trim());

      const deptId = await createDepartment({
        name: newDeptName.trim(), description: newDeptDesc.trim(),
        headId: userData?.uid || '', headName: userData?.name || '',
        employeeCount: 0, projectCount: 0,
        areaCode: pmArea, areaName: userData?.areaName || '',
        teamLimit, createdAt: new Date()
      });

      // Auto-create standard teams if this is a standard department
      if (deptConfig) {
        for (const teamName of deptConfig.standardTeams) {
          await createTeam({
            name: teamName, departmentId: deptId, departmentName: newDeptName.trim(),
            supervisorId: '', memberIds: [],
            areaCode: pmArea, areaName: userData?.areaName || '',
            status: 'active', createdAt: new Date()
          });
        }
        toast.success(`Department "${newDeptName}" created with ${deptConfig.standardTeams.length} teams!`);
      } else {
        toast.success(`Department "${newDeptName}" created!`);
      }

      setIsAddDialogVisible(false);
      setNewDeptName(''); setNewDeptDesc('');
      loadDepartments();
    } catch (error: any) { toast.error(error.message || 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleSeedStandard = async () => {
    if (!pmArea) return;
    setIsSubmitting(true);
    try {
      const result = await seedDepartmentsAndTeams(pmArea, userData?.areaName || '');
      toast.success(`✅ Created ${result.deptsCreated} departments + ${result.teamsCreated} teams!`);
      loadDepartments();
    } catch (error: any) { toast.error(error.message || 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  // ========== TEAM ==========
  const handleAddTeam = async (deptId: string) => {
    if (!newTeamName.trim()) return;
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    const existingTeams = deptTeams[deptId] || [];
    const teamLimit = dept.teamLimit || getTeamLimit(dept.name);
    if (existingTeams.length >= teamLimit) { toast.error(`Max ${teamLimit} teams`); return; }
    setIsSubmitting(true);
    try {
      await createTeam({
        name: newTeamName.trim(), departmentId: deptId, departmentName: dept.name,
        supervisorId: '', memberIds: [],
        areaCode: dept.areaCode || '', areaName: dept.areaName || '',
        status: 'active', createdAt: new Date()
      });
      toast.success(`Team "${newTeamName}" created!`);
      setNewTeamName(''); setIsAddTeamVisible(null);
      loadTeamsForDept(deptId);
    } catch { toast.error('Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteTeam = async (teamId: string, deptId: string) => {
    if (!confirm('Delete team?')) return;
    try { await deleteTeam(teamId); toast.success('Deleted'); loadTeamsForDept(deptId); }
    catch { toast.error('Failed'); }
  };

  const handleToggleTeamStatus = async (team: Team, deptId: string) => {
    try {
      await updateTeam(team.id, { status: team.status === 'active' ? 'inactive' : 'active' });
      toast.success(`Team ${team.status === 'active' ? 'deactivated' : 'activated'}`);
      loadTeamsForDept(deptId);
    } catch { toast.error('Failed'); }
  };

  const handleRenameTeam = async () => {
    if (!renamingTeam || !renameTeamName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateTeam(renamingTeam.id, { name: renameTeamName.trim() });
      toast.success('Renamed!');
      setRenamingTeam(null);
      if (expandedDept) loadTeamsForDept(expandedDept);
    } catch { toast.error('Failed'); }
    finally { setIsSubmitting(false); }
  };

  // ========== MEMBERS ==========
  const handleViewTeamMembers = async (team: Team) => {
    if (viewingTeam?.id === team.id) { setViewingTeam(null); return; }
    setViewingTeam(team);
    setIsLoadingMembers(true);
    try { setTeamMembersList(await getTeamMembers(team.id)); }
    catch { setTeamMembersList([]); }
    finally { setIsLoadingMembers(false); }
  };

  const openAddMemberDialog = async (team: Team) => {
    setAddMemberTeam(team);
    setSelectedUserIds([]);
    setMemberRoleFilter('all');
    setIsAddMemberOpen(true);
    setIsLoadingAvailable(true);
    try { setAvailableUsers(await getUsersAvailableForTeam(team.areaCode || '', team.id)); }
    catch { setAvailableUsers([]); }
    finally { setIsLoadingAvailable(false); }
  };

  // Multi-select toggle
  const toggleUserSelection = (uid: string) => {
    setSelectedUserIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Select/deselect all filtered users
  const handleSelectAllUsers = () => {
    const filtered = filteredAvailableUsers;
    const allSelected = filtered.every(u => selectedUserIds.includes(u.uid));
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !filtered.find(u => u.uid === id)));
    } else {
      const newIds = new Set([...selectedUserIds, ...filtered.map(u => u.uid)]);
      setSelectedUserIds(Array.from(newIds));
    }
  };

  // Filtered available users by role
  const filteredAvailableUsers = availableUsers.filter(u =>
    memberRoleFilter === 'all' || u.role === memberRoleFilter
  );

  // Batch add members
  const handleAddMembers = async () => {
    if (!addMemberTeam || selectedUserIds.length === 0) return;
    setIsSubmitting(true);
    try {
      let addedCount = 0;
      for (const userId of selectedUserIds) {
        await addTeamMember(addMemberTeam.id, userId);
        addedCount++;
      }
      toast.success(`${addedCount} member${addedCount > 1 ? 's' : ''} added to ${addMemberTeam.name}!`);
      if (userData?.uid) logActivity(userData.uid, userData.name, userData.role, 'TEAM_MEMBER_ADDED', `Added ${addedCount} member(s) to ${addMemberTeam.name}`, 'Team');
      setIsAddMemberOpen(false);
      handleViewTeamMembers(addMemberTeam);
      if (expandedDept) loadTeamsForDept(expandedDept);
    } catch { toast.error('Failed to add members'); }
    finally { setIsSubmitting(false); }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!viewingTeam || !confirm(`Remove ${userName}?`)) return;
    try {
      await removeTeamMember(viewingTeam.id, userId);
      toast.success('Removed');
      handleViewTeamMembers(viewingTeam);
      if (expandedDept) loadTeamsForDept(expandedDept);
    } catch { toast.error('Failed'); }
  };

  const openTransferDialog = async (user: User, fromTeam: Team) => {
    setTransferUser(user); setTransferFromTeam(fromTeam); setTransferToTeamId('');
    setIsTransferOpen(true);
    const allTeams: Team[] = [];
    for (const dept of departments) {
      const teams = deptTeams[dept.id] || await getTeamsByDepartment(dept.id);
      allTeams.push(...teams.filter(t => t.id !== fromTeam.id && t.status === 'active'));
    }
    setAllTeamsInArea(allTeams);
  };

  const handleTransfer = async () => {
    if (!transferUser || !transferFromTeam || !transferToTeamId) return;
    setIsSubmitting(true);
    try {
      await transferTeamMember(transferFromTeam.id, transferToTeamId, transferUser.uid);
      toast.success('Transferred!');
      setIsTransferOpen(false);
      if (viewingTeam) handleViewTeamMembers(viewingTeam);
      if (expandedDept) loadTeamsForDept(expandedDept);
    } catch { toast.error('Failed'); }
    finally { setIsSubmitting(false); }
  };

  const filtered = departments.filter(d => (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  if (!pmArea) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">No Area Assigned</h2>
          <p className="text-gray-500 mt-1">Contact Admin to assign you to an area.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Department Management</h1>
            <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mt-1">📍 {formatArea(pmArea, userData?.areaName)}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleSeedStandard} disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
              <Layers className="w-4 h-4" /> Seed Standard
            </button>
            <button onClick={() => setIsAddDialogVisible(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700">
              <Plus className="w-4 h-4" /><span className="text-sm font-medium">Add Department</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search departments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
        </div>

        {/* Departments */}
        {isLoading ? (
          <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" /></div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map((dept, index) => {
                const isExpanded = expandedDept === dept.id;
                const teams = deptTeams[dept.id] || [];
                const teamLimit = dept.teamLimit || getTeamLimit(dept.name);
                const dynamicCount = getDeptEmployeeCount(dept.id);
                return (
                  <motion.div key={dept.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(dept.id)}>
                        <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{dept.name}</h3>
                          <div className="flex items-center gap-3 flex-wrap mt-0.5">
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> {dynamicCount} employees</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Layers className="w-3 h-3" /> {teams.length}/{teamLimit} teams</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400 ml-auto" /> : <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />}
                      </div>
                      <div className="flex gap-1 ml-3">
                        <button onClick={() => { setEditingDept(dept); setEditDeptName(dept.name); setIsEditDialogVisible(true); }} className="p-2 text-gray-400 hover:text-teal-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(dept.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Teams ({teams.length}/{teamLimit})</h4>
                              {teams.length < teamLimit && (
                                <button onClick={() => setIsAddTeamVisible(isAddTeamVisible === dept.id ? null : dept.id)}
                                  className="text-xs text-teal-600 font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add Team</button>
                              )}
                            </div>
                            {isAddTeamVisible === dept.id && (
                              <div className="flex gap-2 mb-3">
                                <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team name..."
                                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTeam(dept.id); }} />
                                <button onClick={() => handleAddTeam(dept.id)} disabled={isSubmitting}
                                  className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50">Create</button>
                              </div>
                            )}
                            {teams.length === 0 ? (
                              <p className="text-xs text-gray-400 py-2">No teams yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {teams.map(team => (
                                  <div key={team.id}>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewTeamMembers(team)}>
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                                          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</p>
                                          <p className="text-xs text-gray-400">{team.memberIds?.length || 0} members</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${team.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{team.status}</span>
                                        <button onClick={() => handleViewTeamMembers(team)} className="p-1.5 text-gray-400 hover:text-blue-500">{viewingTeam?.id === team.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                                        <button onClick={() => openAddMemberDialog(team)} className="p-1.5 text-gray-400 hover:text-green-500"><UserPlus className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => { setRenamingTeam(team); setRenameTeamName(team.name); }} className="p-1.5 text-gray-400 hover:text-teal-500"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleToggleTeamStatus(team, dept.id)} className="p-1.5 text-gray-400 hover:text-orange-500"><Power className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDeleteTeam(team.id, dept.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </div>
                                    {viewingTeam?.id === team.id && (
                                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="ml-11 mt-1 p-3 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                        <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Members of {team.name}</h5>
                                        {isLoadingMembers ? (
                                          <div className="flex justify-center py-2"><div className="animate-spin w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full" /></div>
                                        ) : teamMembersList.length === 0 ? (
                                          <p className="text-xs text-gray-400 py-1">No members yet.</p>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {teamMembersList.map(member => (
                                              <div key={member.uid} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <div className="flex items-center gap-2">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ${getAvatarColor(member.name)}`}>{getInitials(member.name)}</div>
                                                  <div><p className="text-xs font-medium text-gray-900 dark:text-white">{member.name}</p><p className="text-[10px] text-gray-400">{formatRole(member.role)}</p></div>
                                                </div>
                                                <div className="flex gap-0.5">
                                                  <button onClick={() => openTransferDialog(member, team)} className="p-1 text-gray-400 hover:text-blue-500"><ArrowRightLeft className="w-3 h-3" /></button>
                                                  <button onClick={() => handleRemoveMember(member.uid, member.name)} className="p-1 text-gray-400 hover:text-red-500"><UserMinus className="w-3 h-3" /></button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No departments in your area.</p>
            <button onClick={handleSeedStandard} disabled={isSubmitting} className="mt-3 text-sm text-teal-600 font-medium">+ Seed standard departments</button>
          </div>
        )}

        {/* Add Department Dialog */}
        <Dialog open={isAddDialogVisible} onOpenChange={setIsAddDialogVisible}>
          <DialogContent><DialogHeader><DialogTitle>Add Department</DialogTitle><DialogDescription>Create a department in your area ({pmArea})</DialogDescription></DialogHeader>
            <form onSubmit={handleAddDepartment} className="space-y-4 py-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department Name *</label>
                <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} required list="std-depts" placeholder="e.g. System, Operations..."
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                <datalist id="std-depts">{STANDARD_DEPARTMENTS.map(d => (<option key={d.name} value={d.name} />))}</datalist>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={newDeptDesc} onChange={(e) => setNewDeptDesc(e.target.value)} rows={3}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 resize-none text-gray-900 dark:text-white" />
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setIsAddDialogVisible(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Create</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dept */}
        <Dialog open={isEditDialogVisible} onOpenChange={setIsEditDialogVisible}>
          <DialogContent><DialogHeader><DialogTitle>Rename Department</DialogTitle></DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
              <input type="text" value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} required
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
              <DialogFooter>
                <button type="button" onClick={() => setIsEditDialogVisible(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button type="submit" disabled={isSubmitting || !editDeptName.trim()} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Save</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Rename Team */}
        <Dialog open={!!renamingTeam} onOpenChange={() => setRenamingTeam(null)}>
          <DialogContent><DialogHeader><DialogTitle>Rename Team</DialogTitle></DialogHeader>
            <div className="py-4"><input type="text" value={renameTeamName} onChange={(e) => setRenameTeamName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" /></div>
            <DialogFooter>
              <button onClick={() => setRenamingTeam(null)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleRenameTeam} disabled={isSubmitting || !renameTeamName.trim()} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Rename</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Add Member — Role Filter + Multi-Select Checkboxes */}
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Members to {addMemberTeam?.name}</DialogTitle>
              <DialogDescription>Select role and choose one or more members to add.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {isLoadingAvailable ? (
                <div className="flex justify-center py-4"><div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" /></div>
              ) : availableUsers.length === 0 ? (
                <p className="text-sm text-amber-500 py-2">No available users in this area without a team assignment.</p>
              ) : (
                <>
                  {/* Role Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filter by Role</label>
                    <select value={memberRoleFilter} onChange={(e) => setMemberRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
                      <option value="all">All Roles ({availableUsers.length})</option>
                      <option value="employee">Employee ({availableUsers.filter(u => u.role === 'employee').length})</option>
                      <option value="intern">Intern ({availableUsers.filter(u => u.role === 'intern').length})</option>
                      <option value="apprentice">Apprentice ({availableUsers.filter(u => u.role === 'apprentice').length})</option>
                    </select>
                  </div>

                  {/* Select All / Count */}
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={handleSelectAllUsers}
                      className="flex items-center gap-2 text-xs font-medium text-teal-600 hover:text-teal-700">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${filteredAvailableUsers.length > 0 && filteredAvailableUsers.every(u => selectedUserIds.includes(u.uid)) ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-gray-600'}`}>
                        {filteredAvailableUsers.length > 0 && filteredAvailableUsers.every(u => selectedUserIds.includes(u.uid)) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      Select All
                    </button>
                    {selectedUserIds.length > 0 && (
                      <span className="text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-full">
                        {selectedUserIds.length} selected
                      </span>
                    )}
                  </div>

                  {/* User Checkbox List */}
                  <div className="max-h-56 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded-xl p-2">
                    {filteredAvailableUsers.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2 text-center">No users match this filter.</p>
                    ) : filteredAvailableUsers.map(u => (
                      <button key={u.uid} type="button" onClick={() => toggleUserSelection(u.uid)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${selectedUserIds.includes(u.uid) ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedUserIds.includes(u.uid) ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-gray-600'}`}>
                          {selectedUserIds.includes(u.uid) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 ${getAvatarColor(u.name)}`}>
                          {getInitials(u.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                          u.role === 'employee' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          u.role === 'intern' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>{formatRole(u.role)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <button onClick={() => setIsAddMemberOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleAddMembers} disabled={isSubmitting || selectedUserIds.length === 0}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : `Add ${selectedUserIds.length || ''} Member${selectedUserIds.length !== 1 ? 's' : ''}`}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer */}
        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogContent><DialogHeader><DialogTitle>Transfer {transferUser?.name}</DialogTitle>
            <DialogDescription>From "{transferFromTeam?.name}" to another team</DialogDescription></DialogHeader>
            <div className="py-4">
              {allTeamsInArea.length === 0 ? <p className="text-sm text-amber-500">No other teams available.</p>
              : <select value={transferToTeamId} onChange={(e) => setTransferToTeamId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                  <option value="">Select team</option>
                  {allTeamsInArea.map(t => (<option key={t.id} value={t.id}>{t.name} ({t.departmentName})</option>))}
                </select>}
            </div>
            <DialogFooter>
              <button onClick={() => setIsTransferOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleTransfer} disabled={isSubmitting || !transferToTeamId} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Transfer</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PMDepartments;
