import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

export default function AIInterpretation({ summary }) {
  if (!summary) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl border border-indigo-500/30 p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Bot size={20} className="text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-indigo-100 flex items-center gap-2">
          AI Scientific Interpretation
          <Sparkles size={16} className="text-indigo-400 animate-pulse" />
        </h3>
      </div>

      <div className="relative z-10">
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          {summary}
        </p>
      </div>
    </div>
  );
}
