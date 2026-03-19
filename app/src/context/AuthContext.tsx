// ============================================
// AUTHENTICATION CONTEXT (OPTIMIZED)
// ============================================

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { getUserData } from '@/services/authService';
import type { User, UserRole } from '@/types';
import { toast } from 'sonner';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const data = await getUserData(user.uid);
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Failed to load user data');
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      const data = await getUserData(currentUser.uid);
      setUserData(data);
    }
  }, [currentUser]);

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    if (!userData) return false;
    return roles.includes(userData.role);
  }, [userData]);

  // Memoize value to prevent unnecessary re-renders of the entire tree
  const value = useMemo<AuthContextType>(() => ({
    currentUser,
    userData,
    loading,
    isAuthenticated: !!currentUser && !!userData,
    hasRole,
    refreshUserData
  }), [currentUser, userData, loading, hasRole, refreshUserData]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
