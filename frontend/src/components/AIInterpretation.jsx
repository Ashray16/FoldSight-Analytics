import React from 'react';
import { FileText } from 'lucide-react';

export default function AIInterpretation({ summary }) {
  if (!summary) return null;

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-8 w-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/50">
        <FileText size={22} className="text-blue-400" />
        <h3 className="text-xl font-bold text-slate-100 tracking-tight">Scientific Interpretation</h3>
      </div>
      
      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
        {summary}
      </div>
    </div>
  );
}
