import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Briefcase, Camera, Shield, Bell, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile, uploadProfilePhoto, changeUserPassword } from '@/services/authService';
import { getAvatarColor, getInitials, formatRole } from '@/utils/helpers';
import { toast } from 'sonner';

const ProfileSettings = () => {
  const { userData, currentUser, refreshUserData } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  // Profile State
  const [name, setName] = useState(userData?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleUpdatePassword = async () => {
    if (!currentUser) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      await changeUserPassword(currentUser, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in to change your password');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'profile'
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Profile Information
            {activeTab === 'profile' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-teal-400"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'settings'
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Account Settings
            {activeTab === 'settings' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-teal-400"
              />
            )}
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'profile' ? (
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
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="email" value={userData?.email || ''} disabled className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role / Position</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="text" value={formatRole(userData?.role || '')} disabled className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={handleSaveProfile} 
                      disabled={isSaving || !name.trim()}
                      className="px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Security Settings */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="py-2 border-b border-gray-100 dark:border-gray-800 space-y-4 pb-6">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Change Password</h3>
                      <p className="text-sm text-gray-500 mb-4">Update your account password</p>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="New Password (min 6 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                      />
                      <button 
                        onClick={handleUpdatePassword}
                        disabled={isChangingPassword || !newPassword || !confirmPassword}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isChangingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      Enable
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                </div>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer py-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                      <p className="text-sm text-gray-500">Receive daily summaries and alerts</p>
                    </div>
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-gray-700 peer-checked:bg-teal-600"></div>
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                      <p className="text-sm text-gray-500">Receive instant alerts in your browser</p>
                    </div>
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-gray-700 peer-checked:bg-teal-600"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
