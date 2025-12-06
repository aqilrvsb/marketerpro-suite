import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  idstaff: string;
  role: UserRole;
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (idstaff: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (idstaff: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'dfr_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          setUser(parsed);
        }
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem(SESSION_KEY);
      }
      setIsLoading(false);
    };

    loadSession();
  }, []);

  // Save session to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const signIn = async (idstaff: string, password: string): Promise<{ error: Error | null }> => {
    try {
      // Call the login_user function
      // Password is also uppercase since password = Staff ID
      const { data, error } = await supabase.rpc('login_user', {
        p_idstaff: idstaff.toUpperCase(),
        p_password: password.toUpperCase()
      });

      if (error) {
        console.error('Login error:', error);
        return { error: new Error('Invalid Staff ID or password') };
      }

      if (!data || data.length === 0) {
        return { error: new Error('Invalid Staff ID or password') };
      }

      const userData = data[0];

      if (!userData.is_active) {
        return { error: new Error('Account is deactivated. Please contact admin.') };
      }

      const userProfile: UserProfile = {
        id: userData.user_id,
        username: userData.username,
        fullName: userData.full_name,
        idstaff: userData.idstaff,
        role: userData.role as UserRole,
      };

      setUser(userProfile);
      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error: new Error(error.message || 'An unexpected error occurred') };
    }
  };

  const signUp = async (idstaff: string, password: string, fullName: string, role: UserRole): Promise<{ error: Error | null }> => {
    try {
      // Call the register_user function
      // Password stored as uppercase for consistency
      const { data, error } = await supabase.rpc('register_user', {
        p_idstaff: idstaff.toUpperCase(),
        p_password: password.toUpperCase(),
        p_full_name: fullName,
        p_role: role
      });

      if (error) {
        console.error('Registration error:', error);
        if (error.message.includes('already exists')) {
          return { error: new Error('Staff ID already exists') };
        }
        return { error: new Error(error.message || 'Registration failed') };
      }

      if (!data || data.length === 0) {
        return { error: new Error('Registration failed') };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { error: new Error(error.message || 'An unexpected error occurred') };
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut
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
