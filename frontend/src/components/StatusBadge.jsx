import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export default function StatusBadge({ status, type = 'default' }) {
  // Determine color and icon based on status string or explicit type
  let colorClass = "bg-slate-800 text-slate-300 border-slate-700";
  let Icon = Info;

  const s = status ? status.toLowerCase() : '';

  if (s.includes('stable') || s.includes('high') || type === 'success') {
    if (!s.includes('unstable')) {
      colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      Icon = CheckCircle2;
    }
  } 
  
  if (s.includes('unstable') || s.includes('low') || type === 'error') {
    if (!s.includes('moderate')) {
      colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
      Icon = XCircle;
    }
  }

  if (s.includes('moderate') || s.includes('mixed') || type === 'warning') {
    colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    Icon = AlertTriangle;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}
