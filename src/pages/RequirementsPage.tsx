import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';

export const RequirementsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Academic Requirements & Deadlines</h1>
          <p className="text-sm text-slate-500 mt-1">Configure term requirements, syllabus deadlines, and CCMS calendar integration.</p>
        </div>
        <Button className="bg-[#580000] hover:bg-[#430000] text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Requirement</span>
        </Button>
      </div>
    </div>
  );
};
