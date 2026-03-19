// MANAGER ASSIGNMENTS PAGE
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Users, Calendar, Search } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllProjects } from '@/services/firestoreService';
import type { Project } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/utils/helpers';

const ManagerAssignments: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { setIsLoading(true); setProjects(await getAllProjects()); }
    catch { toast.error('Failed to load'); }
    finally { setIsLoading(false); }
  };

  const filtered = projects.filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Project Assignments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage project assignments and track progress</p>
        </div>
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
        </div>
        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project, i) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center"><FolderKanban className="w-5 h-5 text-teal-600" /></div>
                    <div><h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3><p className="text-sm text-gray-500">{project.departmentName}</p></div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${project.status === 'active' ? 'bg-green-100 text-green-700' : project.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{project.status}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">{project.description}</p>
                <div className="mb-4"><div className="flex justify-between mb-1"><span className="text-sm text-gray-500">Progress</span><span className="text-sm font-medium">{project.progress}%</span></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${project.progress}%` }} /></div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{project.assignedManagerName}</span></div>
                  <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{formatDate(project.deadline)}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerAssignments;
