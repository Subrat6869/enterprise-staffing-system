// ============================================
// LOGIN PAGE
// ============================================

import * as React from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Chrome,
  Sun,
  Moon,
  Loader2
} from 'lucide-react';
import MCLLogo from '@/components/ui/MCLLogo';
import { loginWithEmail, loginWithGoogle } from '@/services/authService';
import { useDarkMode } from '@/hooks/useDarkMode';
import { toast } from 'sonner';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { userData } = await loginWithEmail(data.email, data.password);
      toast.success(`Welcome back, ${userData.name}!`);
      
      // Redirect based on role (with MFA check)
      redirectBasedOnRole(userData.role, userData.mfaEnabled);
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { userData } = await loginWithGoogle();
      toast.success(`Welcome, ${userData.name}!`);
      redirectBasedOnRole(userData.role, userData.mfaEnabled);
    } catch (error: any) {
      toast.error(error.message || 'Failed to login with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };


  const MFA_ROLES = ['admin', 'hr', 'general_manager', 'supervisor', 'project_manager'];

  const redirectBasedOnRole = (role: string, mfaEnabled?: boolean) => {
    // If role requires MFA
    if (MFA_ROLES.includes(role)) {
      // Clear any previous MFA session
      sessionStorage.removeItem('mfa_verified');

      if (!mfaEnabled) {
        // First time — need to setup 2FA
        navigate('/mfa-setup');
        return;
      } else {
        // MFA enabled — need to verify
        navigate('/mfa-verify');
        return;
      }
    }

    // Non-MFA roles go straight to dashboard
    const roleRoutes: { [key: string]: string } = {
      employee: '/employee/dashboard',
      intern: '/intern/dashboard',
      apprentice: '/intern/dashboard'
    };
    navigate(roleRoutes[role] || '/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4 relative">
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-6 right-6 p-3 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10 overflow-hidden relative flex items-center justify-center w-12 h-12"
      >
        <motion.div
          key={isDarkMode ? 'dark' : 'light'}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-teal-600" />
          )}
        </motion.div>
      </button>

      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-10"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 inline-flex">
              <MCLLogo className="h-16 w-auto" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-6"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Chrome className="w-5 h-5 text-red-500" />
            )}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Continue with Google
            </span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Invalid email address'
                    }
                  })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold hover:from-teal-700 hover:to-teal-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-teal-600 hover:text-teal-700 font-semibold"
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
