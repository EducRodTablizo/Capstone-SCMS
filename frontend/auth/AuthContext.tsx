import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'ACADEMIC_HEAD' | 'FACULTY_STAFF';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  college?: string;
  unit?: string;
}

export const DEMO_AH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsImVtYWlsIjoiYWNhZGVtaWMuaGVhZEBwdXAuZWR1LnBoIiwicm9sZSI6IkFDQURFTUlDX0hFQUQiLCJuYW1lIjoiRHIuIE1hcmlhIFNhbnRvcyIsImlhdCI6MTc5MjU5NDUxNCwiZXhwIjoxODI0MTMwNTE0fQ.C8_aK_fahD8G3p4os7UYvhcFmKilitrJFEc1bEGYL_o';

export const DEMO_FS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIyMjIyMjIyLTIyMjItMjIyMi0yMjIyLTIyMjIyMjIyMjIyMiIsImVtYWlsIjoiZmFjdWx0eS5kb25heXJlQHB1cC5lZHUucGgiLCJyb2xlIjoiRkFDVUxUWV9TVEFGRiIsIm5hbWUiOiJQcm9mLiBKdWFuIERvbmF5cmUiLCJpYXQiOjE3OTI1OTQ1MTQsImV4cCI6MTgyNDEzMDUxNH0.Ayo_dKk1E4Og23aD-kuuQI_F2bFjNfeL-0Z78oNk4lQ';

export const DEMO_ACADEMIC_HEAD: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'academic.head@pup.edu.ph',
  name: 'Dr. Maria Santos',
  role: 'ACADEMIC_HEAD',
  college: 'PUP Quezon City Campus',
  unit: 'Office of the Academic Head',
};

export const DEMO_FACULTY_STAFF: UserProfile = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'faculty.donayre@pup.edu.ph',
  name: 'Prof. Juan Donayre',
  role: 'FACULTY_STAFF',
  college: 'College of Computer and Information Sciences',
  unit: 'Department of Information Technology',
};

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const storedUser = localStorage.getItem('scms_user');
      const storedToken = localStorage.getItem('scms_token');
      if (storedUser && storedToken) {
        return JSON.parse(storedUser);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('scms_token');
  });

  const login = (newToken: string, profile: UserProfile) => {
    localStorage.setItem('scms_token', newToken);
    localStorage.setItem('scms_user', JSON.stringify(profile));
    setToken(newToken);
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem('scms_token');
    localStorage.removeItem('scms_user');
    setToken(null);
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    if (newRole === 'ACADEMIC_HEAD') {
      login(DEMO_AH_TOKEN, DEMO_ACADEMIC_HEAD);
    } else {
      login(DEMO_FS_TOKEN, DEMO_FACULTY_STAFF);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: !!user && !!token,
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
