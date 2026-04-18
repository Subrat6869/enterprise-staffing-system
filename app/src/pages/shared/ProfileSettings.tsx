// ============================================
// PROFILE & ACCOUNT SETTINGS (Enhanced)
// ============================================
// Features:
// 1. Profile editing (name, photo)
// 2. Change Password (with re-auth + strong validation)
// 3. Change Email (with re-auth + verification)
// 4. Notification Settings (persisted in Firestore)
// 5. Activity logging for all sensitive actions

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Briefcase, Camera, Shield, Bell, Loader2, MapPin,
  Lock, Eye, EyeOff, Check, X, AlertTriangle, CheckCircle2, KeyRound, AtSign
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
  updateUserProfile,
  uploadProfilePhoto,
  changeUserPassword,
  reauthenticateUser,
  changeUserEmail
} from '@/services/authService';
import { getUserSettings, updateUserSettings, logActivity } from '@/services/firestoreService';
import { getAvatarColor, getInitials, formatRole } from '@/utils/helpers';
import { validateEmail, validatePassword } from '@/utils/validation';
import { toast } from 'sonner';
import { formatArea } from '@/data/areaData';
import type { UserSettings } from '@/types';

// ============================================
// PASSWORD STRENGTH INDICATOR
// ============================================

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
};

// ============================================
// MAIN COMPONENT
// ============================================

