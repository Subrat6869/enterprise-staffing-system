// ============================================
// HR DASHBOARD
// ============================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  FileText,
  GraduationCap,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  MapPin
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getAllUsers, getUsersByArea, updateUser } from '@/services/firestoreService';
import type { User } from '@/types';
import { toast } from 'sonner';
import { formatRole, getInitials, getAvatarColor } from '@/utils/helpers';
import { formatArea } from '@/data/areaData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

const HRDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // HR sees only users from their own area
      let allUsers: User[];
      if (userData?.areaCode) {
        allUsers = await getUsersByArea(userData.areaCode);
      } else {
        allUsers = await getAllUsers();
      }
      setUsers(allUsers);
      
      // Filter pending approvals (employee/intern/apprentice who are NOT yet approved)
      const pending = allUsers.filter(
        u => ['employee', 'intern', 'apprentice'].includes(u.role) && u.isApproved !== true
      );
      setPendingVerifications(pending);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUser = async (user: User, approved: boolean) => {
    try {
      await updateUser(user.uid, { 
        isApproved: approved, 
        certificateVerified: approved 
      });
      toast.success(`User ${approved ? 'approved' : 'rejected'} successfully`);
      loadData();
    } catch (error) {
      toast.error('Failed to update approval status');
    }
  };

  const stats = [
    {
      title: 'Total Employees',
      value: users.filter(u => ['employee', 'intern', 'apprentice'].includes(u.role)).length,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Approvals',
      value: pendingVerifications.length,
      icon: Clock,
      color: 'bg-orange-500'
    },
    {
      title: 'Approved Users',
      value: users.filter(u => u.isApproved === true).length,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'New Joiners',
      value: users.filter(u => {
        const created = u.createdAt ? new Date(u.createdAt) : null;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created && created > weekAgo;
      }).length,
      icon: UserCheck,
      color: 'bg-purple-500'
    }
  ];

  const filteredVerifications = pendingVerifications.filter(u => {
    const matchSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            HR Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {userData?.name}. Manage employee verifications and records.
          </p>
          {userData?.areaCode && (
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                {formatArea(userData.areaCode, userData.areaName)}
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pending Verifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pending Approvals
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review and approve new employees, interns & apprentices
              </p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pending..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Roles</option>
                <option value="employee">Employee</option>
                <option value="intern">Intern</option>
                <option value="apprentice">Apprentice</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filteredVerifications.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4 dark:text-gray-700" />
              <p className="text-gray-500">No pending verifications match your search</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVerifications.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                        getAvatarColor(user.name)
                      }`}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                          {formatRole(user.role)}
                        </span>
                        {user.qualification && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {user.qualification}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setIsDetailsOpen(true);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApproveUser(user, true)}
                      className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 dark:hover:bg-green-900/50"
                      title="Approve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApproveUser(user, false)}
                      className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Employees */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Employees
            </h3>
            <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Employee
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Department
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map((user) => (
                  <tr key={user.uid} className="border-b border-gray-100 dark:border-gray-800/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                            getAvatarColor(user.name)
                          }`}
                        >
                          {getInitials(user.name)}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {user.department || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* User Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Review user information and certificate
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold ${
                      getAvatarColor(selectedUser.name)
                    }`}
                  >
                    {getInitials(selectedUser.name)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedUser.name}
                    </p>
                    <p className="text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatRole(selectedUser.role)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedUser.department || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Qualification</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedUser.qualification || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedUser.experience ? `${selectedUser.experience} years` : '-'}
                    </p>
                  </div>
                </div>

                {selectedUser.certificateURL && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Certificate</p>
                    <a
                      href={selectedUser.certificateURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900/50"
                    >
                      <FileText className="w-4 h-4" />
                      View Certificate
                    </a>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default HRDashboard;
