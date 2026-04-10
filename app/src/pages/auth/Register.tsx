// ============================================
// REGISTER PAGE
// ============================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Briefcase,
  Building2,
  GraduationCap,
  Upload,
  ArrowRight,
  Loader2,
  CheckCircle,
  Sun,
  Moon,
  MapPin
} from 'lucide-react';
import { registerUser } from '@/services/authService';
import { getAllDepartments } from '@/services/firestoreService';
import { useDarkMode } from '@/hooks/useDarkMode';
import { toast } from 'sonner';
import type { UserRole } from '@/types';
import MCLLogo from '@/components/ui/MCLLogo';
import { AREAS, getAreaName } from '@/data/areaData';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Exclude<UserRole, 'admin' | 'hr' | 'general_manager' | 'supervisor' | 'project_manager'>;
  department: string;
  qualification: string;
  areaCode: string;
}

const availableRoles = [
  { value: 'employee', label: 'Employee' },
  { value: 'intern', label: 'Intern' },
  { value: 'apprentice', label: 'Apprentice' }
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [step, setStep] = useState(1);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<RegisterFormData>();

  const selectedRole = watch('role');

  React.useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const depts = await getAllDepartments();
      setDepartments(depts.map(d => ({ id: d.id, name: d.name })));
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setCertificate(file);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate certificate for intern/apprentice
    if ((data.role === 'intern' || data.role === 'apprentice') && !certificate) {
      toast.error('Bona-fide certificate is required for Intern/Apprentice registration');
      return;
    }

    setIsLoading(true);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        department: data.department,
        qualification: data.qualification,
        certificate: certificate || undefined,
        areaCode: data.areaCode,
        areaName: getAreaName(data.areaCode)
      });

      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!watch('name') || !watch('email') || !watch('password') || !watch('confirmPassword')) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (errors.email || errors.password) {
        toast.error('Please fix the errors before proceeding');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4 relative">
      {/* Dark Mode Toggle */}
      <button
        type="button"
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-10 relative z-20"
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 inline-flex">
            <MCLLogo className="h-16 w-auto" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Create Account
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
          Join our enterprise workforce
        </p>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                s === step
                  ? 'bg-teal-600 text-white'
                  : s < step
                  ? 'bg-teal-100 text-teal-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
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
                  Password *
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
                    placeholder="Create a password"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('confirmPassword', { 
                      required: 'Please confirm your password'
                    })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold hover:from-teal-700 hover:to-teal-800 transition-all"
              >
                Next Step
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Role & Department */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Area *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    {...register('areaCode', { required: 'Area is required' })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="">Select your area</option>
                    {AREAS.map((area) => (
                      <option key={area.code} value={area.code}>
                        {area.code} — {area.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.areaCode && (
                  <p className="mt-1 text-sm text-red-500">{errors.areaCode.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role *
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    {...register('role', { required: 'Role is required' })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="">Select your role</option>
                    {availableRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    {...register('department')}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="">Select department (optional)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Qualification
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    {...register('qualification')}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="e.g., BS in Computer Science"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold hover:from-teal-700 hover:to-teal-800 transition-all"
                >
                  Next Step
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Certificate Upload */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              {(selectedRole === 'intern' || selectedRole === 'apprentice') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bona-fide Certificate *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-teal-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleCertificateChange}
                      className="hidden"
                      id="certificate"
                    />
                    <label htmlFor="certificate" className="cursor-pointer">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {certificate ? certificate.name : 'Click to upload certificate'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, JPG, or PNG (max 5MB)
                      </p>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Required for Intern/Apprentice registration
                  </p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Registration Summary
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Name:</span> {watch('name')}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Email:</span> {watch('email')}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Role:</span> {watch('role')?.replace('_', ' ')}
                  </p>
                  {watch('areaCode') && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Area:</span>{' '}
                      {watch('areaCode')} — {getAreaName(watch('areaCode'))}
                    </p>
                  )}
                  {watch('department') && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Department:</span>{' '}
                      {departments.find(d => d.id === watch('department'))?.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold hover:from-teal-700 hover:to-teal-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </form>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-teal-600 hover:text-teal-700 font-semibold"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
