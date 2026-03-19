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
  Filter,
  Download
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllUsers, updateUser, deleteUser } from '@/services/firestoreService';
import type { User } from '@/types';
import { toast } from 'sonner';
import { formatRole, getInitials, getAvatarColor } from '@/utils/helpers';
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
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ role: '', department: '' });
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

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
      await updateUser(selectedUser.uid, { 
        role: editFormData.role as any, 
        department: editFormData.department 
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
      const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Joined Date'];
      const csvData = filteredUsers.map(user => [
        user.name,
        user.email,
        formatRole(user.role),
        user.department || 'N/A',
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
          <div className="flex gap-3">
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
              <span className="text-sm font-medium">Add User</span>
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
            <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                      User
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Role
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Department
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Joined
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
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
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                              getAvatarColor(user.name)
                            }`}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-400">
                        {user.department || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-4 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                              <MoreHorizontal className="w-4 h-4 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUser(user);
                                setEditFormData({ role: user.role, department: user.department || '' });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                              {user.isActive ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
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

        {/* Add User Dialog */}
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account. They will be able to log in immediately.
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
              
              if (!name || !email || !password || !role) {
                toast.error('Please fill all required fields');
                return;
              }
              
              try {
                // Use the registration service to create user in Auth + Firestore
                // Note: This will sign out the current admin, so we save auth state
                const { registerUser: regUser } = await import('@/services/authService');
                
                await regUser({
                  email,
                  password,
                  name,
                  role: role as any,
                  department
                });
                
                toast.success(`User ${name} created successfully!`);
                setIsAddUserDialogOpen(false);
                form.reset();
                loadUsers();
              } catch (error: any) {
                toast.error(error.message || 'Failed to create user');
              }
            }}>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Enter full name"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Enter email address"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select role</option>
                    <option value="employee">Employee</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="hr">HR</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="general_manager">General Manager</option>
                    <option value="admin">Admin</option>
                    <option value="intern">Intern</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <input
                    name="department"
                    type="text"
                    placeholder="e.g. Engineering"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsAddUserDialogOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
                >
                  Create User
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
