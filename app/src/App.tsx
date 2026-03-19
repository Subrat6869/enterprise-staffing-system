// ============================================
// MAIN APP COMPONENT
// ============================================

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AIChatbot from '@/components/chatbot/AIChatbot';

// Loading Fallback Component
const FallbackLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="flex flex-col items-center">
      <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full" />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">Loading module...</p>
    </div>
  </div>
);

// Auth Pages
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const MfaSetup = lazy(() => import('@/pages/auth/MfaSetup'));
const MfaVerify = lazy(() => import('@/pages/auth/MfaVerify'));
const PhoneSetup = lazy(() => import('@/pages/auth/PhoneSetup'));
const PhoneVerify = lazy(() => import('@/pages/auth/PhoneVerify'));

// Admin Pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'));
const AdminNotices = lazy(() => import('@/pages/admin/Notices'));
const AdminDepartments = lazy(() => import('@/pages/admin/Departments'));

// HR Pages
const HRDashboard = lazy(() => import('@/pages/hr/Dashboard'));
const HREmployees = lazy(() => import('@/pages/hr/Employees'));
const HRVerifications = lazy(() => import('@/pages/hr/Verifications'));
const HRReports = lazy(() => import('@/pages/hr/Reports'));

// Manager Pages
const ManagerDashboard = lazy(() => import('@/pages/manager/Dashboard'));
const ManagerAssignments = lazy(() => import('@/pages/manager/Assignments'));
const ManagerDepartments = lazy(() => import('@/pages/manager/Departments'));
const ManagerReports = lazy(() => import('@/pages/manager/Reports'));

// Supervisor Pages
const SupervisorDashboard = lazy(() => import('@/pages/supervisor/Dashboard'));
const SupervisorTeam = lazy(() => import('@/pages/supervisor/Team'));
const SupervisorWorkTracking = lazy(() => import('@/pages/supervisor/WorkTracking'));
const SupervisorReports = lazy(() => import('@/pages/supervisor/Reports'));

// Project Manager Pages
const ProjectManagerDashboard = lazy(() => import('@/pages/projectManager/Dashboard'));
const PMProjects = lazy(() => import('@/pages/projectManager/Projects'));
const PMTasks = lazy(() => import('@/pages/projectManager/Tasks'));
const PMTeam = lazy(() => import('@/pages/projectManager/Team'));
const PMReports = lazy(() => import('@/pages/projectManager/Reports'));
const PMWorkSubmissions = lazy(() => import('@/pages/projectManager/WorkSubmissions'));

// Employee Pages
const EmployeeDashboard = lazy(() => import('@/pages/employee/Dashboard'));
const EmployeeProjects = lazy(() => import('@/pages/employee/Projects'));
const EmployeeTasks = lazy(() => import('@/pages/employee/Tasks'));
const EmployeeWorkLog = lazy(() => import('@/pages/employee/WorkLog'));
const EmployeeReports = lazy(() => import('@/pages/employee/Reports'));

// Intern/Apprentice Pages
const InternDashboard = lazy(() => import('@/pages/intern/Dashboard'));
const InternTasks = lazy(() => import('@/pages/intern/Tasks'));
const InternUpdates = lazy(() => import('@/pages/intern/Updates'));
const InternProgress = lazy(() => import('@/pages/intern/Progress'));

// Shared Pages
const ProfileSettings = lazy(() => import('@/pages/shared/ProfileSettings'));

import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  // Auto-detect GitHub Pages vs Vercel/local
  const isGitHubPages = window.location.hostname.includes('github.io');
  const basename = isGitHubPages ? '/enterprise-staffing-system' : '/';

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router basename={basename}>
          <Suspense fallback={<FallbackLoader />}>
            <Routes>
              {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mfa-setup" element={<MfaSetup />} />
          <Route path="/mfa-verify" element={<MfaVerify />} />
          <Route path="/phone-setup" element={<PhoneSetup />} />
          <Route path="/phone-verify" element={<PhoneVerify />} />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />


          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDepartments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notices"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminNotices />
              </ProtectedRoute>
            }
          />

          {/* HR Routes */}
          <Route
            path="/hr/dashboard"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HRDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/employees"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HREmployees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/verifications"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HRVerifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/reports"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HRReports />
              </ProtectedRoute>
            }
          />

          {/* General Manager Routes */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute allowedRoles={['general_manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/assignments"
            element={
              <ProtectedRoute allowedRoles={['general_manager']}>
                <ManagerAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/departments"
            element={
              <ProtectedRoute allowedRoles={['general_manager']}>
                <ManagerDepartments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/reports"
            element={
              <ProtectedRoute allowedRoles={['general_manager']}>
                <ManagerReports />
              </ProtectedRoute>
            }
          />

          {/* Supervisor Routes */}
          <Route
            path="/supervisor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/team"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <SupervisorTeam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/work-tracking"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <SupervisorWorkTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/reports"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <SupervisorReports />
              </ProtectedRoute>
            }
          />

          {/* Project Manager Routes */}
          <Route
            path="/pm/dashboard"
            element={
              <ProtectedRoute allowedRoles={['project_manager']}>
                <ProjectManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pm/projects"
            element={
              <ProtectedRoute allowedRoles={['project_manager']}>
                <PMProjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pm/tasks"
            element={
              <ProtectedRoute allowedRoles={['project_manager']}>
                <PMTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pm/team"
            element={
              <ProtectedRoute allowedRoles={['project_manager']}>
                <PMTeam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pm/reports"
            element={
              <ProtectedRoute allowedRoles={['project_manager']}>
                <PMReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pm/work-submissions"
            element={
              <ProtectedRoute allowedRoles={['project_manager']}>
                <PMWorkSubmissions />
              </ProtectedRoute>
            }
          />

          {/* Employee Routes */}
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/projects"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeProjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/tasks"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/work-log"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeWorkLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/reports"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeReports />
              </ProtectedRoute>
            }
          />

          {/* Intern/Apprentice Routes */}
          <Route
            path="/intern/dashboard"
            element={
              <ProtectedRoute allowedRoles={['intern', 'apprentice']}>
                <InternDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/intern/tasks"
            element={
              <ProtectedRoute allowedRoles={['intern', 'apprentice']}>
                <InternTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/intern/updates"
            element={
              <ProtectedRoute allowedRoles={['intern', 'apprentice']}>
                <InternUpdates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/intern/progress"
            element={
              <ProtectedRoute allowedRoles={['intern', 'apprentice']}>
                <InternProgress />
              </ProtectedRoute>
            }
          />

          {/* Shared Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />

          {/* Catch all - 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>

        {/* AI Chatbot - Available on all authenticated pages */}
        <AIChatbot />

        {/* Toast Notifications */}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
            },
          }}
        />
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
