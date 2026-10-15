import React from 'react';
import { Home } from 'lucide-react';
import { Button } from '../components/ui/button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-4xl font-serif font-bold text-[#580000] mb-2">404</h1>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">The page you are looking for does not exist in the Syllabus Compliance Monitoring System.</p>
        <Button onClick={() => window.location.href = '/'} className="bg-[#580000] hover:bg-[#430000] text-white">
          <Home className="w-4 h-4 mr-1.5" />
          <span>Return Home</span>
        </Button>
      </div>
    </div>
  );
};
