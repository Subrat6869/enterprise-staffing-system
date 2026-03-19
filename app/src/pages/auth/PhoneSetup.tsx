// ============================================
// PHONE SETUP PAGE — Enter phone number + verify OTP (First-time Google users)
// ============================================

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ArrowRight, RefreshCw, Loader2, CheckCircle, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sendPhoneOtp, verifyPhoneOtp, savePhoneNumber } from '@/services/authService';
import { RecaptchaVerifier, auth } from '@/firebase/config';
import { logoutUser } from '@/services/authService';
import { toast } from 'sonner';
import MCLLogo from '@/components/ui/MCLLogo';
import type { ConfirmationResult } from 'firebase/auth';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1',  flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
];

const PhoneSetup: React.FC = () => {
  const navigate = useNavigate();
  const { userData, currentUser, refreshUserData } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<InstanceType<typeof RecaptchaVerifier> | null>(null);

  // Redirect if no user
  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

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
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 7) {
      toast.error('Valid phone number daalo');
      return;
    }
    const fullPhone = `${countryCode}${digits}`;
    setIsSending(true);
    try {
      const verifier = setupRecaptcha();
      const result = await sendPhoneOtp(fullPhone, verifier);
      setConfirmationResult(result);
      setStep('otp');
      setResendTimer(60);
      toast.success(`OTP bheja gaya ${fullPhone} par!`);
    } catch (err: any) {
      console.error(err);
      // reset recaptcha on error
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
      toast.error('Pehle OTP bhejwa lo');
      return;
    }
    setIsVerifying(true);
    try {
      await verifyPhoneOtp(confirmationResult, otp);
      // Save phone number to Firestore
      const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      if (currentUser) {
        await savePhoneNumber(currentUser.uid, fullPhone);
      }
      await refreshUserData();
      toast.success('Phone verify ho gaya! 🎉');
      redirectToDashboard();
    } catch (err: any) {
      console.error(err);
      toast.error('OTP galat hai, dobara try karo');
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp('');
    recaptchaVerifierRef.current?.clear();
    recaptchaVerifierRef.current = null;
    setStep('phone');
    setTimeout(() => handleSendOtp(), 100);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
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
    // For MFA roles, also set the session flag
    const MFA_ROLES = ['admin', 'hr', 'general_manager', 'supervisor', 'project_manager'];
    if (MFA_ROLES.includes(role)) {
      sessionStorage.setItem('mfa_verified', 'true');
    }
    navigate(routes[role] || '/');
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode)!;

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
              <Smartphone className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Phone Verify Karo</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              Security ke liye apna phone number add karo
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${step === 'phone' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600'}`}>
              {step !== 'phone' ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center text-[10px]">1</span>}
              Phone Number
            </div>
            <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${step === 'otp' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center text-[10px]">2</span>
              OTP
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    {/* Country code picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCountryPicker(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                      >
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span>{selectedCountry.code}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      {showCountryPicker && (
                        <div className="absolute top-full mt-1 left-0 z-20 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                          {COUNTRY_CODES.map(c => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => { setCountryCode(c.code); setShowCountryPicker(false); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-left text-gray-800 dark:text-white transition-colors"
                            >
                              <span className="text-base">{c.flag}</span>
                              <span className="font-medium">{c.name}</span>
                              <span className="ml-auto text-gray-400 text-xs">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Phone input */}
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/[^\d\s\-]/g, ''))}
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
                      placeholder="98765 43210"
                      maxLength={15}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">OTP SMS ke zariye aayega</p>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={isSending || phoneNumber.replace(/\D/g, '').length < 7}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold hover:from-teal-700 hover:to-teal-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-200 dark:shadow-none"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>OTP Bhejo <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Phone info */}
                <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800">
                  <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">OTP bheja gaya</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">
                      {countryCode} {phoneNumber}
                    </p>
                  </div>
                </div>

                {/* OTP input */}
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
                  />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otp.length !== 6}
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

                {/* Resend */}
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendTimer > 0 ? `Dobara bhejo (${resendTimer}s)` : 'OTP Dobara Bhejo'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Doosra account use karo
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PhoneSetup;
