import React from 'react';

export default function ConfidenceGauge({ score }) {
  if (score === undefined || score === null) return null;
  
  const percentage = Math.min(Math.max(score, 0), 100);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let color = "#ef4444"; // red-500
  let label = "Low Confidence";
  
  if (percentage >= 90) {
    color = "#10b981"; // emerald-500
    label = "High Confidence";
  } else if (percentage >= 70) {
    color = "#3b82f6"; // blue-500
    label = "Confident";
  } else if (percentage >= 50) {
    color = "#f59e0b"; // amber-500
    label = "Moderate";
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        {/* Background circle */}
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-800"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-100">{percentage.toFixed(0)}%</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium" style={{ color }}>{label}</span>
      <span className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">AlphaFold pLDDT</span>
    </div>
  );
}
