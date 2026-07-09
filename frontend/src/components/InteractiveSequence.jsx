import React, { useState, useEffect, useMemo } from 'react';
import { AlignLeft } from 'lucide-react';

const KD_SCALE = {
  'A': 1.8, 'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
  'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
  'L': 3.8, 'K': -3.9, 'M': 1.9, 'F': 2.8, 'P': -1.6,
  'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
};

const AA_NAMES = {
  'A': 'Alanine', 'R': 'Arginine', 'N': 'Asparagine', 'D': 'Aspartic Acid', 'C': 'Cysteine',
  'Q': 'Glutamine', 'E': 'Glutamic Acid', 'G': 'Glycine', 'H': 'Histidine', 'I': 'Isoleucine',
  'L': 'Leucine', 'K': 'Lysine', 'M': 'Methionine', 'F': 'Phenylalanine', 'P': 'Proline',
  'S': 'Serine', 'T': 'Threonine', 'W': 'Tryptophan', 'Y': 'Tyrosine', 'V': 'Valine'
};

export default function InteractiveSequence({ sequence, domains, cifUrl }) {
  const [plddtData, setPlddtData] = useState(null);
  const [hoveredResidue, setHoveredResidue] = useState(null);

  useEffect(() => {
    if (!cifUrl) return;
    
    // Attempt to fetch and parse CIF for pLDDT scores (B-factor column)
    fetch(cifUrl)
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n');
        const plddtMap = {};
        for (const line of lines) {
          if (line.startsWith('ATOM') && line.includes(' CA ')) {
            const parts = line.trim().split(/\s+/);
            // mmCIF format varies, but usually residue seq ID is column 9 (index 8) or 17 (index 16)
            // B-factor is usually column 15 (index 14)
            // A safer approach: the AlphaFold CIF has a specific structure.
            // Let's just use a simple heuristic or fallback to null if we can't parse safely
            try {
               // Very rough parser for AlphaFold mmCIF CA lines to extract pLDDT
               const resNum = parseInt(parts[8]);
               const bFactor = parseFloat(parts[14]);
               if (!isNaN(resNum) && !isNaN(bFactor)) {
                 plddtMap[resNum] = bFactor;
               }
            } catch (e) {}
          }
        }
        setPlddtData(plddtMap);
      })
      .catch(() => console.error("Could not fetch CIF for pLDDT map"));
  }, [cifUrl]);

  const getDomainForResidue = (idx) => {
    if (!domains) return "Disordered / Linker";
    const resNum = idx + 1;
    for (let i = 0; i < domains.length; i++) {
      if (resNum >= domains[i][0] && resNum <= domains[i][1]) {
        return `Domain ${i + 1}`;
      }
    }
    return "Disordered / Linker";
  };

  if (!sequence) return null;

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlignLeft size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold text-slate-200">Interactive Sequence Viewer</h3>
      </div>
      
      <p className="text-xs text-slate-400 mb-4">Hover over any amino acid to view its specific biochemical properties and structural assignments.</p>

      <div className="relative">
        <div className="flex flex-wrap gap-[2px] font-mono text-sm max-h-64 overflow-y-auto p-4 bg-[#1e293b] rounded-lg border border-slate-700 custom-scrollbar">
          {sequence.split('').map((aa, idx) => {
            const isHovered = hoveredResidue?.idx === idx;
            return (
              <span
                key={idx}
                onMouseEnter={() => setHoveredResidue({
                  idx,
                  aa,
                  resNum: idx + 1,
                  hydro: KD_SCALE[aa] || 0,
                  name: AA_NAMES[aa] || 'Unknown',
                  domain: getDomainForResidue(idx),
                  plddt: plddtData ? plddtData[idx + 1] : null
                })}
                onMouseLeave={() => setHoveredResidue(null)}
                className={`w-6 h-6 flex items-center justify-center rounded cursor-crosshair transition-colors
                  ${isHovered ? 'bg-blue-500 text-white font-bold z-10 scale-125 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {aa}
              </span>
            );
          })}
        </div>

        {/* Floating Tooltip */}
        {hoveredResidue && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-2xl z-20 w-64 pointer-events-none">
            <div className="flex justify-between items-start mb-2 border-b border-slate-700 pb-2">
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Residue {hoveredResidue.resNum}</div>
                <div className="text-lg font-bold text-white">{hoveredResidue.name} ({hoveredResidue.aa})</div>
              </div>
              <div className="w-10 h-10 rounded bg-slate-900 flex items-center justify-center font-mono text-xl font-bold text-blue-400 border border-slate-700">
                {hoveredResidue.aa}
              </div>
            </div>
            
            <div className="space-y-2 mt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Hydrophobicity</span>
                <span className={`font-mono font-medium ${hoveredResidue.hydro > 0 ? 'text-orange-400' : 'text-blue-400'}`}>
                  {hoveredResidue.hydro > 0 ? '+' : ''}{hoveredResidue.hydro.toFixed(1)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Domain</span>
                <span className="text-slate-200 font-medium">{hoveredResidue.domain}</span>
              </div>

              {hoveredResidue.plddt !== null && hoveredResidue.plddt !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">pLDDT Confidence</span>
                  <span className={`font-mono font-medium ${hoveredResidue.plddt > 90 ? 'text-blue-400' : hoveredResidue.plddt > 70 ? 'text-emerald-400' : hoveredResidue.plddt > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {hoveredResidue.plddt.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
