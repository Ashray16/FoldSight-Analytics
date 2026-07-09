import React from 'react';
import { Lightbulb } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function KeyInsights({ properties, alphafold }) {
  if (!properties) return null;

  const insights = [];

  // Stability
  if (properties.stability === 'Stable') {
    insights.push({ text: "Structurally stable in vitro", status: "Stable", type: "success" });
  } else {
    insights.push({ text: "Prone to instability in vitro", status: "Unstable", type: "error" });
  }

  // Solubility
  if (properties.solubility.includes('High')) {
    insights.push({ text: "Highly hydrophilic and soluble", status: "High Solubility", type: "success" });
  } else if (properties.solubility.includes('Moderate')) {
    insights.push({ text: "Likely a soluble globular protein", status: "Moderate", type: "warning" });
  } else {
    insights.push({ text: "Highly hydrophobic, likely membrane-bound", status: "Low Solubility", type: "error" });
  }

  // Alphafold
  if (alphafold && alphafold.plddt) {
    const conf = alphafold.plddt.global;
    if (conf >= 90) {
      insights.push({ text: "Excellent structural confidence", status: "High Confidence", type: "success" });
    } else if (conf >= 70) {
      insights.push({ text: "Good structural prediction confidence", status: "Confident", type: "success" });
    } else if (conf >= 50) {
      insights.push({ text: "Contains flexible or uncertain regions", status: "Moderate Confidence", type: "warning" });
    } else {
      insights.push({ text: "High intrinsic disorder or poor prediction", status: "Low Confidence", type: "error" });
    }

    if (alphafold.plddt.vlow > 0.2) {
      insights.push({ text: "Significant intrinsically disordered regions (>20%)", status: "High Disorder", type: "warning" });
    }
  }

  if (alphafold && alphafold.pae && alphafold.pae.domains) {
    const dCount = alphafold.pae.domains.length;
    if (dCount > 1) {
      insights.push({ text: `Multi-domain architecture (${dCount} domains)`, status: "Structured Domains", type: "success" });
    } else if (dCount === 1) {
      insights.push({ text: "Single composite domain architecture", status: "Structured", type: "success" });
    }
  }

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800/50">
        <Lightbulb size={20} className="text-yellow-400" />
        <h3 className="text-lg font-bold text-slate-100">Key Insights</h3>
      </div>
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="mt-0.5">
              <StatusBadge status={insight.status} type={insight.type} />
            </div>
            <span className="text-sm text-slate-300 leading-relaxed pt-0.5">{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
