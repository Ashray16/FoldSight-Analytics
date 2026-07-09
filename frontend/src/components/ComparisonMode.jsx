import React, { useState } from 'react';
import axios from 'axios';
import { GitCompare, X, Search, Loader2 } from 'lucide-react';

export default function ComparisonMode({ baseResults, onClose }) {
  const [compareId, setCompareId] = useState('');
  const [loading, setLoading] = useState(false);
  const [compareResults, setCompareResults] = useState(null);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (!compareId) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post("/api/analyze", { 
        uniprot_id: compareId, 
        window_size: 9 
      });
      setCompareResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch protein for comparison");
    } finally {
      setLoading(false);
    }
  };

  const renderMetric = (label, getValFn, formatFn = (v) => v) => {
    const valA = getValFn(baseResults);
    const valB = compareResults ? getValFn(compareResults) : null;
    
    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b border-slate-800 items-center">
        <div className="text-sm font-medium text-slate-400">{label}</div>
        <div className="text-sm font-mono text-blue-300 bg-blue-900/10 p-2 rounded border border-blue-500/20 text-center">
          {formatFn(valA)}
        </div>
        <div className="text-sm font-mono text-purple-300 bg-purple-900/10 p-2 rounded border border-purple-500/20 text-center">
          {compareResults ? formatFn(valB) : '-'}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-[#0f172a] w-full max-w-5xl max-h-full rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <GitCompare size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Protein Comparison Mode</h2>
              <p className="text-sm text-slate-400">Compare properties side-by-side</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Inputs */}
          <div className="grid grid-cols-3 gap-4 mb-8 items-end">
            <div></div>
            <div className="text-center">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 block">Protein A (Base)</span>
              <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg text-slate-200 font-mono text-lg">
                {baseResults.uniprot_id || "Custom Sequence"}
              </div>
            </div>
            <div className="text-center">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1 block">Protein B (Target)</span>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="UniProt ID (e.g. P01308)"
                  value={compareId}
                  onChange={e => setCompareId(e.target.value)}
                  className="flex-1 bg-slate-800/50 border border-slate-700 p-3 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  onKeyDown={e => e.key === 'Enter' && handleCompare()}
                />
                <button 
                  onClick={handleCompare}
                  disabled={loading || !compareId}
                  className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                </button>
              </div>
              {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            {renderMetric('Sequence Length', r => r.sequence.length, v => `${v} aa`)}
            {renderMetric('Molecular Weight', r => r.properties.molecular_weight, v => `${(v/1000).toFixed(2)} kDa`)}
            {renderMetric('Isoelectric Point (pI)', r => r.properties.pi, v => v?.toFixed(2))}
            {renderMetric('GRAVY Score', r => r.properties.gravy, v => v?.toFixed(2))}
            {renderMetric('Instability Index', r => r.properties.instability_index, v => v?.toFixed(2))}
            {renderMetric('Aliphatic Index', r => r.properties.aliphatic_index, v => v?.toFixed(2))}
            {renderMetric('Est. Half-Life', r => r.properties.half_life)}
            {renderMetric('Solubility', r => r.properties.solubility)}
            
            {/* Structural Metrics */}
            <div className="py-4 mt-4 border-t-2 border-slate-800">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Structure & Domains</h4>
              {renderMetric('Alpha Helix', r => r.secondary_structure.helix, v => `${(v*100).toFixed(1)}%`)}
              {renderMetric('Beta Sheet', r => r.secondary_structure.sheet, v => `${(v*100).toFixed(1)}%`)}
              {renderMetric('AlphaFold pLDDT', r => r.alphafold?.plddt?.global, v => v ? v.toFixed(1) : 'N/A')}
              {renderMetric('Domain Count', r => r.alphafold?.pae?.domains?.length, v => v !== undefined ? v : 'N/A')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
