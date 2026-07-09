import React from 'react';

export default function ConfidenceGauge({ score }) {
  if (score === undefined || score === null) return null;

  // Determine color based on pLDDT score
  let colorClass = 'bg-blue-500';
  if (score >= 90) colorClass = 'bg-blue-400';
  else if (score >= 70) colorClass = 'bg-teal-400';
  else if (score >= 50) colorClass = 'bg-amber-400';
  else colorClass = 'bg-red-400';

  return (
    <div className="w-full mt-8">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Overall Structural Confidence</span>
        <span className="text-2xl font-mono text-slate-100">{score.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden border border-slate-700/50">
        <div 
          className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 font-mono uppercase mt-2 px-1">
        <span>0</span>
        <span>Very Low</span>
        <span>Low</span>
        <span>Confident</span>
        <span>High</span>
        <span>100</span>
      </div>
    </div>
  );
}
