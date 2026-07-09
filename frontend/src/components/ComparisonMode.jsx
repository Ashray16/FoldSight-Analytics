import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GitCompare, X, Search, Loader2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ComparisonMode({ baseResults, onClose }) {
  const [compareId, setCompareId] = useState('');
  const [loading, setLoading] = useState(false);
  const [compareResults, setCompareResults] = useState(null);
  const [error, setError] = useState('');
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const dropdownRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setCompareId(val);
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (val.length >= 3) {
      setSearchTimeout(setTimeout(() => fetchSuggestions(val), 300));
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const fetchSuggestions = async (query) => {
    try {
      const res = await axios.get(`https://rest.uniprot.org/uniprotkb/search?query=${query}*&format=json&size=5`);
      if (res.data && res.data.results) {
        const parsed = res.data.results.map(r => ({
          id: r.primaryAccession,
          name: r.proteinDescription?.recommendedName?.fullName?.value || 'Unknown Protein',
          gene: r.genes?.[0]?.geneName?.value || ''
        }));
        setSuggestions(parsed);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error("UniProt search error", err);
    }
  };

  const selectSuggestion = (id) => {
    setCompareId(id);
    setShowDropdown(false);
    handleCompare(id);
  };

  const handleCompare = async (targetId = compareId) => {
    if (!targetId) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post("/api/analyze", { 
        uniprot_id: targetId, 
        window_size: 9 
      });
      setCompareResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch protein for comparison");
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine the "better" value and style it
  const renderRow = (label, getValFn, formatFn = (v) => v, compareRule = 'none') => {
    const valA = getValFn(baseResults);
    const valB = compareResults ? getValFn(compareResults) : null;
    
    let aClass = "text-slate-300 font-mono";
    let bClass = "text-slate-300 font-mono";
    
    if (compareResults && valA !== null && valB !== null) {
      if (compareRule === 'higher_is_better') {
        if (valA > valB) aClass = "text-emerald-400 font-mono font-bold bg-emerald-500/10 rounded px-2 py-1";
        if (valB > valA) bClass = "text-emerald-400 font-mono font-bold bg-emerald-500/10 rounded px-2 py-1";
      } else if (compareRule === 'lower_is_better') {
        if (valA < valB) aClass = "text-emerald-400 font-mono font-bold bg-emerald-500/10 rounded px-2 py-1";
        if (valB < valA) bClass = "text-emerald-400 font-mono font-bold bg-emerald-500/10 rounded px-2 py-1";
      } else if (compareRule === 'stability') {
         if (valA === 'Stable' && valB !== 'Stable') aClass = "text-emerald-400 font-mono font-bold bg-emerald-500/10 rounded px-2 py-1";
         if (valB === 'Stable' && valA !== 'Stable') bClass = "text-emerald-400 font-mono font-bold bg-emerald-500/10 rounded px-2 py-1";
         if (valA === 'Stable' && valB === 'Stable') {
            aClass = "text-emerald-400 font-mono";
            bClass = "text-emerald-400 font-mono";
         }
      }
    }
    
    return (
      <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
        <td className="py-4 px-4 text-sm font-medium text-slate-400">{label}</td>
        <td className={`py-4 px-4 text-sm ${aClass}`}>{formatFn(valA)}</td>
        <td className={`py-4 px-4 text-sm ${bClass}`}>{compareResults ? formatFn(valB) : '-'}</td>
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      {/* Slide-out Drawer */}
      <div className="bg-[#0f172a] w-full md:w-[600px] h-full shadow-2xl flex flex-col border-l border-slate-800 animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <GitCompare size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Protein Comparison</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Target Selection */}
          <div className="mb-8">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Compare against Target</label>
            <div className="relative" ref={dropdownRef}>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Search UniProt ID or Protein Name..."
                  value={compareId}
                  onChange={handleSearchChange}
                  className="flex-1 bg-slate-800/50 border border-slate-700 p-3 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  onKeyDown={e => e.key === 'Enter' && handleCompare()}
                />
                <button 
                  onClick={() => handleCompare(compareId)}
                  disabled={loading || !compareId}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                </button>
              </div>
              
              {/* Autocomplete Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-14 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <div 
                      key={i} 
                      className="p-3 border-b border-slate-700/50 hover:bg-slate-700 cursor-pointer"
                      onClick={() => selectSuggestion(s.id)}
                    >
                      <div className="font-mono text-sm text-blue-300">{s.id}</div>
                      <div className="text-xs text-slate-300 truncate">{s.name}</div>
                      {s.gene && <div className="text-[10px] text-slate-500">Gene: {s.gene}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
          </div>

          {/* Comparison Table */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Property</th>
                  <th className="py-3 px-4 text-xs font-bold text-blue-400 uppercase tracking-wider">Protein A (Base)</th>
                  <th className="py-3 px-4 text-xs font-bold text-purple-400 uppercase tracking-wider">Protein B (Target)</th>
                </tr>
              </thead>
              <tbody>
                {renderRow('Sequence Length', r => r.sequence.length, v => `${v} aa`, 'none')}
                {renderRow('Molecular Weight', r => r.properties.molecular_weight, v => `${(v/1000).toFixed(2)} kDa`, 'none')}
                {renderRow('Isoelectric Point (pI)', r => r.properties.pi, v => v?.toFixed(2), 'none')}
                {renderRow('GRAVY Score', r => r.properties.gravy, v => v?.toFixed(2), 'none')}
                {renderRow('Instability Index', r => r.properties.instability_index, v => v?.toFixed(2), 'lower_is_better')}
                {renderRow('Stability', r => r.properties.stability, v => v, 'stability')}
                {renderRow('Aliphatic Index', r => r.properties.aliphatic_index, v => v?.toFixed(2), 'higher_is_better')}
                {renderRow('Est. Half-Life', r => r.properties.half_life, v => v, 'none')}
                {renderRow('AlphaFold pLDDT', r => r.alphafold?.plddt?.global, v => v ? `${v.toFixed(1)}%` : 'N/A', 'higher_is_better')}
                {renderRow('Domains', r => r.alphafold?.pae?.domains?.length, v => v !== undefined ? v : 'N/A', 'none')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
