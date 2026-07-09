import React from 'react';
import { Layers } from 'lucide-react';

export default function DomainVisualizer({ domains, sequenceLength }) {
  if (!sequenceLength) return null;

  // Process domains into blocks
  const blocks = [];
  let currentPos = 1;

  if (domains && domains.length > 0) {
    domains.forEach((domain, idx) => {
      const [start, end] = domain;
      
      // Add linker/disordered region if there's a gap
      if (start > currentPos) {
        blocks.push({
          type: 'linker',
          start: currentPos,
          end: start - 1,
          width: ((start - currentPos) / sequenceLength) * 100
        });
      }
      
      // Add domain
      blocks.push({
        type: 'domain',
        id: idx + 1,
        start,
        end,
        width: ((end - start + 1) / sequenceLength) * 100
      });
      
      currentPos = end + 1;
    });
  }

  // Add final linker if sequence extends past last domain
  if (currentPos <= sequenceLength) {
    blocks.push({
      type: 'linker',
      start: currentPos,
      end: sequenceLength,
      width: ((sequenceLength - currentPos + 1) / sequenceLength) * 100
    });
  }

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Layers size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold text-slate-200">Domain & Disorder Architecture</h3>
      </div>

      <div className="relative pt-8 pb-4">
        {/* Number line */}
        <div className="absolute top-0 left-0 text-xs text-slate-500 font-mono">1</div>
        <div className="absolute top-0 right-0 text-xs text-slate-500 font-mono">{sequenceLength}</div>
        
        {/* Ruler line */}
        <div className="absolute top-4 left-0 w-full h-[1px] bg-slate-700"></div>

        {/* Visualizer Track */}
        <div className="h-16 w-full flex items-center bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden relative group">
          {blocks.map((block, i) => {
            if (block.type === 'domain') {
              return (
                <div 
                  key={i}
                  className="h-full bg-blue-500/20 border-x border-blue-500/50 flex items-center justify-center relative cursor-help transition-colors hover:bg-blue-500/30"
                  style={{ width: `${block.width}%` }}
                  title={`Domain ${block.id}: Residues ${block.start} - ${block.end}`}
                >
                  {block.width > 10 && (
                    <span className="text-xs font-bold text-blue-300 truncate px-1">Domain {block.id}</span>
                  )}
                </div>
              );
            } else {
              return (
                <div 
                  key={i}
                  className="h-2 bg-slate-600 flex items-center justify-center relative cursor-help opacity-60 hover:opacity-100"
                  style={{ 
                    width: `${block.width}%`,
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)'
                  }}
                  title={`Disordered / Linker: Residues ${block.start} - ${block.end}`}
                ></div>
              );
            }
          })}
        </div>
      </div>

      <div className="flex justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500/20 border border-blue-500/50 rounded-sm"></div>
          <span className="text-slate-400">Structured Domain</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-slate-600 rounded-sm"></div>
          <span className="text-slate-400">Flexible Linker / IDR</span>
        </div>
      </div>
    </div>
  );
}
