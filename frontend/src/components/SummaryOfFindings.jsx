import React from 'react';
import { List } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function SummaryOfFindings({ properties, alphafold }) {
  if (!properties) return null;

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-8 flex flex-col h-full w-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/50">
        <List size={22} className="text-slate-400" />
        <h3 className="text-xl font-bold text-slate-100 tracking-tight">Summary of Findings</h3>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/50">
              <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2">Property</th>
              <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2">Assessment</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800/30 hover:bg-slate-800/10 transition-colors">
              <td className="py-4 px-2 text-sm font-medium text-slate-300">Stability</td>
              <td className="py-4 px-2">
                <StatusBadge 
                  status={properties.stability} 
                  type={properties.stability === 'Stable' ? 'success' : 'error'} 
                />
              </td>
            </tr>
            <tr className="border-b border-slate-800/30 hover:bg-slate-800/10 transition-colors">
              <td className="py-4 px-2 text-sm font-medium text-slate-300">Structural Confidence</td>
              <td className="py-4 px-2">
                <StatusBadge 
                  status={alphafold?.plddt?.global >= 90 ? 'High' : (alphafold?.plddt?.global >= 70 ? 'Confident' : (alphafold?.plddt?.global >= 50 ? 'Moderate' : 'Low'))} 
                  type={alphafold?.plddt?.global >= 90 ? 'success' : (alphafold?.plddt?.global >= 50 ? 'warning' : 'error')} 
                />
              </td>
            </tr>
            <tr className="border-b border-slate-800/30 hover:bg-slate-800/10 transition-colors">
              <td className="py-4 px-2 text-sm font-medium text-slate-300">Solubility</td>
              <td className="py-4 px-2">
                <StatusBadge 
                  status={properties.solubility.includes('High') ? 'High' : (properties.solubility.includes('Low') ? 'Low' : 'Moderate')} 
                  type={properties.solubility.includes('High') ? 'success' : (properties.solubility.includes('Low') ? 'error' : 'warning')} 
                />
              </td>
            </tr>
            <tr className="border-b border-slate-800/30 hover:bg-slate-800/10 transition-colors">
              <td className="py-4 px-2 text-sm font-medium text-slate-300">Architecture</td>
              <td className="py-4 px-2">
                <StatusBadge 
                  status={alphafold?.pae?.domains?.length > 1 ? 'Multi-Domain' : 'Single Domain'} 
                  type="default"
                />
              </td>
            </tr>
            <tr className="hover:bg-slate-800/10 transition-colors">
              <td className="py-4 px-2 text-sm font-medium text-slate-300">Hydrophobicity</td>
              <td className="py-4 px-2">
                <StatusBadge 
                  status={properties.gravy > 0.2 ? 'Hydrophobic' : (properties.gravy < -0.2 ? 'Hydrophilic' : 'Amphipathic')} 
                  type={properties.gravy > 0.2 ? 'error' : (properties.gravy < -0.2 ? 'success' : 'default')} 
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
