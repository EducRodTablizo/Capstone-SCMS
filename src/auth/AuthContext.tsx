import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'ACADEMIC_HEAD' | 'FACULTY_STAFF';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  college?: string;
  unit?: string;
}

export const DEMO_ACADEMIC_HEAD: UserProfile = {
  id: 'user-ah-001',
  email: 'academic.head@pup.edu.ph',
  name: 'Dr. Maria Ramos',
  role: 'ACADEMIC_HEAD',
  college: 'PUP Quezon City Campus',
  unit: 'Office of the Academic Head',
};

export const DEMO_FACULTY_STAFF: UserProfile = {
  id: 'user-fs-002',
  email: 'faculty.donayre@pup.edu.ph',
  name: 'Prof. Juan Santos',
  role: 'FACULTY_STAFF',
  college: 'College of Computer and Information Sciences',
  unit: 'Department of Information Technology',
};

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('scms_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    // Default to Academic Head for active development & seamless navigation
    return DEMO_ACADEMIC_HEAD;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('scms_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('scms_user');
    }
  }, [user]);

  const login = (_token: string, profile: UserProfile) => {
    setUser(profile);
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    setUser(newRole === 'ACADEMIC_HEAD' ? DEMO_ACADEMIC_HEAD : DEMO_FACULTY_STAFF);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
