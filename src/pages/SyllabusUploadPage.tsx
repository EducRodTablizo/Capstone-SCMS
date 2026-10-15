import React from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';

export const SyllabusUploadPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-serif font-bold text-slate-900">Syllabus Submission</h1>
        <p className="text-sm text-slate-500 mt-1">Submit or revise your syllabus document (PDF / DOCX) or structured rubric form.</p>
      </div>

      <div className="bg-white p-8 rounded-lg border-2 border-dashed border-slate-300 text-center hover:border-[#580000] transition-colors cursor-pointer">
        <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700">Drag & drop your syllabus file here</h3>
        <p className="text-xs text-slate-500 mt-1">Supported formats: PDF, DOCX (Max 10MB) • Stored securely in MongoDB GridFS</p>
        <Button className="mt-4 bg-[#580000] hover:bg-[#430000] text-white">
          Browse File
        </Button>
      </div>
    </div>
  );
};
