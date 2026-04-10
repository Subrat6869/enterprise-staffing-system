// HR EMPLOYEES PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Download } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllUsers, getUsersByArea } from '@/services/firestoreService';
import type { User } from '@/types';
import { toast } from 'sonner';
import { formatRole, getInitials, getAvatarColor } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';

const HREmployees: React.FC = () => {
  const { userData: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try { 
      setIsLoading(true);
      // HR sees only users from their own area
      if (currentUser?.areaCode) {
        setUsers(await getUsersByArea(currentUser.areaCode));
      } else {
        setUsers(await getAllUsers());
      }
    }
    catch { toast.error('Failed to load employees'); }
    finally { setIsLoading(false); }
  };

  const filtered = users.filter(u => {
    const matchSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roles = Array.from(new Set(users.map(u => u.role)));

  const handleExportEmployees = () => {
    try {
      const headers = ['Name', 'Email', 'Role', 'Department', 'Status'];
      const csvData = filtered.map(u => [
        u.name,
        u.email,
        formatRole(u.role).replace(',', ' '),
        u.department || 'Unassigned',
        u.isActive ? 'Active' : 'Inactive'
      ]);

      const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `hr_employees_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Employees exported successfully');
    } catch (error) {
      toast.error('Failed to export employees');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Employee Directory</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Browse and manage all employees</p>
          </div>
          <button 
            onClick={handleExportEmployees}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Download className="w-4 h-4" /><span className="text-sm font-medium">Export</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500">
            <option value="all">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{formatRole(r)}</option>)}
          </select>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Employee</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Role</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Area</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Department</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.uid} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(user.name)}`}>{getInitials(user.name)}</div>
                          <div><p className="font-medium text-gray-900 dark:text-white">{user.name}</p><p className="text-sm text-gray-500">{user.email}</p></div>
                        </div>
                      </td>
                      <td className="py-4 px-6"><span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">{formatRole(user.role)}</span></td>
                      <td className="py-4 px-6">
                        {user.areaCode ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" title={user.areaName || ''}>{user.areaCode}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{user.department || '-'}</td>
                      <td className="py-4 px-6"><span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="p-8 text-center"><Users className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No employees found</p></div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default HREmployees;
