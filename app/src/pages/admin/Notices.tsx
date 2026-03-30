// ============================================
// ADMIN NOTICES (Smart Delivery System)
// ============================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Search, Trash2, Edit2, AlertCircle, Globe, Users as UsersIcon, UserIcon } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllNotices, deleteNotice, createNotice, updateNotice, getAllUsers, getAllDepartments } from '@/services/firestoreService';
import type { Notice, NoticeType, User, Department } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface NoticeFormData {
  title: string;
  message: string;
  category: string;
  noticeType: NoticeType;
  targetId: string;
  targetName: string;
}

const EMPTY_FORM: NoticeFormData = { 
  title: '', message: '', category: 'general', 
  noticeType: 'global', targetId: '', targetName: '' 
};

const AdminNotices: React.FC = () => {
  const { userData } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState<NoticeFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Target selection data
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);

  useEffect(() => {
    loadNotices();
    loadTargetData();
  }, []);

  const loadNotices = async () => {
    try {
      setIsLoading(true);
      const data = await getAllNotices();
      setNotices(data);
    } catch (error) {
      console.error('Error loading notices:', error);
      toast.error('Failed to load notices');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTargetData = async () => {
    try {
      const [users, depts] = await Promise.all([getAllUsers(), getAllDepartments()]);
      setAllUsers(users);
      setAllDepartments(depts);
    } catch (err) {
      console.error('Error loading target data:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this notice?')) {
      try {
        await deleteNotice(id);
        toast.success('Notice deleted successfully');
        loadNotices();
      } catch (error) {
        toast.error('Failed to delete notice');
      }
    }
  };

  const openModal = (notice?: Notice) => {
    if (notice) {
      setEditingNotice(notice);
      setFormData({ 
        title: notice.title, 
        message: notice.message, 
        category: notice.category,
        noticeType: notice.noticeType || 'global',
        targetId: notice.targetId || '',
        targetName: notice.targetName || ''
      });
    } else {
      setEditingNotice(null);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNotice(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate targeting
    if (formData.noticeType !== 'global' && !formData.targetId) {
      toast.error(`Please select a ${formData.noticeType === 'team' ? 'department/team' : 'user'} target`);
      return;
    }

    setIsSubmitting(true);
    try {
      const noticeData = {
        title: formData.title,
        message: formData.message,
        category: formData.category as Notice['category'],
        noticeType: formData.noticeType,
        targetId: formData.noticeType !== 'global' ? formData.targetId : undefined,
        targetName: formData.noticeType !== 'global' ? formData.targetName : undefined,
      };

      if (editingNotice) {
        await updateNotice(editingNotice.id, noticeData);
        toast.success('Notice updated successfully');
      } else {
        await createNotice({
          ...noticeData,
          createdAt: new Date(),
          isActive: true,
          postedBy: userData?.uid || 'admin',
          postedByName: userData?.name || 'Admin User',
          targetRoles: ['all'] as any
        } as any);
        toast.success('Notice created successfully');
      }
      closeModal();
      loadNotices();
    } catch (error) {
      toast.error(editingNotice ? 'Failed to update notice' : 'Failed to create notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotices = notices.filter(n => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (n.message || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || n.category === categoryFilter;
    const nType = n.noticeType || 'global';
    const matchesType = typeFilter === 'all' || nType === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'policy': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'event': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'team': return <UsersIcon className="w-3.5 h-3.5" />;
      case 'individual': return <UserIcon className="w-3.5 h-3.5" />;
      default: return <Globe className="w-3.5 h-3.5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'team': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'individual': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Notice Board Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create and manage announcements with smart delivery
            </p>
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Notice</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Types</option>
              <option value="global">🌍 Global</option>
              <option value="team">👥 Team</option>
              <option value="individual">👤 Individual</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Categories</option>
              <option value="general">General</option>
              <option value="urgent">Urgent</option>
              <option value="policy">Policy</option>
              <option value="event">Event</option>
            </select>
          </div>
        </div>

        {/* Notice List */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredNotices.length > 0 ? (
            <AnimatePresence>
              {filteredNotices.map((notice, index) => {
                const noticeType = notice.noticeType || 'global';
                return (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-start gap-4"
                  >
                    <div className={`p-3 rounded-xl flex-shrink-0 ${getCategoryColor(notice.category)}`}>
                      {notice.category === 'urgent' ? <AlertCircle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{notice.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(notice.category)}`}>
                              {notice.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${getTypeColor(noticeType)}`}>
                              {getTypeIcon(noticeType)}
                              {noticeType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-3">{notice.message}</p>
                          {noticeType !== 'global' && notice.targetName && (
                            <p className="text-xs text-gray-400 mb-2">
                              Target: <span className="font-medium text-gray-600 dark:text-gray-300">{notice.targetName}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openModal(notice)}
                            className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(notice.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Posted by {notice.postedByName}</span>
                        <span>•</span>
                        <span>{notice.createdAt ? (notice.createdAt instanceof Date ? notice.createdAt : notice.createdAt as any).toDate?.()?.toLocaleDateString() || new Date(notice.createdAt as any).toLocaleDateString() : 'Just now'}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No notices found.</p>
            </div>
          )}
        </div>

        {/* Add/Edit Notice Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {editingNotice ? 'Edit Notice' : 'Create New Notice'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                    placeholder="Notice Title"
                  />
                </div>

                {/* Notice Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Delivery Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'global', label: 'Global', icon: '🌍', desc: 'All users' },
                      { value: 'team', label: 'Team', icon: '👥', desc: 'Dept/Team' },
                      { value: 'individual', label: 'Individual', icon: '👤', desc: 'One user' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, noticeType: opt.value, targetId: '', targetName: '' })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          formData.noticeType === opt.value
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg">{opt.icon}</div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white mt-1">{opt.label}</div>
                        <div className="text-[10px] text-gray-500">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target selector for Team type */}
                {formData.noticeType === 'team' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select Department/Team
                    </label>
                    <select
                      value={formData.targetId}
                      onChange={(e) => {
                        const dept = allDepartments.find(d => d.id === e.target.value);
                        setFormData({ ...formData, targetId: e.target.value, targetName: dept?.name || '' });
                      }}
                      className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Select a department...</option>
                      {allDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Target selector for Individual type */}
                {formData.noticeType === 'individual' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select User
                    </label>
                    <select
                      value={formData.targetId}
                      onChange={(e) => {
                        const user = allUsers.find(u => u.uid === e.target.value);
                        setFormData({ ...formData, targetId: e.target.value, targetName: user?.name || '' });
                      }}
                      className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Select a user...</option>
                      {allUsers.map(user => (
                        <option key={user.uid} value={user.uid}>
                          {user.name} ({user.email}) — {user.role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="general">General</option>
                    <option value="urgent">Urgent</option>
                    <option value="policy">Policy</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 resize-none"
                    placeholder="Write your announcement here..."
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
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
                    {editingNotice ? 'Save Changes' : 'Post Notice'}
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

export default AdminNotices;
