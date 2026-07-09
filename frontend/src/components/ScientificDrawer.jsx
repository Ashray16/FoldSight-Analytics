import React from 'react';
import { FileText, X } from 'lucide-react';

export default function ScientificDrawer({ results, onClose }) {
  if (!results) return null;

  const { properties, alphafold, scientific_summary } = results;
  
  const domainColors = [
    'bg-indigo-500 border-indigo-400',
    'bg-teal-500 border-teal-400',
    'bg-amber-500 border-amber-400',
    'bg-rose-500 border-rose-400',
    'bg-purple-500 border-purple-400'
  ];

  // Format the sequence domains bar
  const renderDomainBar = () => {
    if (!alphafold?.pae?.domains || alphafold.pae.domains.length === 0) {
      return (
        <div className="w-full bg-slate-800/50 h-[2px] rounded mt-6 mb-2 border-y border-slate-700/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-slate-700 opacity-20 pattern-diagonal-lines"></div>
        </div>
      );
    }
    
    const seqLen = properties.length;
    
    return (
      <div className="relative w-full h-12 mt-6 mb-2 flex items-center group">
        {/* Sequence Base Line */}
        <div className="absolute left-0 right-0 h-[2px] bg-slate-600 rounded-full"></div>
        
        {/* Termini Markers */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 bg-slate-500"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-3 bg-slate-500"></div>

        {/* Domains */}
        {alphafold.pae.domains.map((dom, i) => {
          const startPct = (dom[0] / seqLen) * 100;
          const widthPct = ((dom[1] - dom[0]) / seqLen) * 100;
          const colorClass = domainColors[i % domainColors.length];
          return (
            <div 
              key={i}
              className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md border shadow-lg opacity-90 hover:opacity-100 hover:scale-y-110 transition-all cursor-pointer ${colorClass}`}
              style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              title={`Domain ${i+1}: ${dom[0]}-${dom[1]}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      {/* Slide-out Drawer */}
      <div className="bg-[#0f172a] w-full md:w-[700px] h-full shadow-2xl flex flex-col border-l border-slate-800 animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
          <div className="flex flex-col">
             <div className="text-[32px] font-bold text-slate-100 leading-tight">{results.protein_name || 'Protein Analysis'}</div>
             <div className="text-sm font-mono text-slate-400 mt-1">{results.uniprot_id || 'Custom Sequence'}</div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-10">
          
          {/* Section: Scientific Interpretation */}
          <section>
            <h2 className="text-[18px] font-bold text-slate-100 border-b border-slate-800 pb-2 mb-6 tracking-tight flex items-center gap-2">
              <FileText size={20} className="text-blue-400" />
              Scientific Interpretation
            </h2>
            
            <div className="space-y-6 text-[14px] leading-relaxed text-slate-300">
              {typeof scientific_summary === 'object' ? (
                <>
                  <div>
                    <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-1">[ Overview ]</div>
                    <div>{scientific_summary.overview}</div>
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-1">[ Structural Assessment ]</div>
                    <div>{scientific_summary.structural}</div>
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-1">[ Biological Interpretation ]</div>
                    <div>{scientific_summary.biological}</div>
                  </div>
                </>
              ) : (
                <div className="whitespace-pre-wrap">{scientific_summary}</div>
              )}
            </div>
          </section>

          <hr className="border-slate-800/50" />

          {/* Section: Summary of Findings */}
          <section>
            <h3 className="text-[16px] font-bold text-slate-100 mb-6 tracking-tight">Summary of Findings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 flex justify-between items-center">
                <span className="text-[14px] font-medium text-slate-400">Stability</span>
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${properties.stability === 'Stable' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {properties.stability}
                </span>
              </div>
              <div className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 flex justify-between items-center">
                <span className="text-[14px] font-medium text-slate-400">Confidence</span>
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${alphafold?.plddt?.global >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  {alphafold?.plddt?.global >= 80 ? 'HIGH' : (alphafold?.plddt?.global >= 50 ? 'MODERATE' : 'LOW')}
                </span>
              </div>
              <div className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 flex justify-between items-center">
                <span className="text-[14px] font-medium text-slate-400">Solubility</span>
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${properties.solubility.includes('High') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  {properties.solubility.split(' ')[0]}
                </span>
              </div>
              <div className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 flex justify-between items-center">
                <span className="text-[14px] font-medium text-slate-400">Architecture</span>
                <span className="text-[12px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {alphafold?.pae?.domains?.length > 1 ? 'MULTI-DOMAIN' : 'SINGLE DOMAIN'}
                </span>
              </div>
            </div>
          </section>

          <hr className="border-slate-800/50" />

          {/* Section: Protein Stability Table */}
          <section>
            <h3 className="text-[16px] font-bold text-slate-100 mb-6 tracking-tight">Protein Stability</h3>
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800">
                    <th className="py-3 px-4 font-bold text-slate-400">Metric</th>
                    <th className="py-3 px-4 font-bold text-slate-400">Value</th>
                    <th className="py-3 px-4 font-bold text-slate-400">Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 text-slate-300 font-medium">Instability Index</td>
                    <td className="py-3 px-4 font-mono text-slate-200">{properties.instability_index.toFixed(1)}</td>
                    <td className="py-3 px-4 text-slate-400">{properties.stability}</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 text-slate-300 font-medium">Aliphatic Index</td>
                    <td className="py-3 px-4 font-mono text-slate-200">{properties.aliphatic_index.toFixed(1)}</td>
                    <td className="py-3 px-4 text-slate-400">{properties.aliphatic_index > 80 ? 'High' : 'Moderate'}</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 text-slate-300 font-medium">Half-Life</td>
                    <td className="py-3 px-4 font-mono text-slate-200">{properties.half_life}</td>
                    <td className="py-3 px-4 text-slate-400">In vitro</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-300 font-medium">Solubility</td>
                    <td className="py-3 px-4 font-mono text-slate-200">{properties.solubility.split(' ')[0]}</td>
                    <td className="py-3 px-4 text-slate-400">Globular</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-slate-800/50" />

          {/* Section: Domain Architecture */}
          <section>
            <h3 className="text-[16px] font-bold text-slate-100 mb-6 tracking-tight">Protein Domain Architecture</h3>
            <div className="flex justify-between text-[12px] font-mono text-slate-500 px-1">
              <span>1</span>
              <span>{properties.length}</span>
            </div>
            {renderDomainBar()}
            <div className="mt-4 flex flex-col gap-2">
               {alphafold?.pae?.domains && alphafold.pae.domains.map((dom, i) => (
                  <div key={i} className="flex items-center gap-3 text-[14px]">
                     <div className={`w-3 h-3 rounded-sm border ${domainColors[i % domainColors.length]}`}></div>
                     <span className="text-slate-200 font-medium">Domain {i+1}</span>
                     <span className="text-slate-500 font-mono text-[12px]">({dom[0]}–{dom[1]})</span>
                     <span className="text-slate-400 ml-2">Structured Region</span>
                  </div>
               ))}
            </div>
          </section>

          <hr className="border-slate-800/50" />

          {/* Section: Confidence Gauge */}
          <section>
            <h3 className="text-[16px] font-bold text-slate-100 mb-6 tracking-tight">Overall Structural Confidence</h3>
            <div className="text-[32px] font-mono text-slate-100 mb-2">
               {alphafold?.plddt?.global ? alphafold.plddt.global.toFixed(1) : '0.0'}%
            </div>
            <div className="w-full bg-slate-800/80 h-4 rounded-sm overflow-hidden border border-slate-700">
               <div 
                 className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                 style={{ width: `${alphafold?.plddt?.global || 0}%` }}
               />
            </div>
            <div className="mt-2 text-[14px] font-bold text-slate-400 uppercase tracking-widest">
               {alphafold?.plddt?.global >= 80 ? 'High Confidence' : (alphafold?.plddt?.global >= 50 ? 'Moderate Confidence' : 'Low Confidence')}
            </div>
          </section>
          
        </div>
      </div>
    </div>
  );
}
