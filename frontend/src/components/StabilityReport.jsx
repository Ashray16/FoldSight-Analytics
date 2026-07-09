import React from 'react';
import StatusBadge from './StatusBadge';

export default function StabilityReport({ properties }) {
  if (!properties || properties.instability_index === undefined) return null;

  const {
    instability_index,
    aliphatic_index,
    extinction_coefficient,
    half_life,
    solubility,
    stability
  } = properties;

  const isStable = stability === 'Stable';

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-8 w-full">
      <div className="mb-8 border-b border-slate-800/50 pb-4">
        <h3 className="text-xl font-bold text-slate-100">Stability & Solubility Metrics</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* Instability Index */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
          <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-3">Instability Index</div>
          <div className="text-4xl font-bold text-slate-100 mb-4">{instability_index.toFixed(1)}</div>
          <StatusBadge status={isStable ? "Stable" : "Unstable"} type={isStable ? "success" : "error"} />
        </div>

        {/* Aliphatic Index */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
          <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-3">Aliphatic Index</div>
          <div className="text-4xl font-bold text-slate-100 mb-4">{aliphatic_index.toFixed(1)}</div>
          <StatusBadge status={aliphatic_index > 80 ? "High" : "Moderate"} type={aliphatic_index > 80 ? "success" : "warning"} />
        </div>

        {/* Half Life */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
          <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-3">Est. Half-Life</div>
          <div className="text-2xl font-bold text-slate-100 mb-4">{half_life}</div>
          <StatusBadge status="In Vitro" type="default" />
        </div>

        {/* Solubility */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
          <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-3">Solubility</div>
          <div className="text-lg font-bold text-slate-100 mb-4 h-9 flex items-center">{solubility.split(' ')[0]}</div>
          <StatusBadge status={solubility.includes('High') ? 'High' : (solubility.includes('Low') ? 'Low' : 'Moderate')} type={solubility.includes('High') ? 'success' : (solubility.includes('Low') ? 'error' : 'warning')} />
        </div>
      </div>
    </div>
  );
}
