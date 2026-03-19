// ============================================
// ADMIN DEPARTMENTS
// ============================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Plus, Edit2, Trash2, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllDepartments, createDepartment, deleteDepartment, updateDepartment } from '@/services/firestoreService';
import type { Department } from '@/types';
import { toast } from 'sonner';

const AdminDepartments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogVisible, setIsAddDialogVisible] = useState(false);
  
  // Edit Department State
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const data = await getAllDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
      // Set some mock data if empty for demo purposes
      if (departments.length === 0) {
         setDepartments([
           { id: '1', name: 'Engineering', headId: 'head1', headName: 'Alice Smith', employeeCount: 42, projectCount: 5, description: 'Software dev team', createdAt: new Date() },
           { id: '2', name: 'Design', headId: 'head2', headName: 'Bob Jones', employeeCount: 15, projectCount: 3, description: 'UI/UX team', createdAt: new Date() },
           { id: '3', name: 'HR', headId: 'head3', headName: 'Charlie Brown', employeeCount: 5, projectCount: 1, description: 'Human Resources', createdAt: new Date() },
         ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      try {
        await deleteDepartment(id);
        toast.success('Department deleted successfully');
        loadDepartments();
      } catch (error) {
        toast.error('Failed to delete department (it might contain employees)');
      }
    }
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setEditDeptName(dept.name);
    setIsEditDialogVisible(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogVisible(false);
    setEditingDept(null);
    setEditDeptName('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editDeptName.trim()) return;

    setIsSubmitting(true);
    try {
      await updateDepartment(editingDept.id, { name: editDeptName.trim() });
      toast.success('Department renamed successfully');
      closeEditDialog();
      loadDepartments();
    } catch (error) {
      toast.error('Failed to rename department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = departments.filter(d => 
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (d.headName && (d.headName || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Department Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Organize company structure and assign department heads
            </p>
          </div>
          <button 
            onClick={() => setIsAddDialogVisible(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Department</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Departments Grid */}
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filtered.map((dept, index) => (
                <motion.div
                  key={dept.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dept.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-1">{dept.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => openEditDialog(dept)}
                        className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(dept.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{dept.employeeCount || 0} Employees</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs text-gray-400">Dept. Head</span>
                        <span className="font-medium text-gray-900 dark:text-white">{dept.headName || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No departments found.</p>
          </div>
        )}

        {isAddDialogVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Department</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const name = formData.get('deptName') as string;
                const description = formData.get('deptDescription') as string;
                
                if (!name.trim()) {
                  toast.error('Please enter a department name');
                  return;
                }
                
                setIsSubmitting(true);
                try {
                  await createDepartment({
                    name: name.trim(),
                    description: description.trim(),
                    headId: '',
                    headName: '',
                    employeeCount: 0,
                    projectCount: 0,
                    createdAt: new Date()
                  });
                  toast.success(`Department "${name}" created successfully!`);
                  setIsAddDialogVisible(false);
                  form.reset();
                  loadDepartments();
                } catch (error: any) {
                  toast.error(error.message || 'Failed to create department');
                } finally {
                  setIsSubmitting(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department Name *
                  </label>
                  <input
                    name="deptName"
                    type="text"
                    required
                    placeholder="e.g. Engineering"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="deptDescription"
                    rows={3}
                    placeholder="Brief description of the department"
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddDialogVisible(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Rename Department</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editDeptName}
                    onChange={(e) => setEditDeptName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                    placeholder="E.g., Engineering"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeEditDialog}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !editDeptName.trim() || editDeptName === editingDept?.name}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDepartments;
