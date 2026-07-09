import React from 'react';
import { Activity, Thermometer, ShieldAlert, Zap, Droplets } from 'lucide-react';

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
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Activity size={20} className="text-blue-400" />
          Stability & Solubility Report
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${isStable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {stability}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Instability Index */}
        <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={16} className={isStable ? "text-emerald-400" : "text-red-400"} />
            <span className="text-sm text-slate-400 font-medium">Instability Index</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">{instability_index.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">&lt;40 implies stable</div>
        </div>

        {/* Aliphatic Index */}
        <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer size={16} className="text-orange-400" />
            <span className="text-sm text-slate-400 font-medium">Aliphatic Index</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">{aliphatic_index.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">Thermal stability indicator</div>
        </div>

        {/* Half Life */}
        <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-purple-400" />
            <span className="text-sm text-slate-400 font-medium">Est. Half-Life</span>
          </div>
          <div className="text-xl font-bold text-slate-200 mt-1">{half_life}</div>
          <div className="text-xs text-slate-500 mt-1">In mammalian reticulocytes</div>
        </div>

        {/* Solubility */}
        <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={16} className="text-blue-400" />
            <span className="text-sm text-slate-400 font-medium">Predicted Solubility</span>
          </div>
          <div className="text-sm font-bold text-slate-200 mt-2">{solubility}</div>
        </div>
      </div>

      <div className="mt-4 bg-[#1e293b] p-4 rounded-lg border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-yellow-400" />
          <span className="text-sm text-slate-400 font-medium">Molar Extinction Coefficient (M⁻¹ cm⁻¹)</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300">Assuming all Cys residues form cystines (oxidized):</span>
          <span className="font-mono font-bold text-slate-200">{extinction_coefficient.oxidized.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-slate-300">Assuming all Cys residues are reduced:</span>
          <span className="font-mono font-bold text-slate-200">{extinction_coefficient.reduced.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
