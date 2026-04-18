// ============================================
// ADMIN DEPARTMENTS (Area-scoped + Teams + Members)
// Fixed structure: 6 departments × fixed teams per area
// ============================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, Plus, Edit2, Trash2, Users, MapPin,
  ChevronDown, ChevronRight, Layers, UserPlus, UserMinus,
  ArrowRightLeft, Power, Eye, EyeOff, Zap, CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  getAllDepartments, createDepartment, deleteDepartment, updateDepartment,
  getDepartmentsByArea, getTeamsByDepartment, createTeam, deleteTeam, updateTeam,
  addTeamMember, removeTeamMember, transferTeamMember,
  getTeamMembers, getUsersAvailableForTeam, logActivity,
  seedDepartmentsAndTeams
} from '@/services/firestoreService';
import type { Department, Team, User } from '@/types';
import { toast } from 'sonner';
import { AREAS } from '@/data/areaData';
import { STANDARD_DEPARTMENTS, getTeamLimit, getStandardTeams, TOTAL_STANDARD_TEAMS } from '@/data/organizationData';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getInitials, getAvatarColor, formatRole } from '@/utils/helpers';

const AdminDepartments: React.FC = () => {
  const { userData } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Add Department Dialog
  const [isAddDialogVisible, setIsAddDialogVisible] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptAreaCode, setNewDeptAreaCode] = useState('');

  // Edit Department
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

  // Teams
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [deptTeams, setDeptTeams] = useState<Record<string, Team[]>>({});
  const [isAddTeamVisible, setIsAddTeamVisible] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');

  // Team rename
  const [renamingTeam, setRenamingTeam] = useState<Team | null>(null);
  const [renameTeamName, setRenameTeamName] = useState('');

  // Team members
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
  const [teamMembersList, setTeamMembersList] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Add member dialog
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);

  // Transfer dialog
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferUser, setTransferUser] = useState<User | null>(null);
  const [transferFromTeam, setTransferFromTeam] = useState<Team | null>(null);
  const [transferToTeamId, setTransferToTeamId] = useState('');
  const [allTeamsInArea, setAllTeamsInArea] = useState<Team[]>([]);

  useEffect(() => { loadDepartments(); }, [selectedArea]);

  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      let data: Department[];
      if (selectedArea === 'all') {
        data = await getAllDepartments();
      } else {
        data = await getDepartmentsByArea(selectedArea);
      }
      setDepartments(data);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamsForDept = async (deptId: string) => {
    try {
      const teams = await getTeamsByDepartment(deptId);
      setDeptTeams(prev => ({ ...prev, [deptId]: teams }));
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const toggleExpand = (deptId: string) => {
    if (expandedDept === deptId) {
      setExpandedDept(null);
      setViewingTeam(null);
    } else {
      setExpandedDept(deptId);
      setViewingTeam(null);
      if (!deptTeams[deptId]) loadTeamsForDept(deptId);
    }
  };

  // ========== DEPARTMENT ACTIONS ==========
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department? All teams inside will also be removed.')) {
      try {
        await deleteDepartment(id);
        toast.success('Department deleted successfully');
        if (userData?.uid) logActivity(userData.uid, userData.name, userData.role, 'DEPARTMENT_UPDATED', `Deleted department`, 'Department');
        loadDepartments();
      } catch { toast.error('Failed to delete department'); }
    }
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setEditDeptName(dept.name);
    setIsEditDialogVisible(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editDeptName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDepartment(editingDept.id, { name: editDeptName.trim() });
      toast.success('Department renamed successfully');
      setIsEditDialogVisible(false);
      setEditingDept(null);
      loadDepartments();
    } catch { toast.error('Failed to rename department'); }
    finally { setIsSubmitting(false); }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptAreaCode) {
      toast.error('Please fill department name and select an area');
      return;
    }
    setIsSubmitting(true);
    try {
      const area = AREAS.find(a => a.code === newDeptAreaCode);
      const deptConfig = STANDARD_DEPARTMENTS.find(d => d.name.toLowerCase() === newDeptName.trim().toLowerCase());
      const teamLimit = deptConfig?.teamLimit || getTeamLimit(newDeptName.trim());

      const deptId = await createDepartment({
        name: newDeptName.trim(), description: newDeptDesc.trim(),
        headId: '', headName: '', employeeCount: 0, projectCount: 0,
        areaCode: newDeptAreaCode, areaName: area?.name || '',
        teamLimit, createdAt: new Date()
      });

      // Auto-create standard teams if this is a standard department
      if (deptConfig) {
        for (const teamName of deptConfig.standardTeams) {
          await createTeam({
            name: teamName, departmentId: deptId, departmentName: newDeptName.trim(),
            supervisorId: '', memberIds: [],
            areaCode: newDeptAreaCode, areaName: area?.name || '',
            status: 'active', createdAt: new Date()
          });
        }
        toast.success(`Department "${newDeptName}" created with ${deptConfig.standardTeams.length} teams!`);
      } else {
        toast.success(`Department "${newDeptName}" created!`);
      }

      setIsAddDialogVisible(false);
      setNewDeptName(''); setNewDeptDesc(''); setNewDeptAreaCode('');
      loadDepartments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create department');
    } finally { setIsSubmitting(false); }
  };

  // ========== SEED ALL DEPARTMENTS + TEAMS ==========
  const handleSeedStandard = async () => {
    if (!selectedArea || selectedArea === 'all') { toast.error('Select a specific area first'); return; }
    const area = AREAS.find(a => a.code === selectedArea);
    if (!area) return;

    setIsSeeding(true);
    try {
      const result = await seedDepartmentsAndTeams(selectedArea, area.name);
      toast.success(`✅ Created ${result.deptsCreated} departments + ${result.teamsCreated} teams for Area ${selectedArea}!`);

      if (userData?.uid) {
        logActivity(
          userData.uid, userData.name, userData.role,
          'DEPARTMENT_SEEDED',
          `Seeded ${result.deptsCreated} departments and ${result.teamsCreated} teams for Area ${selectedArea} (${area.name})`,
          'Department'
        );
      }

      loadDepartments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed departments');
    } finally {
      setIsSeeding(false);
    }
  };

  // ========== TEAM ACTIONS ==========
  const handleAddTeam = async (deptId: string) => {
    if (!newTeamName.trim()) { toast.error('Enter a team name'); return; }
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    const existingTeams = deptTeams[deptId] || [];
    const teamLimit = dept.teamLimit || getTeamLimit(dept.name);
    if (existingTeams.length >= teamLimit) {
      toast.error(`Team limit reached! Max ${teamLimit} teams in ${dept.name}`);
      return;
    }
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
    } catch { toast.error('Failed to create team'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteTeam = async (teamId: string, deptId: string) => {
    if (!confirm('Delete this team? Members will be unassigned.')) return;
    try {
      await deleteTeam(teamId);
      toast.success('Team deleted');
      loadTeamsForDept(deptId);
    } catch { toast.error('Failed to delete team'); }
  };

  const handleToggleTeamStatus = async (team: Team, deptId: string) => {
    const newStatus = team.status === 'active' ? 'inactive' : 'active';
    try {
      await updateTeam(team.id, { status: newStatus });
      toast.success(`Team ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      loadTeamsForDept(deptId);
    } catch { toast.error('Failed to update team status'); }
  };

  const handleRenameTeam = async () => {
    if (!renamingTeam || !renameTeamName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateTeam(renamingTeam.id, { name: renameTeamName.trim() });
      toast.success('Team renamed!');
      setRenamingTeam(null);
      if (expandedDept) loadTeamsForDept(expandedDept);
    } catch { toast.error('Failed to rename team'); }
    finally { setIsSubmitting(false); }
  };

  // ========== MEMBER ACTIONS ==========
  const handleViewTeamMembers = async (team: Team) => {
    if (viewingTeam?.id === team.id) { setViewingTeam(null); return; }
    setViewingTeam(team);
    setIsLoadingMembers(true);
    try {
      const members = await getTeamMembers(team.id);
      setTeamMembersList(members);
    } catch { setTeamMembersList([]); }
    finally { setIsLoadingMembers(false); }
  };

  const openAddMemberDialog = async (team: Team) => {
    setAddMemberTeam(team);
    setSelectedUserId('');
    setIsAddMemberOpen(true);
    setIsLoadingAvailable(true);
    try {
      const users = await getUsersAvailableForTeam(team.areaCode || '', team.id);
      setAvailableUsers(users);
    } catch { setAvailableUsers([]); }
    finally { setIsLoadingAvailable(false); }
  };

  const handleAddMember = async () => {
    if (!addMemberTeam || !selectedUserId) return;
    setIsSubmitting(true);
    try {
      await addTeamMember(addMemberTeam.id, selectedUserId);
      const user = availableUsers.find(u => u.uid === selectedUserId);
      toast.success(`${user?.name || 'User'} added to ${addMemberTeam.name}`);
      if (userData?.uid) logActivity(userData.uid, userData.name, userData.role, 'TEAM_MEMBER_ADDED', `Added ${user?.name} to team ${addMemberTeam.name}`, 'Team');
      setIsAddMemberOpen(false);
      handleViewTeamMembers(addMemberTeam);
      if (expandedDept) loadTeamsForDept(expandedDept);
    } catch { toast.error('Failed to add member'); }
    finally { setIsSubmitting(false); }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!viewingTeam || !confirm(`Remove ${userName} from ${viewingTeam.name}?`)) return;
    try {
      await removeTeamMember(viewingTeam.id, userId);
      toast.success(`${userName} removed from team`);
      if (userData?.uid) logActivity(userData.uid, userData.name, userData.role, 'TEAM_MEMBER_REMOVED', `Removed ${userName} from team ${viewingTeam.name}`, 'Team');
      handleViewTeamMembers(viewingTeam);
      if (expandedDept) loadTeamsForDept(expandedDept);
    } catch { toast.error('Failed to remove member'); }
  };

  const openTransferDialog = async (user: User, fromTeam: Team) => {
    setTransferUser(user);
    setTransferFromTeam(fromTeam);
    setTransferToTeamId('');
    setIsTransferOpen(true);
    // Load all teams in this area for transfer destination
    const allDepts = selectedArea !== 'all' ? departments : await getAllDepartments();
    const allTeams: Team[] = [];
    for (const dept of allDepts) {
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
      const toTeam = allTeamsInArea.find(t => t.id === transferToTeamId);
      toast.success(`${transferUser.name} transferred to ${toTeam?.name || 'new team'}`);
      setIsTransferOpen(false);
      if (viewingTeam) handleViewTeamMembers(viewingTeam);
      if (expandedDept) loadTeamsForDept(expandedDept);
    } catch { toast.error('Failed to transfer member'); }
    finally { setIsSubmitting(false); }
  };

  const filtered = departments.filter(d =>
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.headName && (d.headName || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Check if current area already has departments
  const areaHasDepartments = selectedArea !== 'all' && departments.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Department Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage departments, teams, and members within each area</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedArea !== 'all' && !areaHasDepartments && (
              <button onClick={handleSeedStandard} disabled={isSeeding}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 text-sm font-medium shadow-lg shadow-violet-500/25">
                {isSeeding ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {isSeeding ? 'Seeding...' : 'Seed All Depts + Teams'}
              </button>
            )}
            <button onClick={() => setIsAddDialogVisible(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors">
              <Plus className="w-4 h-4" /><span className="text-sm font-medium">Add Department</span>
            </button>
          </div>
        </div>

        {/* Standard Structure Reference Card */}
        {selectedArea !== 'all' && !areaHasDepartments && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl border border-violet-200 dark:border-violet-700/50 p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-800/50 flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Standard Organization Structure</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Click "Seed All Depts + Teams" to auto-create this structure for Area {selectedArea}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STANDARD_DEPARTMENTS.map(dept => (
                <div key={dept.name} className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-violet-100 dark:border-violet-800/30">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{dept.name}</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-0.5">{dept.teamLimit} Teams</p>
                  <div className="mt-2 space-y-0.5">
                    {dept.standardTeams.map(t => (
                      <p key={t} className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                        {t}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              Total: {STANDARD_DEPARTMENTS.length} departments, {TOTAL_STANDARD_TEAMS} teams per area
            </p>
          </motion.div>
        )}

        {/* Area Filter + Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-600" />
            <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-sm">
              <option value="all">All Areas</option>
              {AREAS.map(area => (
                <option key={area.code} value={area.code}>{area.code} — {area.name}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search departments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>

        {/* Department Cards */}
        {isLoading ? (
          <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" /></div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map((dept, index) => {
                const isExpanded = expandedDept === dept.id;
                const teams = deptTeams[dept.id] || [];
                const teamLimit = dept.teamLimit || getTeamLimit(dept.name);
                const standardTeamNames = getStandardTeams(dept.name);
                const isStandard = standardTeamNames.length > 0;

                return (
                  <motion.div key={dept.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.03 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {/* Department Header */}
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(dept.id)}>
                        <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{dept.name}</h3>
                            {isStandard && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                                Standard
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap mt-0.5">
                            {dept.areaCode && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                                Area {dept.areaCode}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {dept.employeeCount || 0} employees
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Layers className="w-3 h-3" /> {teams.length}/{teamLimit} teams
                            </span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-auto" /> : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-auto" />}
                      </div>
                      <div className="flex gap-1 ml-3">
                        <button onClick={() => openEditDialog(dept)} className="p-2 text-gray-400 hover:text-teal-600 transition-colors" title="Rename"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(dept.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* Teams (expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Teams ({teams.length}/{teamLimit})</h4>
                                {teams.length >= teamLimit && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> Full
                                  </span>
                                )}
                              </div>
                              {teams.length < teamLimit && (
                                <button onClick={() => setIsAddTeamVisible(isAddTeamVisible === dept.id ? null : dept.id)}
                                  className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> Add Team
                                </button>
                              )}
                            </div>

                            {/* Add Team Input */}
                            {isAddTeamVisible === dept.id && (
                              <div className="flex gap-2 mb-3">
                                <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                                  placeholder="Team name..." className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTeam(dept.id); }} />
                                <button onClick={() => handleAddTeam(dept.id)} disabled={isSubmitting}
                                  className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50">Create</button>
                              </div>
                            )}

                            {/* Team List */}
                            {teams.length === 0 ? (
                              <div className="flex items-center gap-2 py-3 px-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  No teams yet. {isStandard ? `This department should have ${teamLimit} teams. Click "Add Team" or re-seed the area.` : 'Click "Add Team" to create one.'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {teams.map(team => (
                                  <div key={team.id} className="space-y-0">
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
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                          team.status === 'active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>{team.status}</span>
                                        <button onClick={() => handleViewTeamMembers(team)} className="p-1.5 text-gray-400 hover:text-blue-500" title="View Members">
                                          {viewingTeam?.id === team.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                        <button onClick={() => openAddMemberDialog(team)} className="p-1.5 text-gray-400 hover:text-green-500" title="Add Member">
                                          <UserPlus className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { setRenamingTeam(team); setRenameTeamName(team.name); }} className="p-1.5 text-gray-400 hover:text-teal-500" title="Rename">
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleToggleTeamStatus(team, dept.id)} className="p-1.5 text-gray-400 hover:text-orange-500" title={team.status === 'active' ? 'Deactivate' : 'Activate'}>
                                          <Power className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDeleteTeam(team.id, dept.id)} className="p-1.5 text-gray-400 hover:text-red-500" title="Delete">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Team Members Panel */}
                                    {viewingTeam?.id === team.id && (
                                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className="ml-11 mt-1 p-3 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                        <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Members of {team.name}</h5>
                                        {isLoadingMembers ? (
                                          <div className="flex justify-center py-2"><div className="animate-spin w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full" /></div>
                                        ) : teamMembersList.length === 0 ? (
                                          <p className="text-xs text-gray-400 py-1">No members yet. Use the <UserPlus className="w-3 h-3 inline" /> button to add.</p>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {teamMembersList.map(member => (
                                              <div key={member.uid} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <div className="flex items-center gap-2">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ${getAvatarColor(member.name)}`}>
                                                    {getInitials(member.name)}
                                                  </div>
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-900 dark:text-white">{member.name}</p>
                                                    <p className="text-[10px] text-gray-400">{formatRole(member.role)}</p>
                                                  </div>
                                                </div>
                                                <div className="flex gap-0.5">
                                                  <button onClick={() => openTransferDialog(member, team)} className="p-1 text-gray-400 hover:text-blue-500" title="Transfer">
                                                    <ArrowRightLeft className="w-3 h-3" />
                                                  </button>
                                                  <button onClick={() => handleRemoveMember(member.uid, member.name)} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
                                                    <UserMinus className="w-3 h-3" />
                                                  </button>
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
            <p className="text-gray-500">No departments found.</p>
            {selectedArea !== 'all' && (
              <button onClick={handleSeedStandard} disabled={isSeeding} className="mt-3 text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 mx-auto">
                <Zap className="w-4 h-4" /> Seed standard departments + teams for this area
              </button>
            )}
          </div>
        )}

        {/* Add Department Dialog */}
        {isAddDialogVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Department</h2>
              <form onSubmit={handleAddDepartment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area *</label>
                  <select value={newDeptAreaCode} onChange={(e) => setNewDeptAreaCode(e.target.value)} required
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 dark:text-white">
                    <option value="">Select area</option>
                    {AREAS.map(area => (<option key={area.code} value={area.code}>{area.code} — {area.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department Name *</label>
                  <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} required list="standard-depts"
                    placeholder="e.g. System, Operations..."
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                  <datalist id="standard-depts">{STANDARD_DEPARTMENTS.map(d => (<option key={d.name} value={d.name} />))}</datalist>
                  {STANDARD_DEPARTMENTS.find(d => d.name.toLowerCase() === newDeptName.trim().toLowerCase()) && (
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Standard department — {STANDARD_DEPARTMENTS.find(d => d.name.toLowerCase() === newDeptName.trim().toLowerCase())?.standardTeams.length} teams will be auto-created
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea value={newDeptDesc} onChange={(e) => setNewDeptDesc(e.target.value)} rows={3} placeholder="Brief description"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 resize-none text-gray-900 dark:text-white" />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsAddDialogVisible(false)} disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                  <button type="submit" disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                    {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Create Department
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Department Modal */}
        {isEditDialogVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Rename Department</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department Name</label>
                  <input type="text" required value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setIsEditDialogVisible(false); setEditingDept(null); }} disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                  <button type="submit" disabled={isSubmitting || !editDeptName.trim() || editDeptName === editingDept?.name}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                    {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Rename Team Dialog */}
        <Dialog open={!!renamingTeam} onOpenChange={() => setRenamingTeam(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rename Team</DialogTitle><DialogDescription>Change the name for "{renamingTeam?.name}"</DialogDescription></DialogHeader>
            <div className="py-4">
              <input type="text" value={renameTeamName} onChange={(e) => setRenameTeamName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" placeholder="New team name" />
            </div>
            <DialogFooter>
              <button onClick={() => setRenamingTeam(null)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleRenameTeam} disabled={isSubmitting || !renameTeamName.trim()}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Rename</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member to {addMemberTeam?.name}</DialogTitle>
              <DialogDescription>Select a user to add to this team. Only team-eligible roles (Employee, Intern, Apprentice) without an existing team are shown.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {isLoadingAvailable ? (
                <div className="flex justify-center py-4"><div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" /></div>
              ) : availableUsers.length === 0 ? (
                <p className="text-sm text-amber-500 py-2">No available users found in this area. Register users first or check team assignments.</p>
              ) : (
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                  <option value="">Select user</option>
                  {availableUsers.map(u => (<option key={u.uid} value={u.uid}>{u.name} — {formatRole(u.role)}</option>))}
                </select>
              )}
            </div>
            <DialogFooter>
              <button onClick={() => setIsAddMemberOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleAddMember} disabled={isSubmitting || !selectedUserId}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Add Member</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Member Dialog */}
        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer {transferUser?.name}</DialogTitle>
              <DialogDescription>Move from "{transferFromTeam?.name}" to another team</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {allTeamsInArea.length === 0 ? (
                <p className="text-sm text-amber-500">No other active teams available for transfer.</p>
              ) : (
                <select value={transferToTeamId} onChange={(e) => setTransferToTeamId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                  <option value="">Select destination team</option>
                  {allTeamsInArea.map(t => (<option key={t.id} value={t.id}>{t.name} ({t.departmentName || 'Unknown Dept'})</option>))}
                </select>
              )}
            </div>
            <DialogFooter>
              <button onClick={() => setIsTransferOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleTransfer} disabled={isSubmitting || !transferToTeamId}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Transfer</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminDepartments;
