// ============================================
// MFA SETUP PAGE — Google Authenticator QR Code Setup
// ============================================

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
// @ts-expect-error - No types available for old v12 wrapper
import { authenticator } from '@otplib/preset-browser';
import { ShieldCheck, Copy, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { toast } from 'sonner';
import MCLLogo from '@/components/ui/MCLLogo';

const MFA_ROLES = ['admin', 'hr', 'general_manager', 'supervisor', 'project_manager'];

const MfaSetup: React.FC = () => {
  const navigate = useNavigate();
  const { userData, refreshUserData } = useAuth();
  const [secret, setSecret] = useState('');
  const [otpUri, setOtpUri] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // If no user or doesn't need MFA, redirect
    if (!userData) return;
    if (!MFA_ROLES.includes(userData.role)) {
      navigate('/');
      return;
    }
    // If MFA already enabled, goto verify
    if (userData.mfaEnabled) {
      navigate('/mfa-verify');
      return;
    }

    // Generate a new secret
    const newSecret = authenticator.generateSecret();
    setSecret(newSecret);

    // Create the OTP Auth URI for QR code
    const uri = authenticator.keyuri(
      userData.email,
      'MCL StaffTrack',
      newSecret
    );
    setOtpUri(uri);
  }, [userData, navigate]);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Secret key copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = authenticator.verify({ token: verifyCode, secret });

      if (isValid) {
        // Save the secret to Firestore
        await updateDoc(doc(db, 'users', userData!.uid), {
          mfaSecret: secret,
          mfaEnabled: true,
          updatedAt: serverTimestamp()
        });

        // Set session flag
        sessionStorage.setItem('mfa_verified', 'true');

        await refreshUserData();
        toast.success('2FA enabled successfully!');

        // Redirect to dashboard
        const roleRoutes: { [key: string]: string } = {
          admin: '/admin/dashboard',
          hr: '/hr/dashboard',
          general_manager: '/manager/dashboard',
          supervisor: '/supervisor/dashboard',
          project_manager: '/pm/dashboard'
        };
        navigate(roleRoutes[userData!.role] || '/');
      } else {
        toast.error('Invalid code. Please try again.');
      }
    } catch (error) {
      console.error('Error enabling MFA:', error);
      toast.error('Failed to enable 2FA');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!userData || !secret) {
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Setup 2FA</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Scan the QR code with Google Authenticator
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-5">
          {/* Step 1: QR Code */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold mr-2">1</span>
              Scan this QR code with Google Authenticator
            </p>
            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG value={otpUri} size={180} level="H" />
              </div>
            </div>
          </div>

          {/* Manual Key */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or enter this key manually:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white dark:bg-gray-700 px-3 py-2 rounded-lg font-mono text-gray-900 dark:text-white break-all border border-gray-200 dark:border-gray-600">
                {secret}
              </code>
              <button
                onClick={handleCopySecret}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Verify Code */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold mr-2">2</span>
              Enter the 6-digit code from your app
            </p>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerifyCode(val);
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-center text-xl font-mono tracking-[0.5em] placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying || verifyCode.length !== 6}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold hover:from-teal-700 hover:to-teal-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Enable 2FA & Continue
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MfaSetup;