const ProfileSettings = () => {
  const { userData, currentUser, refreshUserData } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');

  // Profile State
  const [name, setName] = useState(userData?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Notification Settings State
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    systemNotifications: true
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load notification settings on mount
  useEffect(() => {
    if (userData?.uid) {
      loadSettings();
    }
  }, [userData?.uid]);

  const loadSettings = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setIsLoadingSettings(true);
      const data = await getUserSettings(userData.uid);
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [userData?.uid]);

  // ==========================================
  // PROFILE HANDLERS
  // ==========================================

  const handleSaveProfile = async () => {
    if (!userData?.uid) return;
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile(userData.uid, { name: name.trim() });
      await refreshUserData();
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.uid) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      await uploadProfilePhoto(userData.uid, file);
      await refreshUserData();
      toast.success('Profile photo updated');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // PASSWORD CHANGE HANDLER
  // ==========================================

  const handleUpdatePassword = async () => {
    if (!currentUser) return;

    // Validate current password is provided
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    // Validate new password with strong rules
    const pwResult = validatePassword(newPassword);
    if (!pwResult.valid) {
      toast.error(pwResult.error || 'Invalid password');
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // Prevent same password
    if (currentPassword === newPassword) {
      toast.error('New password must be different from your current password');
      return;
    }

    try {
      setIsChangingPassword(true);

      // Step 1: Re-authenticate with current password
      await reauthenticateUser(currentUser, currentPassword);

      // Step 2: Update to new password
      await changeUserPassword(currentUser, newPassword);

      // Step 3: Log the activity
      if (userData?.uid) {
        logActivity(userData.uid, userData.name, userData.role, 'USER_UPDATED', `${userData.name} changed their password`, 'Auth');
      }

      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully! 🔐');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid current password. Please try again.');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Session expired. Please log out and log back in, then try again.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please wait a moment and try again.');
      } else {
        toast.error(error.message || 'Failed to update password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ==========================================
  // EMAIL CHANGE HANDLER
  // ==========================================

  const handleChangeEmail = async () => {
    if (!currentUser || !userData?.uid) return;

    // Validate new email
    const emailResult = validateEmail(newEmail.toLowerCase());
    if (!emailResult.valid) {
      toast.error(emailResult.error || 'Invalid email address');
      return;
    }

    // Must be different
    if (newEmail.toLowerCase() === userData.email.toLowerCase()) {
      toast.error('New email is the same as your current email');
      return;
    }

    // Password required for security
    if (!emailPassword) {
      toast.error('Please enter your password to confirm this change');
      return;
    }

    try {
      setIsChangingEmail(true);

      // Step 1: Re-authenticate
      await reauthenticateUser(currentUser, emailPassword);

      // Step 2: Send verification to new email
      await changeUserEmail(currentUser, newEmail.toLowerCase());

      // Step 3: Log the activity
      logActivity(userData.uid, userData.name, userData.role, 'USER_UPDATED', `${userData.name} initiated email change to ${newEmail.toLowerCase()}`, 'Auth');

      // Clear fields
      setNewEmail('');
      setEmailPassword('');
      toast.success('Verification email sent to your new address! Please check your inbox and click the verification link to complete the change. 📧');
    } catch (error: any) {
      console.error('Error changing email:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid password. Please try again.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already in use by another account.');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Session expired. Please log out and log back in.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email format.');
      } else {
        toast.error(error.message || 'Failed to change email');
      }
    } finally {
      setIsChangingEmail(false);
    }
  };

  // ==========================================
  // NOTIFICATION SETTINGS HANDLER
  // ==========================================

  const handleToggleNotification = async (key: keyof UserSettings, value: boolean) => {
    if (!userData?.uid) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    try {
      setIsSavingSettings(true);
      await updateUserSettings(userData.uid, { [key]: value });
      toast.success('Notification settings updated');
    } catch (error) {
      // Revert on failure
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast.error('Failed to update notification settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ==========================================
  // PASSWORD VALIDATION HELPERS (for UI)
  // ==========================================

  const passwordChecks = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
    { label: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword) },
  ];

  const strength = getPasswordStrength(newPassword);

  // ==========================================
  // TABS
  // ==========================================

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* ==========================================
                PROFILE TAB
                ========================================== */}
            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      {userData?.photoURL ? (
                        <img 
                          src={userData.photoURL} 
                          alt={userData.name} 
                          className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-800"
                        />
                      ) : (
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl text-white shadow-lg ${getAvatarColor(userData?.name || '')}`}>
                          {getInitials(userData?.name || 'User')}
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      Change Photo
                    </button>
                  </div>

                  {/* Form Section */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input type="email" value={userData?.email || ''} disabled className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role / Position</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={formatRole(userData?.role || '')} disabled className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed" />
                      </div>
                    </div>

                    {userData?.areaCode && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Area</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input type="text" value={formatArea(userData.areaCode, userData.areaName)} disabled className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed" />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex justify-end">
                      <button 
                        onClick={handleSaveProfile} 
                        disabled={isSaving || !name.trim()}
                        className="px-6 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                SECURITY TAB
                ========================================== */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Secure your account with a strong password</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-w-lg">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Enter your current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password Strength Meter */}
                      {newPassword && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                                style={{ width: `${(strength.score / 5) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              strength.score <= 2 ? 'text-red-500' :
                              strength.score <= 3 ? 'text-amber-500' :
                              strength.score <= 4 ? 'text-blue-500' :
                              'text-emerald-500'
                            }`}>
                              {strength.label}
                            </span>
                          </div>
                          
                          {/* Requirements Checklist */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {passwordChecks.map((check, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                {check.met ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-gray-400" />
                                )}
                                <span className={`text-xs ${check.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                                  {check.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                            confirmPassword && confirmPassword !== newPassword
                              ? 'border-red-300 dark:border-red-700'
                              : confirmPassword && confirmPassword === newPassword
                              ? 'border-emerald-300 dark:border-emerald-700'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Passwords do not match
                        </p>
                      )}
                      {confirmPassword && confirmPassword === newPassword && newPassword && (
                        <p className="mt-1 text-xs text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passwords match
                        </p>
                      )}
                    </div>

                    <button 
                      onClick={handleUpdatePassword}
                      disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </div>

                {/* Change Email Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <AtSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Email</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">A verification link will be sent to your new email</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-w-lg">
                    {/* Current Email (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={userData?.email || ''}
                          disabled
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* New Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="new.email@example.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value.toLowerCase())}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 placeholder:text-gray-400"
                        />
                      </div>
                      {newEmail && !validateEmail(newEmail).valid && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {validateEmail(newEmail).error}
                        </p>
                      )}
                    </div>

                    {/* Password Confirmation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm with Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showEmailPassword ? 'text' : 'password'}
                          placeholder="Enter your current password"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEmailPassword(!showEmailPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Info Alert */}
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        A verification link will be sent to your new email. Your email will only be changed after you click the link.
                      </p>
                    </div>

                    <button
                      onClick={handleChangeEmail}
                      disabled={isChangingEmail || !newEmail || !emailPassword || !validateEmail(newEmail).valid}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isChangingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isChangingEmail ? 'Sending Verification...' : 'Send Verification Email'}
                    </button>
                  </div>
                </div>

                {/* 2FA Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      userData?.mfaEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {userData?.mfaEnabled ? '✓ Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                NOTIFICATIONS TAB
                ========================================== */}
            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Control how you receive alerts and updates</p>
                  </div>
                </div>
                
                {isLoadingSettings ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between py-4 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Receive daily summaries and important alerts via email</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleNotification('emailNotifications', !settings.emailNotifications)}
                        disabled={isSavingSettings}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                          settings.emailNotifications ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                            settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* System/Push Notifications */}
                    <div className="flex items-center justify-between py-4 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">System Notifications</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Receive in-app alerts and push notifications</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleNotification('systemNotifications', !settings.systemNotifications)}
                        disabled={isSavingSettings}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                          settings.systemNotifications ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                            settings.systemNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Status Summary */}
                    <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-2">Current Status</p>
                      <div className="flex gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          settings.emailNotifications
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {settings.emailNotifications ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          Email {settings.emailNotifications ? 'ON' : 'OFF'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          settings.systemNotifications
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {settings.systemNotifications ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          System {settings.systemNotifications ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
