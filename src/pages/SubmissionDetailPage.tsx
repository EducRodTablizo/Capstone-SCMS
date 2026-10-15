import React from 'react';
import { Check, RotateCcw, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';

export const SubmissionDetailPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Syllabus Evaluation & Review</h1>
          <p className="text-sm text-slate-500 mt-1">Review syllabus content, inspect learning outcomes, and record approval or return decisions.</p>
        </div>
        <div className="flex space-x-3">
          <Button className="bg-red-700 hover:bg-red-800 text-white flex items-center space-x-1.5">
            <RotateCcw className="w-4 h-4 mr-1" />
            <span>Return for Revision</span>
          </Button>
          <Button className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center space-x-1.5">
            <Check className="w-4 h-4 mr-1" />
            <span>Approve (Complied)</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
