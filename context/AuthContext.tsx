import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'manager' | 'technician' | 'requester';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatar_url?: string;
  shift?: 'morning' | 'afternoon' | 'night';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isTechnician: boolean;
  isRequester: boolean;
  signIn: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Fallback profile if table missing or empty (Development safety)
        setProfile({
          id: userId,
          email: user?.email || '',
          name: user?.email?.split('@')[0] || 'User',
          role: 'admin', // Default to admin in DEV if no profile found
        });
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string) => {
    // Magic Link Login for simplicity/security
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager' || isAdmin; // Manager inherits Admin? No, distinct. But usually Admin has all powers. Let's keep distinct.
  // Actually, usually Admin > Manager > Technician.
  // Let's define:
  // Admin: System Configs
  // Manager: Maintenance Management
  // Technician: Execution
  // Requester: Open Tickets

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        isManager: profile?.role === 'manager',
        isTechnician: profile?.role === 'technician',
        isRequester: profile?.role === 'requester',
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
