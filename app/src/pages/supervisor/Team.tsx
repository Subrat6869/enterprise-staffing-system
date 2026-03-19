// ============================================
// SUPERVISOR TEAM — FULL CRUD WITH MEMBER MANAGEMENT
// ============================================
import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, XCircle, UserPlus, UserMinus, Edit2, X, Shield, ShieldOff } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getUsersByDepartment, getAllTasks, getTeamsBySupervisor, createTeam, updateTeam, deleteTeam } from '@/services/firestoreService';
import type { User, Task, Team } from '@/types';
import { toast } from 'sonner';
import { getInitials, getAvatarColor, formatRole } from '@/utils/helpers';

const SupervisorTeam: React.FC = () => {
  const { userData } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Add member modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);

  useEffect(() => { if (userData?.department) loadData(); }, [userData]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [m, t, tms] = await Promise.all([
        getUsersByDepartment(userData!.department!),
        getAllTasks(),
        getTeamsBySupervisor(userData!.uid)
      ]);
      setMembers(m.filter(u => u.uid !== userData!.uid));
      setTasks(t);
      setTeams(tms);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) { toast.error('Team name is required'); return; }
    try {
      // Don't pass createdAt — let firestoreService use serverTimestamp
      await createTeam({
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
        departmentId: userData!.department!,
        supervisorId: userData!.uid,
        memberIds: selectedMembers,
        status: 'active',
        createdAt: new Date() // will be overwritten by serverTimestamp in the service
      });
      toast.success('Team created successfully!');
      resetModal();
      loadData();
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam || !newTeamName.trim()) return;
    try {
      await updateTeam(editingTeam.id, {
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
        memberIds: selectedMembers
      });
      toast.success('Team updated!');
      resetModal();
      loadData();
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
    }
  };

  const resetModal = () => {
    setEditingTeam(null);
    setShowAddModal(false);
    setNewTeamName('');
    setNewTeamDesc('');
    setSelectedMembers([]);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;
    try {
      await deleteTeam(teamId);
      toast.success('Team deleted');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleStatusChange = async (teamId: string, status: Team['status']) => {
    try {
      await updateTeam(teamId, { status });
      toast.success(`Team ${status === 'active' ? 'activated' : status === 'inactive' ? 'deactivated' : 'terminated'}`);
      loadData();
    } catch { toast.error('Failed to update status'); }
  };

  // Member-level actions
  const handleRemoveMember = async (teamId: string, memberId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const updatedMembers = (team.memberIds || []).filter(id => id !== memberId);
    try {
      await updateTeam(teamId, { memberIds: updatedMembers });
      toast.success('Member removed from team');
      loadData();
    } catch { toast.error('Failed to remove member'); }
  };

  const handleAddMemberToTeam = async (memberId: string) => {
    if (!addMemberTeamId) return;
    const team = teams.find(t => t.id === addMemberTeamId);
    if (!team) return;
    const currentMembers = team.memberIds || [];
    if (currentMembers.includes(memberId)) { toast.error('Already in this team'); return; }
    try {
      await updateTeam(addMemberTeamId, { memberIds: [...currentMembers, memberId] });
      toast.success('Member added to team');
      setShowAddMemberModal(false);
      setAddMemberTeamId(null);
      loadData();
    } catch { toast.error('Failed to add member'); }
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setNewTeamName(team.name);
    setNewTeamDesc(team.description || '');
    setSelectedMembers(team.memberIds || []);
    setShowAddModal(true);
  };

  const openAddMemberModal = (teamId: string) => {
    setAddMemberTeamId(teamId);
    setShowAddMemberModal(true);
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  // Members not in any active team
  const assignedMemberIds = new Set(teams.flatMap(t => t.memberIds || []));
  const unassignedMembers = members.filter(m => !assignedMemberIds.has(m.uid));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Teams</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage teams within your department</p>
          </div>
          <button onClick={() => { resetModal(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium">
            <Plus className="w-4 h-4" />Add Team
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : teams.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No teams created yet</p>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700">Create First Team</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teams.map((team, i) => {
              const teamTasks = tasks.filter(t => (team.memberIds || []).includes(t.employeeId));
              const completed = teamTasks.filter(t => t.status === 'completed').length;
              const total = teamTasks.length;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <motion.div key={team.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border ${
                    team.status === 'active' ? 'border-gray-100 dark:border-gray-800' :
                    team.status === 'inactive' ? 'border-yellow-200 dark:border-yellow-800 opacity-70' :
                    'border-red-200 dark:border-red-800 opacity-50'
                  }`}>
                  {/* Team Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          team.status === 'active' ? 'bg-green-100 text-green-700' :
                          team.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{team.status}</span>
                      </div>
                      {team.description && <p className="text-sm text-gray-500 mt-1">{team.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(team)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => openAddMemberModal(team.id)} className="p-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30" title="Add Member"><UserPlus className="w-4 h-4 text-teal-600" /></button>
                      {team.status === 'active' && (
                        <button onClick={() => handleStatusChange(team.id, 'inactive')} className="p-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30" title="Deactivate"><ShieldOff className="w-4 h-4 text-yellow-600" /></button>
                      )}
                      {team.status === 'inactive' && (
                        <button onClick={() => handleStatusChange(team.id, 'active')} className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30" title="Activate"><Shield className="w-4 h-4 text-green-600" /></button>
                      )}
                      {team.status !== 'terminated' && (
                        <button onClick={() => handleStatusChange(team.id, 'terminated')} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30" title="Terminate"><XCircle className="w-4 h-4 text-red-600" /></button>
                      )}
                      <button onClick={() => handleDeleteTeam(team.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4 py-3 border-t border-b border-gray-100 dark:border-gray-800">
                    <div><p className="text-lg font-bold text-gray-900 dark:text-white">{(team.memberIds || []).length}</p><p className="text-xs text-gray-500">Members</p></div>
                    <div><p className="text-lg font-bold text-green-600">{completed}</p><p className="text-xs text-gray-500">Done</p></div>
                    <div><p className="text-lg font-bold text-orange-600">{total - completed}</p><p className="text-xs text-gray-500">Remaining</p></div>
                  </div>

                  {/* Team Members with actions */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Team Members</p>
                    {(team.memberIds || []).length === 0 ? (
                      <p className="text-sm text-gray-400">No members assigned — click <UserPlus className="w-3 h-3 inline text-teal-600" /> to add</p>
                    ) : (
                      <div className="space-y-2">
                        {(team.memberIds || []).map(uid => {
                          const member = members.find(m => m.uid === uid);
                          if (!member) return null;
                          const mTasks = tasks.filter(t => t.employeeId === uid);
                          const currentWork = mTasks.find(t => t.status === 'in_progress');
                          return (
                            <div key={uid} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 group">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(member.name)}`}>
                                {getInitials(member.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                                <p className="text-xs text-gray-500 truncate">{currentWork ? `Working on: ${currentWork.title}` : formatRole(member.role)}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleRemoveMember(team.id, uid)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30" title="Remove from team">
                                  <UserMinus className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Unassigned Members */}
        {unassignedMembers.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Unassigned Members ({unassignedMembers.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {unassignedMembers.map(m => (
                <div key={m.uid} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(m.name)}`}>{getInitials(m.name)}</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{m.name}</p>
                    <p className="text-xs text-gray-500">{formatRole(m.role)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Create/Edit Team Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={resetModal}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editingTeam ? 'Edit Team' : 'Create New Team'}</h3>
                <button onClick={resetModal} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name *</label>
                  <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g. Frontend Team" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="What does this team work on?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Members ({selectedMembers.length} selected)</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                    {members.map(m => (
                      <label key={m.uid} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedMembers.includes(m.uid) ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                      }`}>
                        <input type="checkbox" checked={selectedMembers.includes(m.uid)} onChange={() => toggleMember(m.uid)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(m.name)}`}>{getInitials(m.name)}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                          <p className="text-xs text-gray-500">{formatRole(m.role)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={resetModal}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium">
                  Cancel
                </button>
                <button onClick={editingTeam ? handleUpdateTeam : handleAddTeam}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />{editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member to Team Modal */}
      <AnimatePresence>
        {showAddMemberModal && addMemberTeamId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowAddMemberModal(false); setAddMemberTeamId(null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[70vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Member</h3>
                <button onClick={() => { setShowAddMemberModal(false); setAddMemberTeamId(null); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Select a member to add to <strong>{teams.find(t => t.id === addMemberTeamId)?.name}</strong></p>
              <div className="space-y-2">
                {members.filter(m => !(teams.find(t => t.id === addMemberTeamId)?.memberIds || []).includes(m.uid)).map(m => (
                  <button key={m.uid} onClick={() => handleAddMemberToTeam(m.uid)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-left">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(m.name)}`}>{getInitials(m.name)}</div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-gray-500">{formatRole(m.role)} • {m.email}</p>
                    </div>
                    <UserPlus className="w-4 h-4 text-teal-600 ml-auto" />
                  </button>
                ))}
                {members.filter(m => !(teams.find(t => t.id === addMemberTeamId)?.memberIds || []).includes(m.uid)).length === 0 && (
                  <p className="text-center text-gray-500 py-4">All members are already in this team</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default SupervisorTeam;
