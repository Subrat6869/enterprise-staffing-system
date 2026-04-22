// ============================================
// GM WORK PROGRESS — MINIMAL TASK LIST BY DEPARTMENT
// ============================================

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, MapPin, Building2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getAllTasks } from '@/services/firestoreService';
import type { Task } from '@/types';
import { toast } from 'sonner';
import { formatArea } from '@/data/areaData';

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
};

const ManagerWorkProgress: React.FC = () => {
  const { userData } = useAuth();
  const gmAreaCode = userData?.areaCode || '';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (gmAreaCode) loadData();
    else setIsLoading(false);
  }, [gmAreaCode]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const all = await getAllTasks();
      setTasks(all.filter(t => t.areaCode === gmAreaCode));
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  // Group by department, sorted alphabetically
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      const dept = t.departmentName || t.departmentId || 'Unassigned';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(t);
    });
    // Sort departments alphabetically, sort tasks within by title
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dept, items]) => ({ dept, items: items.sort((a, b) => a.title.localeCompare(b.title)) }));
  }, [tasks]);

  if (!gmAreaCode) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Area Assigned</h2>
            <p className="text-gray-500 dark:text-gray-400">Please contact Admin to assign your area.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Work Progress</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Tasks assigned by PMs in your area</p>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">{formatArea(gmAreaCode, userData?.areaName)}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tasks have been assigned in your area yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ dept, items }, di) => (
              <motion.div
                key={dept}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: di * 0.06 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
              >
                {/* Department Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{dept}</h2>
                  </div>
                </div>

                {/* Task List */}
                <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {items.map(task => (
                    <li key={task.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{task.title}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusStyle[task.status] || statusStyle.pending}`}>
                        {statusLabel[task.status] || task.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerWorkProgress;
