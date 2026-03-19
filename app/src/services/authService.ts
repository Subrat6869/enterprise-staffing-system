// ============================================
// AUTHENTICATION SERVICE
// ============================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signOut,
  updatePassword,
  updateProfile,
  type User as FirebaseUser,
  type ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/firebase/config';
import type { User, RegistrationData } from '@/types';
import type { RecaptchaVerifier } from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();
// Request profile + email scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');


// Register new user
export const registerUser = async (
  data: RegistrationData
): Promise<{ user: FirebaseUser; userData: User }> => {
  const { email, password, name, role, department, qualification, certificate } = data;

  // Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // Upload certificate if provided (for intern/apprentice)
  let certificateURL = '';
  if (certificate && (role === 'intern' || role === 'apprentice')) {
    const certRef = ref(storage, `certificates/${firebaseUser.uid}/${certificate.name}`);
    await uploadBytes(certRef, certificate);
    certificateURL = await getDownloadURL(certRef);
  }

  // Roles that require HR approval before login
  const needsApproval = ['employee', 'intern', 'apprentice'].includes(role);

  // Create user document in Firestore
  const userData: Omit<User, 'uid'> = {
    email,
    name,
    role,
    department: department || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isApproved: !needsApproval, // auto-approve admin/hr/gm/supervisor/pm
    qualification: qualification || '',
    certificateURL,
    certificateVerified: false,
    skills: [],
    experience: 0
  };

  await setDoc(doc(db, 'users', firebaseUser.uid), {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Update display name
  await updateProfile(firebaseUser, { displayName: name });

  return { 
    user: firebaseUser, 
    userData: { ...userData, uid: firebaseUser.uid } 
  };
};

// Login with email and password
export const loginWithEmail = async (
  email: string, 
  password: string
): Promise<{ user: FirebaseUser; userData: User }> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // Get user data from Firestore
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  
  if (!userDoc.exists()) {
    throw new Error('User data not found');
  }

  const userData = { uid: firebaseUser.uid, ...userDoc.data() } as User;

  // Block unapproved users
  if (userData.isApproved === false) {
    await signOut(auth);
    throw new Error('Your account is pending HR approval. Please wait for approval before logging in.');
  }

  // Update last login
  await updateDoc(doc(db, 'users', firebaseUser.uid), {
    lastLogin: serverTimestamp()
  });

  return { user: firebaseUser, userData };
};

// Login with Google
export const loginWithGoogle = async (): Promise<{ user: FirebaseUser; userData: User }> => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const firebaseUser = userCredential.user;

  // Check if user exists in Firestore
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

  if (!userDoc.exists()) {
    // Create new user document for Google sign-in
    const userData: Omit<User, 'uid'> = {
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || 'Unknown',
      role: 'employee', // Default role
      createdAt: new Date(),
      isActive: true,
      isApproved: false, // Google sign-ups also need HR approval
      skills: [],
      experience: 0,
      phoneVerified: false,
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp()
    });

    const newUserData = { ...userData, uid: firebaseUser.uid };
    return { 
      user: firebaseUser, 
      userData: newUserData
    };
  }

  const userData = { uid: firebaseUser.uid, ...userDoc.data() } as User;
  return { user: firebaseUser, userData };
};

// Logout
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Change password
export const changeUserPassword = async (
  user: FirebaseUser, 
  newPassword: string
): Promise<void> => {
  await updatePassword(user, newPassword);
};

// Get user data
export const getUserData = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  
  if (!userDoc.exists()) {
    return null;
  }

  return { uid, ...userDoc.data() } as User;
};

// Update user profile
export const updateUserProfile = async (
  uid: string, 
  data: Partial<User>
): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

// Upload profile photo
export const uploadProfilePhoto = async (
  uid: string, 
  file: File
): Promise<string> => {
  const photoRef = ref(storage, `profiles/${uid}/${file.name}`);
  await uploadBytes(photoRef, file);
  const photoURL = await getDownloadURL(photoRef);
  
  await updateDoc(doc(db, 'users', uid), {
    photoURL,
    updatedAt: serverTimestamp()
  });

  return photoURL;
};

// ==========================================
// PHONE OTP AUTH FUNCTIONS
// ==========================================

// Send OTP via SMS to the given phone number
export const sendPhoneOtp = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier as any);
};

// Verify the OTP code
export const verifyPhoneOtp = async (
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<void> => {
  await confirmationResult.confirm(otp);
};

// Save verified phone number to Firestore
export const savePhoneNumber = async (uid: string, phoneNumber: string): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), {
    phoneNumber,
    phoneVerified: true,
    updatedAt: serverTimestamp(),
  });
};
