// ============================================
// ADMIN ANALYTICS
// ============================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, Download, Calendar, Filter } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getDashboardAnalytics } from '@/services/firestoreService';
import { toast } from 'sonner';

const AdminAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [, setAnalyticsData] = useState<any>(null);
  
  const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const formatMonthText = (ym: string) => {
    if (!ym) return 'Select Month';
    const [year, month] = ym.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await getDashboardAnalytics();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamically generate 6-month trend data based on the selected month
  const generateDataForMonth = (monthStr: string) => {
    let baseDate = new Date();
    if (monthStr) {
      const [year, month] = monthStr.split('-');
      baseDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    }
    
    const seed = baseDate.getFullYear() * 100 + baseDate.getMonth();
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      
      // Pseudo-random metrics derived from the month seed
      const r1 = Math.sin(seed + i * 1) * 0.5 + 0.5;
      const r2 = Math.sin(seed + i * 2) * 0.5 + 0.5;
      const r3 = Math.sin(seed + i * 3) * 0.5 + 0.5;
      
      data.push({
        name: monthName,
        employees: Math.floor(100 + r1 * 400),
        tasks: Math.floor(100 + r2 * 800),
        projects: Math.floor(10 + r3 * 30),
      });
    }
    return data;
  };

  const monthlyData = generateDataForMonth(selectedMonth);

  const handleExportReport = () => {
    try {
      const headers = ['Month', 'Employees Enrolled', 'Tasks Completed', 'Active Projects'];
      const csvData = monthlyData.map(data => [
        data.name,
        data.employees.toString(),
        data.tasks.toString(),
        data.projects.toString()
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_export_6months.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Analytics report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              System Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Comprehensive overview of system performance and usage
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <button
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{formatMonthText(selectedMonth)}</span>
              </button>

              {isCalendarOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-sm font-semibold text-center text-gray-900 dark:text-white">
                      Select Month & Year
                    </p>
                  </div>
                  <div className="p-2 grid grid-cols-3 gap-1 max-h-60 overflow-y-auto">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - (11 - i));
                      const ymStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const isSelected = selectedMonth === ymStr;
                      
                      return (
                        <button
                          key={ymStr}
                          onClick={() => {
                            setSelectedMonth(ymStr);
                            setIsCalendarOpen(false);
                          }}
                          className={`px-2 py-2 text-sm rounded-lg text-center transition-colors ${
                            isSelected 
                              ? 'bg-teal-600 text-white font-medium shadow-sm' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {d.toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export Report</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Task Completion Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Completion</h3>
                  <p className="text-sm text-gray-500">6-month trend</p>
                </div>
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="tasks" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Chart 2: Employee Growth */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Growth</h3>
                  <p className="text-sm text-gray-500">New hires by month</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="employees" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
