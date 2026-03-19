// ============================================
// DASHBOARD LAYOUT COMPONENT
// ============================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar isCollapsed={false} onToggle={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        <Header
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        <main className="p-4 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
