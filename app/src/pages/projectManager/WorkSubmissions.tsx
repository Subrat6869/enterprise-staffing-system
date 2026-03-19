// ============================================
// PM WORK SUBMISSIONS — DEDICATED PAGE
// ============================================
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Search, Calendar, CheckCircle, Clock, Users, ChevronLeft, ChevronRight, Trash2, AlertTriangle, FileText, Star, AlertOctagon, ArrowRight, FolderOpen, CheckSquare } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { getAllDailyWork, getAllUsers, deleteDailyWork } from '@/services/firestoreService';
import type { DailyWork, User } from '@/types';
import { toast } from 'sonner';
import { formatDate, getInitials, getAvatarColor } from '@/utils/helpers';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PMWorkSubmissions: React.FC = () => {
  const { userData } = useAuth();
  const [submissions, setSubmissions] = useState<DailyWork[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [showCalendar, setShowCalendar] = useState(false);

  // Delete State
  const [submissionToDelete, setSubmissionToDelete] = useState<DailyWork | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { if (userData?.uid) loadData(); }, [userData]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allWork, allUsers] = await Promise.all([
        getAllDailyWork(),
        getAllUsers()
      ]);
      setSubmissions(allWork);
      setUsers(allUsers);
    } catch { toast.error('Failed to load submissions'); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async () => {
    if (!submissionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteDailyWork(submissionToDelete.id);
      toast.success('Work submission deleted successfully');
      setSubmissions(submissions.filter(s => s.id !== submissionToDelete.id));
      setSubmissionToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete work submission');
    } finally {
      setIsDeleting(false);
    }
  };

  // Build a lookup from userId to user info
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach(u => map.set(u.uid, u));
    return map;
  }, [users]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(w => {
      // Date filter: only show for selected month/year
      const d = (w.date as any)?.toDate?.() || new Date(w.date);
      if (d.getFullYear() !== calYear || d.getMonth() !== calMonth) return false;

      // Role filter
      if (roleFilter !== 'all') {
        const user = userMap.get(w.employeeId);
        if (!user || user.role !== roleFilter) return false;
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (w.employeeName || '').toLowerCase().includes(q) ||
               (w.description || '').toLowerCase().includes(q) ||
               (w.projectName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [submissions, calYear, calMonth, roleFilter, searchQuery, userMap]);

  // Stats for filtered data
  const totalHours = filteredSubmissions.reduce((a, w) => a + (w.hoursWorked || 0), 0);
  const uniqueEmployees = new Set(filteredSubmissions.map(w => w.employeeId)).size;
  const totalSubmissions = filteredSubmissions.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Work Submissions</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">All daily work submissions from employees, interns & apprentices</p>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name, description, project..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
          </div>

          {/* Role Filter */}
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
            <option value="all">All Roles</option>
            <option value="employee">Employee</option>
            <option value="intern">Intern</option>
            <option value="apprentice">Apprentice</option>
          </select>

          {/* Calendar Picker */}
          <div className="relative">
            <button onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />{MONTHS[calMonth]} {calYear}
            </button>
            {showCalendar && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCalYear(y => y - 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
                  <span className="font-semibold text-gray-900 dark:text-white">{calYear}</span>
                  <button onClick={() => setCalYear(y => y + 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SHORT_MONTHS.map((m, i) => (
                    <button key={m} onClick={() => { setCalMonth(i); setShowCalendar(false); }}
                      className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${calMonth === i ? 'bg-teal-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{m}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Submissions', value: totalSubmissions, icon: ClipboardList, color: 'bg-blue-500' },
            { label: 'Hours Logged', value: totalHours.toFixed(1), icon: Clock, color: 'bg-purple-500' },
            { label: 'Contributors', value: uniqueEmployees, icon: Users, color: 'bg-teal-500' }
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-5 h-5 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p><p className="text-sm text-gray-500">{s.label}</p></div>
            </motion.div>
          ))}
        </div>

        {/* Submissions List */}
        {isLoading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No work submissions found for {MONTHS[calMonth]} {calYear}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((w, i) => {
              const user = userMap.get(w.employeeId);
              const roleBadge = user?.role || 'employee';
              return (
                <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(w.employeeName)}`}>
                        {getInitials(w.employeeName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-white text-base">{w.employeeName}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            roleBadge === 'intern' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            roleBadge === 'apprentice' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                            'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                          }`}>{roleBadge}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Submitted on {formatDate(w.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{w.hoursWorked}<span className="text-sm font-normal text-gray-400">h</span></p>
                        <p className="text-[10px] text-gray-400">hours worked</p>
                      </div>
                      <button 
                        onClick={() => setSubmissionToDelete(w)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete submission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Project & Task Tags */}
                  {(w.projectName || w.taskTitle) && (
                    <div className="flex flex-wrap gap-2 px-5 pb-3">
                      {w.projectName && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                          <FolderOpen className="w-3 h-3" /> {w.projectName}
                        </span>
                      )}
                      {w.taskTitle && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          <CheckSquare className="w-3 h-3" /> {w.taskTitle}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-100 dark:border-gray-800 mx-5" />

                  {/* Detail Sections */}
                  <div className="px-5 py-4 space-y-4">
                    {w.description && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1.5">
                          <FileText className="w-3 h-3" /> What I worked on
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{w.description}</p>
                      </div>
                    )}

                    {w.accomplishments && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-500 mb-1.5 flex items-center gap-1.5">
                          <Star className="w-3 h-3" /> Accomplishments
                        </p>
                        <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/10 rounded-xl px-3 py-2.5 border border-green-100 dark:border-green-900/30">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{w.accomplishments}</p>
                        </div>
                      </div>
                    )}

                    {w.challenges && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1.5 flex items-center gap-1.5">
                          <AlertOctagon className="w-3 h-3" /> Challenges Faced
                        </p>
                        <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-900/10 rounded-xl px-3 py-2.5 border border-orange-100 dark:border-orange-900/30">
                          <AlertOctagon className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{w.challenges}</p>
                        </div>
                      </div>
                    )}

                    {w.tomorrowPlan && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3" /> Tomorrow's Plan
                        </p>
                        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/10 rounded-xl px-3 py-2.5 border border-blue-100 dark:border-blue-900/30">
                          <ArrowRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{w.tomorrowPlan}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle>Delete Work Submission</DialogTitle>
                  <DialogDescription className="mt-1">
                    Are you sure you want to delete this work submission? This action cannot be undone.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {submissionToDelete && (
              <div className="my-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(submissionToDelete.employeeName)}`}>
                    {getInitials(submissionToDelete.employeeName)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{submissionToDelete.employeeName}</p>
                    <p className="text-xs text-gray-500">{formatDate(submissionToDelete.date)}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">{submissionToDelete.description}</p>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setSubmissionToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Submission
                  </>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PMWorkSubmissions;
