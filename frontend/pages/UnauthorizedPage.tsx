import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 shadow-sm text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-red-700" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Access Denied (HTTP 403)</h1>
        <p className="text-sm text-slate-600 mb-6">
          Your assigned role does not have authorization to view this resource or perform this action. 
          Under SCMS role scoping, actions are restricted exclusively to authorized Academic Head and Faculty Staff capabilities.
        </p>
        <Button
          onClick={() => window.history.back()}
          className="inline-flex items-center space-x-2 bg-[#580000] hover:bg-[#430000] text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to Previous Page</span>
        </Button>
      </div>
    </div>
  );
};
