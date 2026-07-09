import React from 'react';

export default function DomainVisualizer({ domains, sequenceLength }) {
  if (!sequenceLength || !domains) return null;

  // Render a 1D track of the protein.
  // The track is a grey line (disordered/flexible) with colored blocks for domains.
  
  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-6 w-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold text-slate-200">Protein Architecture</h3>
        <div className="text-sm font-mono text-slate-400">{sequenceLength} aa</div>
      </div>

      {/* Track Container */}
      <div className="relative w-full h-12 mb-8">
        {/* Background Line (Flexible/Disordered) */}
        <div className="absolute top-1/2 left-0 w-full h-1.5 -translate-y-1/2 bg-slate-700 rounded-full"></div>
        
        {/* Domains */}
        {domains.map((dom, idx) => {
          const [start, end] = dom;
          const leftPercent = (start / sequenceLength) * 100;
          const widthPercent = ((end - start + 1) / sequenceLength) * 100;
          
          return (
            <div 
              key={idx}
              className="absolute top-1/2 -translate-y-1/2 h-8 bg-blue-500 rounded-md border-2 border-[#0f172a] hover:bg-blue-400 transition-colors cursor-pointer flex items-center justify-center overflow-hidden"
              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
              title={`Domain ${idx + 1}: ${start}-${end}`}
            >
              {widthPercent > 10 && (
                <span className="text-[10px] font-bold text-white whitespace-nowrap">Domain {idx + 1}</span>
              )}
            </div>
          );
        })}

        {/* Labels for start and end */}
        <div className="absolute -bottom-6 left-0 text-xs font-mono text-slate-500">1</div>
        <div className="absolute -bottom-6 right-0 text-xs font-mono text-slate-500">{sequenceLength}</div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 justify-center mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
          <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">Structured Domain</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1.5 bg-slate-700 rounded-full"></div>
          <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">Flexible / Disordered</span>
        </div>
      </div>
    </div>
  );
}
