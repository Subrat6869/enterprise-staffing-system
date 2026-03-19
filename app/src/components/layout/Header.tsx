// ============================================
// HEADER COMPONENT
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { logoutUser } from '@/services/authService';
import { getInitials, getAvatarColor, formatRelativeTime } from '@/utils/helpers';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
  notificationCount?: number;
}

// Mock notifications
const mockNotifications = [
  {
    id: '1',
    title: 'New task assigned',
    message: 'You have been assigned a new task: "Update documentation"',
    time: new Date(Date.now() - 1000 * 60 * 30),
    read: false
  },
  {
    id: '2',
    title: 'Project deadline approaching',
    message: 'Project "Enterprise Portal" deadline is in 2 days',
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false
  },
  {
    id: '3',
    title: 'Weekly report approved',
    message: 'Your weekly report has been approved by your supervisor',
    time: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true
  }
];

const Header = ({ 
  onMenuClick, 
  isMobileMenuOpen,
  notificationCount = 2 
}: HeaderProps) => {
  const { userData } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsNotificationsOpen(false);
      setIsProfileOpen(false);
    };
    if (isNotificationsOpen || isProfileOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isNotificationsOpen, isProfileOpen]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Desktop Search */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  toast.info(`Searching for "${searchQuery}"...`);
                  setSearchQuery('');
                }
              }}
              className="pl-10 pr-4 py-2 w-64 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors overflow-hidden relative flex items-center justify-center w-9 h-9"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDarkMode ? 'dark' : 'light'}
                initial={{ y: -20, opacity: 0, rotate: -90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 20, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
                className="absolute"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </motion.div>
            </AnimatePresence>
          </button>

          {/* AI Chatbot Button */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors relative"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-teal-500 rounded-full"></span>
          </button>

          {/* Notifications */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); }}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs font-medium rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden -right-16 sm:right-0"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {mockNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-none ${
                          !notification.read ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            !notification.read ? 'bg-teal-500' : 'bg-gray-300'
                          }`} />
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {formatRelativeTime(notification.time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                    <button className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                  getAvatarColor(userData?.name || '')
                }`}
              >
                {getInitials(userData?.name || '')}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {userData?.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {userData?.email}
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => navigate('/profile')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm">Profile & Settings</span>
                    </button>
                    <hr className="my-2 border-gray-200 dark:border-gray-800" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    toast.info(`Searching for "${searchQuery}"...`);
                    setSearchQuery('');
                    setIsMobileSearchOpen(false);
                  }
                }}
                autoFocus
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
