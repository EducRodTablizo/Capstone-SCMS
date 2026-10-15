import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BookOpen, AlertCircle, Lock, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { authService } from '../services/authService';
import { useAuth } from '../auth/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!email || !password) {
      setError('Please enter both your SCMS institutional email and password.');
      setIsLoading(false);
      return;
    }

    try {
      // SCMS-001 AC1 & AC2: Call identity-service
      const result = await authService.login(email, password);

      if (result.statusCode === 200 && result.user && result.token) {
        login(result.token, result.user);
        navigate('/dashboard');
      } else {
        // SCMS-001 AC2: Generic error message from backend
        setError(result.message || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err) {
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#580000] flex items-center justify-center shadow-lg border-2 border-[#C8960C]">
            <BookOpen className="w-8 h-8 text-[#C8960C]" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-serif font-bold text-[#0F172A]">
          Syllabus Compliance Monitoring System
        </h2>
        <p className="mt-1 text-center text-xs font-medium text-[#580000] tracking-wider uppercase">
          Polytechnic University of the Philippines — Quezon City Campus
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200 sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-600 rounded text-sm text-red-800 flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                SCMS Account Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@pup.edu.ph"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-[#580000] focus:border-[#580000] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-[#580000] focus:border-[#580000] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-[#580000] hover:bg-[#430000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#580000] transition-colors"
              >
                {isLoading ? 'Signing In...' : 'Sign In to SCMS'}
              </Button>
            </div>
          </form>

          {/* Seed demo quick-fill helper */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <p className="font-semibold text-slate-600 mb-1.5">Sprint 1 Demo Accounts (Argon2id Encrypted):</p>
            <div className="flex flex-col gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setEmail('academic.head@pup.edu.ph');
                  setPassword('AcademicHead2026!');
                }}
                className="text-left text-[#580000] hover:underline"
              >
                🔑 Academic Head: <span className="font-mono">academic.head@pup.edu.ph</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('faculty.donayre@pup.edu.ph');
                  setPassword('Faculty2026!');
                }}
                className="text-left text-[#580000] hover:underline"
              >
                🔑 Faculty Staff: <span className="font-mono">faculty.donayre@pup.edu.ph</span>
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-center space-x-1 text-xs text-slate-500">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Protected by RA 10173 (Data Privacy Act of 2012)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
