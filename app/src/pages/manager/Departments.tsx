// MANAGER DEPARTMENTS PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, FolderKanban } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllDepartments, getAllUsers, getAllProjects } from '@/services/firestoreService';
import type { Department, User, Project } from '@/types';
import { toast } from 'sonner';

const ManagerDepartments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { setIsLoading(true); const [d, u, p] = await Promise.all([getAllDepartments(), getAllUsers(), getAllProjects()]); setDepartments(d); setUsers(u); setProjects(p); }
    catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Department Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View department performance and staffing</p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, i) => {
              const deptUsers = users.filter(u => u.departmentId === dept.id);
              const deptProjects = projects.filter(p => p.departmentId === dept.id);
              return (
                <motion.div key={dept.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center"><Building2 className="w-6 h-6 text-purple-600" /></div>
                    <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">{dept.name}</h3><p className="text-sm text-gray-500">{dept.description || 'No description'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600 dark:text-gray-400">{deptUsers.length} Members</span></div>
                    <div className="flex items-center gap-2"><FolderKanban className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600 dark:text-gray-400">{deptProjects.length} Projects</span></div>
                  </div>
                  <div className="mt-3 text-sm"><span className="text-gray-400">Head: </span><span className="font-medium text-gray-900 dark:text-white">{dept.headName || 'Unassigned'}</span></div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerDepartments;
