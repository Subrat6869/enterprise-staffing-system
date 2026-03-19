// ============================================
// MFA VERIFY PAGE — Enter 6-digit Authenticator Code
// ============================================

import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
// @ts-expect-error - No types available for old v12 wrapper
import { authenticator } from '@otplib/preset-browser';
import { ShieldCheck, KeyRound, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logoutUser } from '@/services/authService';
import { toast } from 'sonner';
import MCLLogo from '@/components/ui/MCLLogo';

const MFA_ROLES = ['admin', 'hr', 'general_manager', 'supervisor', 'project_manager'];

const MfaVerify: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    if (!userData?.mfaSecret) {
      toast.error('MFA not configured. Redirecting to setup...');
      navigate('/mfa-setup');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = authenticator.verify({ token: code, secret: userData.mfaSecret });

      if (isValid) {
        // Set session flag
        sessionStorage.setItem('mfa_verified', 'true');
        toast.success('Verification successful!');

        // Redirect to dashboard
        const roleRoutes: { [key: string]: string } = {
          admin: '/admin/dashboard',
          hr: '/hr/dashboard',
          general_manager: '/manager/dashboard',
          supervisor: '/supervisor/dashboard',
          project_manager: '/pm/dashboard'
        };
        navigate(roleRoutes[userData.role] || '/');
      } else {
        setAttempts(prev => prev + 1);
        setCode('');
        if (attempts >= 4) {
          toast.error('Too many failed attempts. Please log in again.');
          await logoutUser();
          navigate('/login');
        } else {
          toast.error(`Invalid code. ${4 - attempts} attempts remaining.`);
        }
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch {
      toast.error('Failed to logout');
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  // Redirect if user doesn't need MFA
  React.useEffect(() => {
    if (!userData) return;
    if (!MFA_ROLES.includes(userData.role)) {
      navigate('/');
    }
  }, [userData, navigate]);

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 inline-flex">
            <MCLLogo className="h-12 w-auto" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Enter the 6-digit code from your Authenticator app
          </p>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
            <span className="text-sm font-bold text-teal-700 dark:text-teal-400">
              {userData.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userData.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userData.email}</p>
          </div>
        </div>

        {/* Code Input */}
        <div className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold hover:from-teal-700 hover:to-teal-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Verify & Continue
              </>
            )}
          </button>

          {attempts > 0 && (
            <p className="text-center text-sm text-red-500">
              {5 - attempts} attempts remaining
            </p>
          )}

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Use a different account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MfaVerify;
