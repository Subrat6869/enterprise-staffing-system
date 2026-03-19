// ============================================
// PHONE VERIFY PAGE — OTP verify (Returning Google users with saved phone)
// ============================================

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Smartphone, RefreshCw, Loader2, CheckCircle, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sendPhoneOtp, verifyPhoneOtp } from '@/services/authService';
import { RecaptchaVerifier, auth } from '@/firebase/config';
import { logoutUser } from '@/services/authService';
import { toast } from 'sonner';
import MCLLogo from '@/components/ui/MCLLogo';
import type { ConfirmationResult } from 'firebase/auth';

const PhoneVerify: React.FC = () => {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<InstanceType<typeof RecaptchaVerifier> | null>(null);

  // Redirect if no user
  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  // Auto-send OTP on mount once we have userData
  useEffect(() => {
    if (userData?.phoneNumber && !confirmationResult) {
      handleSendOtp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const setupRecaptcha = () => {
    if (!recaptchaVerifierRef.current && recaptchaRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
        callback: () => {},
      });
    }
    return recaptchaVerifierRef.current!;
  };

  const handleSendOtp = async () => {
    if (!userData?.phoneNumber) {
      toast.error('Phone number nahi mila. Setup page pe jao.');
      navigate('/phone-setup');
      return;
    }
    setIsSending(true);
    try {
      const verifier = setupRecaptcha();
      const result = await sendPhoneOtp(userData.phoneNumber, verifier);
      setConfirmationResult(result);
      setResendTimer(60);
      toast.success(`OTP bheja gaya ${maskPhone(userData.phoneNumber)} par!`);
    } catch (err: any) {
      console.error(err);
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
      toast.error(err.message || 'OTP send karne mein problem aayi');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('6 digit ka OTP daalo');
      return;
    }
    if (!confirmationResult) {
      toast.error('Pehle OTP mangwa lo');
      return;
    }
    setIsVerifying(true);
    try {
      await verifyPhoneOtp(confirmationResult, otp);
      sessionStorage.setItem('phone_verified', 'true');

      // For MFA roles also set mfa_verified
      const MFA_ROLES = ['admin', 'hr', 'general_manager', 'supervisor', 'project_manager'];
      if (userData?.role && MFA_ROLES.includes(userData.role)) {
        sessionStorage.setItem('mfa_verified', 'true');
      }

      toast.success('OTP sahi hai! Welcome! 🎉');
      redirectToDashboard();
    } catch (err: any) {
      console.error(err);
      setAttempts(prev => prev + 1);
      setOtp('');
      if (attempts >= 4) {
        toast.error('Bahut attempts ho gaye. Dobara login karo.');
        await logoutUser();
        navigate('/login');
      } else {
        toast.error(`OTP galat hai. ${4 - attempts} attempts bache hain.`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp('');
    recaptchaVerifierRef.current?.clear();
    recaptchaVerifierRef.current = null;
    await handleSendOtp();
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const visible = phone.slice(-4);
    const masked = phone.slice(0, -4).replace(/\d/g, 'X');
    return `${masked}${visible}`;
  };

  const redirectToDashboard = () => {
    const role = userData?.role || 'employee';
    const routes: Record<string, string> = {
      admin: '/admin/dashboard',
      hr: '/hr/dashboard',
      general_manager: '/manager/dashboard',
      supervisor: '/supervisor/dashboard',
      project_manager: '/pm/dashboard',
      employee: '/employee/dashboard',
      intern: '/intern/dashboard',
      apprentice: '/intern/dashboard',
    };
    navigate(routes[role] || '/');
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      {/* Invisible reCAPTCHA anchor */}
      <div ref={recaptchaRef} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400" />

        <div className="p-8">
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Phone Verify Karo</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              Apne account ki security confirm karo
            </p>
          </div>

          {/* Phone chip */}
          <div className="flex items-center gap-3 p-3.5 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800 mb-6">
            <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              {isSending ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">OTP bhej raha hai…</p>
              ) : confirmationResult ? (
                <>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">OTP bheja gaya</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{maskPhone(userData.phoneNumber || '')}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">OTP bhejne ki koshish ho rahi hai…</p>
              )}
            </div>
            {isSending && <Loader2 className="w-4 h-4 animate-spin text-teal-500 ml-auto" />}
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-6">
            <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-teal-700 dark:text-teal-400">
                {userData.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userData.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userData.email}</p>
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                6-digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter' && otp.length === 6) handleVerifyOtp(); }}
                className="w-full px-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="000000"
                maxLength={6}
                autoFocus
                disabled={!confirmationResult}
              />
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={isVerifying || otp.length !== 6 || !confirmationResult}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold hover:from-teal-700 hover:to-teal-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-200 dark:shadow-none"
            >
              {isVerifying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Verify Karo
                </>
              )}
            </button>

            {attempts > 0 && (
              <p className="text-center text-sm text-red-500">{5 - attempts} attempts bache</p>
            )}

            {/* Resend */}
            <button
              onClick={handleResend}
              disabled={resendTimer > 0 || isSending}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {resendTimer > 0 ? `Dobara bhejo (${resendTimer}s)` : 'OTP Dobara Bhejo'}
            </button>

            {/* Logout */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Doosra account use karo
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PhoneVerify;
