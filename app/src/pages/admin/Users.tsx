// ============================================
// ADMIN USERS MANAGEMENT
// ============================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Download
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllUsers, updateUser, deleteUser } from '@/services/firestoreService';
import type { User } from '@/types';
import { toast } from 'sonner';
import { formatRole, getInitials, getAvatarColor } from '@/utils/helpers';
import { validateEmail, validatePassword } from '@/utils/validation';
import { useAuth } from '@/context/AuthContext';
import { AREAS, getAreaName } from '@/data/areaData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const AdminUsers: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ role: '', department: '', areaCode: '' });
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, areaFilter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(
        user =>
          (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.role || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (areaFilter !== 'all') {
      filtered = filtered.filter(user => user.areaCode === areaFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await updateUser(user.uid, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser.uid);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    try {
      const areaName = getAreaName(editFormData.areaCode);
      await updateUser(selectedUser.uid, { 
        role: editFormData.role as any, 
        department: editFormData.department,
        areaCode: editFormData.areaCode,
        areaName: areaName
      });
      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleExportUsers = () => {
    try {
      const headers = ['Name', 'Email', 'Role', 'Department', 'Area Code', 'Area Name', 'Status', 'Joined Date'];
      const csvData = filteredUsers.map(user => [
        user.name,
        user.email,
        formatRole(user.role),
        user.department || 'N/A',
        user.areaCode || 'N/A',
        user.areaName || 'N/A',
        user.isActive ? 'Active' : 'Inactive',
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Users exported successfully');
    } catch (error) {
      toast.error('Failed to export users');
    }
  };

  const roles = ['all', ...Array.from(new Set(users.map(u => u.role)))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage all users in the system
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={handleExportUsers}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
            </button>
            <button 
              onClick={() => setIsAddUserDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Register User</span>
            </button>
            <button 
              onClick={() => setIsAddRoleDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Role</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Roles</option>
              {roles.filter(r => r !== 'all').map(role => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Areas</option>
              {AREAS.map(area => (
                <option key={area.code} value={area.code}>
                  {area.code} — {area.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table (Desktop) / Cards (Mobile) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
        >
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-4">Loading users...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table - hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">User</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">Role</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">Area</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">Dept</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">Approval</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">Joined</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.uid}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(user.name)}`}>
                              {getInitials(user.name)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {user.areaCode ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" title={user.areaName || ''}>
                              {user.areaCode}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{user.department || '-'}</td>
                        <td className="py-4 px-6">
                          {(() => {
                            const status = user.approvalStatus || (user.isApproved === true ? 'approved' : user.isApproved === false ? 'pending' : 'approved');
                            const colors = {
                              approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                              pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            };
                            return <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || colors.approved}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
                          })()}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600 dark:text-gray-400">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-4 px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                <MoreHorizontal className="w-4 h-4 text-gray-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedUser(user); setEditFormData({ role: user.role, department: user.department || '', areaCode: user.areaCode || '' }); setIsEditDialogOpen(true); }}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                {user.isActive ? <><UserX className="w-4 h-4 mr-2" /> Deactivate</> : <><UserCheck className="w-4 h-4 mr-2" /> Activate</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsDeleteDialogOpen(true); }} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards - shown on mobile only */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user, index) => {
                  const approvalStatus = user.approvalStatus || (user.isApproved === true ? 'approved' : user.isApproved === false ? 'pending' : 'approved');
                  return (
                    <motion.div
                      key={user.uid}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-4 space-y-3"
                    >
                      {/* User info row */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getAvatarColor(user.name)}`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      {/* Badges row */}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                          {formatRole(user.role)}
                        </span>
                        {user.areaCode && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" title={user.areaName || ''}>
                            Area: {user.areaCode}
                          </span>
                        )}
                        {user.department && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            {user.department}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          approvalStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          approvalStatus === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>{approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${user.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {/* Actions row */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                        <div className="flex gap-1">
                          <button onClick={() => { setSelectedUser(user); setEditFormData({ role: user.role, department: user.department || '', areaCode: user.areaCode || '' }); setIsEditDialogOpen(true); }}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleToggleStatus(user)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setSelectedUser(user); setIsDeleteDialogOpen(true); }}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add User Dialog (Employee / Intern / Apprentice) */}
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Registration</DialogTitle>
              <DialogDescription>
                Register Employee, Intern or Apprentice. Account will be inactive until HR verifies and approves.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const name = formData.get('name') as string;
              const email = formData.get('email') as string;
              const password = formData.get('password') as string;
              const role = formData.get('role') as string;
              const department = formData.get('department') as string;
              const qualification = formData.get('qualification') as string;
              const areaCode = formData.get('areaCode') as string;
              
              if (!name || !email || !password || !role || !areaCode) {
                toast.error('Please fill all required fields');
                return;
              }

              const emailResult = validateEmail(email);
              if (!emailResult.valid) { toast.error(emailResult.error || 'Invalid email'); return; }
              const pwResult = validatePassword(password);
              if (!pwResult.valid) { toast.error(pwResult.error || 'Invalid password'); return; }
              
              try {
                const { registerUser: regUser } = await import('@/services/authService');
                const { updateUser: updateU } = await import('@/services/firestoreService');
                
                const result = await regUser({
                  email, password, name,
                  role: role as any,
                  department,
                  qualification,
                  areaCode,
                  areaName: getAreaName(areaCode)
                });

                // Set createdBy to current admin
                if (userData?.uid) {
                  await updateU(result.userData.uid, { createdBy: userData.uid });
                }
                
                toast.success(`${name} registered successfully! Pending HR verification.`);
                setIsAddUserDialogOpen(false);
                form.reset();
                loadUsers();
              } catch (error: any) {
                toast.error(error.message || 'Failed to create user');
              }
            }}>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input name="name" type="text" required placeholder="Enter full name"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input name="email" type="email" required placeholder="Enter email address"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <input name="password" type="password" required minLength={8} placeholder="Min 8 chars, 1 letter, 1 number"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                  <select name="role" required
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                    <option value="">Select role</option>
                    <option value="employee">Employee</option>
                    <option value="intern">Intern</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qualification</label>
                  <input name="qualification" type="text" placeholder="e.g. B.Tech, MBA..."
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <input name="department" type="text" placeholder="e.g. Engineering"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area *</label>
                  <select name="areaCode" required
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                    <option value="">Select area</option>
                    {AREAS.map(area => (
                      <option key={area.code} value={area.code}>
                        {area.code} — {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setIsAddUserDialogOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700">
                  Register User
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Role Dialog (Admin / HR / GM / PM / Supervisor) */}
        <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Role User</DialogTitle>
              <DialogDescription>
                Create Admin, HR, GM, PM or Supervisor. They will require Admin verification before login.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const name = formData.get('name') as string;
              const email = formData.get('email') as string;
              const password = formData.get('password') as string;
              const role = formData.get('role') as string;
              const areaCode = formData.get('areaCode') as string;
              
              if (!name || !email || !password || !role || !areaCode) {
                toast.error('Please fill all required fields');
                return;
              }

              const emailResult = validateEmail(email);
              if (!emailResult.valid) { toast.error(emailResult.error || 'Invalid email'); return; }
              const pwResult = validatePassword(password);
              if (!pwResult.valid) { toast.error(pwResult.error || 'Invalid password'); return; }
              
              try {
                const { registerUser: regUser } = await import('@/services/authService');
                const { updateUser: updateU } = await import('@/services/firestoreService');
                
                const result = await regUser({
                  email, password, name,
                  role: role as any,
                  areaCode,
                  areaName: getAreaName(areaCode)
                });

                if (userData?.uid) {
                  await updateU(result.userData.uid, { createdBy: userData.uid });
                }
                
                toast.success(`${name} created! Pending Admin verification.`);
                setIsAddRoleDialogOpen(false);
                form.reset();
                loadUsers();
              } catch (error: any) {
                toast.error(error.message || 'Failed to create user');
              }
            }}>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input name="name" type="text" required placeholder="Enter full name"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input name="email" type="email" required placeholder="Enter email address"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <input name="password" type="password" required minLength={8} placeholder="Min 8 chars, 1 letter, 1 number"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                  <select name="role" required
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                    <option value="">Select role</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="general_manager">General Manager (GM)</option>
                    <option value="project_manager">Project Manager (PM)</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area *</label>
                  <select name="areaCode" required
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white">
                    <option value="">Select area</option>
                    {AREAS.map(area => (
                      <option key={area.code} value={area.code}>
                        {area.code} — {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setIsAddRoleDialogOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
                  Create Role User
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update role and department for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="hr">HR</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  placeholder="e.g. Engineering"
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Area
                </label>
                <select
                  value={editFormData.areaCode}
                  onChange={(e) => setEditFormData({ ...editFormData, areaCode: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
                >
                  <option value="">No area</option>
                  {AREAS.map(area => (
                    <option key={area.code} value={area.code}>
                      {area.code} — {area.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
              >
                Save Changes
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
