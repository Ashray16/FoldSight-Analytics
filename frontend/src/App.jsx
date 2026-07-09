import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import InteractiveSequence from './components/InteractiveSequence';
import ComparisonMode from './components/ComparisonMode';
import ScientificDrawer from './components/ScientificDrawer';
import PDFExport from './components/PDFExport';
import StatusBadge from './components/StatusBadge';
import './index.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Logo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 15c6.667-6 13.333 0 20-6" />
    <path d="M9 22c1.798-1.998 2.518-3.995 2.808-5.993" />
    <path d="M15 2c-1.798 1.998-2.518 3.995-2.808 5.993" />
    <path d="m17 6-2.5-2.5" />
    <path d="m14 8-1-1" />
    <path d="m7 18 2.5 2.5" />
    <path d="m3.5 14.5.5.5" />
    <path d="m20 9 .5.5" />
    <path d="m6.5 12.5 1 1" />
    <path d="m16.5 10.5 1 1" />
    <path d="m10 16 1.5 1.5" />
  </svg>
);

const Viewer3D = ({ cifUrl, sequence, styleMode, highlightDomain }) => {
  const viewerRef = useRef(null);
  const [viewerInstance, setViewerInstance] = useState(null);
  
  const applyStyle = (viewer, mode, highlight) => {
    viewer.removeAllSurfaces();
    viewer.setStyle({}, {}); 
    
    // AlphaFold pLDDT is stored in the B-factor column ('b'). Red (low) to Blue (high)
    const plddtColors = {prop: 'b', gradient: 'rwb', min: 50, max: 100};
    
    if (highlight) {
      const [start, end] = highlight;
      const highlightRange = [];
      for(let i=start; i<=end; i++) highlightRange.push(i);

      if (mode === 'cartoon') {
        viewer.setStyle({}, { cartoon: { color: '#334155' } });
        viewer.setStyle({resi: highlightRange}, { cartoon: { colorscheme: plddtColors } });
      } else if (mode === 'stick') {
        viewer.setStyle({}, { stick: { color: '#334155' } });
        viewer.setStyle({resi: highlightRange}, { stick: { colorscheme: plddtColors } });
      } else if (mode === 'sphere') {
        viewer.setStyle({}, { sphere: { color: '#334155' } });
        viewer.setStyle({resi: highlightRange}, { sphere: { colorscheme: plddtColors } });
      } else if (mode === 'surface') {
        viewer.addSurface(window.$3Dmol.VDW, {opacity: 0.4, color: '#334155'});
        viewer.addSurface(window.$3Dmol.VDW, {opacity: 1.0, colorscheme: plddtColors}, {resi: highlightRange});
      }
      viewer.zoomTo({resi: highlightRange});
    } else {
      if (mode === 'cartoon') {
        viewer.setStyle({}, { cartoon: { colorscheme: plddtColors } });
      } else if (mode === 'stick') {
        viewer.setStyle({}, { stick: { colorscheme: plddtColors } });
      } else if (mode === 'sphere') {
        viewer.setStyle({}, { sphere: { colorscheme: plddtColors } });
      } else if (mode === 'surface') {
        viewer.addSurface(window.$3Dmol.VDW, {opacity: 1.0, colorscheme: plddtColors});
      }
      viewer.zoomTo();
    }

    // Add interactive hover tooltips
    viewer.setHoverable({}, true, 
      function(atom, viewer, event, container) {
        if (!atom.label) {
          atom.label = viewer.addLabel(atom.resn + " " + atom.resi, {
            position: atom,
            backgroundColor: '#1E1E1E',
            fontColor: '#FFFFFF',
            fontSize: 14,
            backgroundOpacity: 0.8
          });
        }
      },
      function(atom, viewer) {
        if (atom.label) {
          viewer.removeLabel(atom.label);
          delete atom.label;
        }
      }
    );
  };

  useEffect(() => {
    if (!window.$3Dmol || !viewerRef.current) return;
    
    viewerRef.current.innerHTML = '';
    const viewer = window.$3Dmol.createViewer(viewerRef.current, {
      backgroundColor: 'transparent'
    });
    setViewerInstance(viewer);
    
    if (cifUrl) {
      axios.get(cifUrl).then(res => {
        viewer.addModel(res.data, "cif");
        applyStyle(viewer, styleMode, highlightDomain);
        viewer.render();
      }).catch(err => console.error("Error fetching CIF", err));
    }
  }, [cifUrl, sequence]);

  useEffect(() => {
    if (viewerInstance) {
      applyStyle(viewerInstance, styleMode, highlightDomain);
      viewerInstance.render();
    }
  }, [styleMode, highlightDomain, viewerInstance]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {cifUrl ? (
        <div ref={viewerRef} style={{ width: '100%', flex: 1, position: 'relative' }}></div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)' }}>
          No 3D structure available. Run an analysis.
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('molecular'); // 'molecular' | 'sequence'
  const [selectedDomain, setSelectedDomain] = useState(null);
  
  const [inputType, setInputType] = useState('uniprot');
  const [inputValue, setInputValue] = useState('');
  
  const [styleMode, setStyleMode] = useState('cartoon');
  const [windowSize, setWindowSize] = useState(9);
  
  const [showCompare, setShowCompare] = useState(false);
  const [showScientific, setShowScientific] = useState(false);
  const dashboardRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [hydroData, setHydroData] = useState([]);
  const [proteinFunction, setProteinFunction] = useState('');
  const [error, setError] = useState('');
  
  const [history, setHistory] = useState([]);

  // Load history on initial render
  useEffect(() => {
    const saved = localStorage.getItem('search_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing history from localStorage", e);
      }
    }
  }, []);

  const addToHistory = (type, val) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.value !== val);
      const newHistory = [{ type, value: val, id: Date.now() }, ...filtered].slice(0, 5);
      localStorage.setItem('search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n');
        const seq = lines.filter(l => !l.startsWith('>')).join('').trim();
        setInputType('sequence');
        setInputValue(seq);
    };
    reader.readAsText(file);
  };

  const fetchProteinFunction = async (uniprotId) => {
    try {
      const res = await axios.get(`https://rest.uniprot.org/uniprotkb/${uniprotId}.json`);
      const funcComment = res.data.comments?.find(c => c.commentType === 'FUNCTION');
      if (funcComment && funcComment.texts && funcComment.texts.length > 0) {
        let rawText = funcComment.texts[0].value;
        // Strip out ugly (PubMed:1234, ...) citations
        let cleanText = rawText.replace(/\s*\([^)]*PubMed[^)]*\)/g, '');
        setProteinFunction(cleanText);
      } else {
        setProteinFunction('No functional description available in UniProt for this protein.');
      }
    } catch (err) {
      setProteinFunction('Could not fetch functional description.');
    }
  };

  const handleAnalyze = async (overrideType, overrideVal) => {
    const typeToUse = overrideType || inputType;
    const valToUse = overrideVal || inputValue;
    
    if (!valToUse) return;
    
    setLoading(true);
    setError('');
    setProteinFunction('');
    
    try {
      const payload = typeToUse === 'uniprot' 
        ? { uniprot_id: valToUse, window_size: parseInt(windowSize) } 
        : { sequence: valToUse, window_size: parseInt(windowSize) };
        
      const res = await axios.post("/api/analyze", payload);
      setResults(res.data);
      setHydroData(res.data.hydrophobicity_plot);
      addToHistory(typeToUse, valToUse);
      
      if (typeToUse === 'uniprot') {
         fetchProteinFunction(valToUse);
      } else if (res.data.uniprot_id) {
         fetchProteinFunction(res.data.uniprot_id);
      }
      
      // Update UI state in case it was triggered from history
      setInputType(typeToUse);
      setInputValue(valToUse);
      setActiveTab('molecular');
      setSelectedDomain(null);
    } catch (err) {
      if (err.response) {
        setError(`Error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      } else {
        setError(`Network Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Real-time silent refetch for hydrophobicity slider
  useEffect(() => {
    if (results && results.sequence) {
      axios.post("/api/hydrophobicity", {
        sequence: results.sequence,
        window_size: parseInt(windowSize)
      }).then(res => {
        setHydroData(res.data.hydrophobicity_plot);
      }).catch(err => console.error("Error fetching updated hydrophobicity", err));
    }
  }, [windowSize]); 
  
  const exportCSV = () => {
    if (!results) return;
    let csv = "Metric,Value\n";
    csv += `Molecular Weight,${results.properties.molecular_weight}\n`;
    csv += `Isoelectric Point,${results.properties.pi}\n`;
    csv += `GRAVY Score,${results.properties.gravy}\n`;
    csv += `Classification,${results.properties.classification}\n`;
    csv += `Helix %,${(results.secondary_structure.helix*100).toFixed(1)}\n`;
    csv += `Turn %,${(results.secondary_structure.turn*100).toFixed(1)}\n`;
    csv += `Sheet %,${(results.secondary_structure.sheet*100).toFixed(1)}\n`;
    
    if (results.alphafold?.plddt) {
      csv += `AlphaFold pLDDT,${results.alphafold.plddt.global}\n`;
      csv += `AlphaFold Conclusion,"${results.alphafold.plddt.conclusion}"\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'protein_analysis_report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderCharts = () => {
    if (!results) return null;
    
    const aaData = {
      labels: Object.keys(results.amino_acid_counts),
      datasets: [{
        label: 'Frequency',
        data: Object.values(results.amino_acid_counts),
        backgroundColor: '#3b82f6', // blue-500
        borderRadius: 4
      }],
    };

    const hData = {
      labels: hydroData.map((_, i) => i+1),
      datasets: [{
        label: 'Score',
        data: hydroData,
        borderColor: '#14b8a6', // teal-500
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 0
      }]
    };
    
    const aaNames = {
      'A': 'Alanine', 'R': 'Arginine', 'N': 'Asparagine', 'D': 'Aspartic Acid',
      'C': 'Cysteine', 'Q': 'Glutamine', 'E': 'Glutamic Acid', 'G': 'Glycine',
      'H': 'Histidine', 'I': 'Isoleucine', 'L': 'Leucine', 'K': 'Lysine',
      'M': 'Methionine', 'F': 'Phenylalanine', 'P': 'Proline', 'S': 'Serine',
      'T': 'Threonine', 'W': 'Tryptophan', 'Y': 'Tyrosine', 'V': 'Valine'
    };

    const aaChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                const label = tooltipItems[0].label;
                return `${label} - ${aaNames[label] || 'Unknown'}`;
              }
            }
          }
        },
        scales: {
            x: { 
              title: { display: true, text: 'Amino Acid Type', color: '#94a3b8', font: { size: 12 } },
              ticks: {color: '#94a3b8'}, 
              grid: {color: 'rgba(255,255,255,0.05)'} 
            },
            y: { 
              title: { display: true, text: 'Frequency (Count)', color: '#94a3b8', font: { size: 12 } },
              ticks: {color: '#94a3b8'}, 
              grid: {color: 'rgba(255,255,255,0.05)'} 
            }
        }
    };

    const hydroChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { 
              title: { display: true, text: 'Sequence Position', color: '#94a3b8', font: { size: 12 } },
              ticks: {color: '#94a3b8', maxTicksLimit: 10}, 
              grid: {color: 'rgba(255,255,255,0.05)'} 
            },
            y: { 
              title: { display: true, text: 'Kyte-Doolittle Score', color: '#94a3b8', font: { size: 12 } },
              ticks: {color: '#94a3b8'}, 
              grid: {color: 'rgba(255,255,255,0.05)'} 
            }
        }
    };

    return (
      <div className="grid-2">
        <div className="glass-panel" style={{padding: '16px'}}>
          <div className="panel-title">
            <h3><span className="material-symbols-outlined" style={{color: 'var(--secondary)'}}>bar_chart</span> Amino Acid Comp</h3>
          </div>
          <div className="chart-wrapper">
            <Bar data={aaData} options={aaChartOptions} />
          </div>
        </div>
        <div className="glass-panel" style={{padding: '16px'}}>
          <div className="panel-title">
            <h3><span className="material-symbols-outlined" style={{color: 'var(--tertiary)'}}>timeline</span> Hydrophobicity</h3>
          </div>
          <div className="chart-wrapper">
            <Line data={hData} options={hydroChartOptions} />
          </div>
        </div>
      </div>
    );
  };

  const cycleStyleMode = () => {
    const modes = ["cartoon", "stick", "sphere", "surface"];
    const currIdx = modes.indexOf(styleMode);
    setStyleMode(modes[(currIdx + 1) % modes.length]);
  };

  return (
    <div className="dashboard-container">
      {/* SideNavBar */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon">
            <Logo />
          </div>
          <div className="brand-title">FoldSight</div>
        </div>
        
        <div className="sidebar-nav">
          <a className={`nav-item ${activeTab === 'molecular' ? 'active' : ''}`} onClick={() => setActiveTab('molecular')} style={{cursor: 'pointer'}}>
            <span className="material-symbols-outlined" style={{marginRight: '12px'}}>analytics</span>
            <span className="text-label-caps">Molecular Analysis</span>
          </a>
          <a className={`nav-item ${activeTab === 'sequence' ? 'active' : ''}`} onClick={() => setActiveTab('sequence')} style={{cursor: 'pointer'}}>
            <span className="material-symbols-outlined" style={{marginRight: '12px'}}>dns</span>
            <span className="text-label-caps">Sequence Viewer</span>
          </a>
        </div>
        
        <div style={{flex: 1, padding: '24px 8px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div className="sidebar-section-title">Analysis Setup</div>
            
            <div className="radio-group" style={{padding: '0 8px'}}>
              <label className={`radio-label ${inputType === 'uniprot' ? 'active' : ''}`}>
                <input type="radio" checked={inputType==='uniprot'} onChange={()=>setInputType('uniprot')}/> UniProt
              </label>
              <label className={`radio-label ${inputType === 'sequence' ? 'active' : ''}`}>
                <input type="radio" checked={inputType==='sequence'} onChange={()=>setInputType('sequence')}/> Sequence
              </label>
            </div>
            
            <div style={{padding: '0 8px'}}>
              <input 
                className="text-input" 
                placeholder={inputType==='uniprot' ? 'e.g. P04637' : 'e.g. MNGTE...'} 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
              />
            </div>
            
            <div style={{padding: '0 8px'}}>
              <label className="file-upload">
                <span className="material-symbols-outlined" style={{fontSize: '18px', verticalAlign: 'middle', marginRight: '6px'}}>upload_file</span> 
                Upload FASTA File
                <input type="file" accept=".fasta,.txt,.seq" onChange={handleFileUpload} />
              </label>
            </div>
            
            <div style={{padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <label style={{fontSize: '11px', color: 'var(--on-surface-variant)'}}>3D View Style</label>
              <select className="text-input" value={styleMode} onChange={e => setStyleMode(e.target.value)} style={{padding: '8px'}}>
                <option value="cartoon">Cartoon / Ribbon</option>
                <option value="stick">Ball and Stick</option>
                <option value="sphere">Space Filling</option>
                <option value="surface">Molecular Surface</option>
              </select>
            </div>

            <div style={{padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <label style={{fontSize: '11px', color: 'var(--on-surface-variant)'}}>Hydrophobicity Window: {windowSize}</label>
              <input type="range" min="5" max="21" step="2" value={windowSize} onChange={e => setWindowSize(e.target.value)} />
            </div>
            
            <div style={{padding: '0 8px', marginTop: 'auto', paddingTop: '24px'}}>
              <button className="btn-primary" onClick={() => handleAnalyze()} disabled={loading}>
                <span className="material-symbols-outlined" style={{fontSize: '18px'}}>play_arrow</span>
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
        </div>
        
        {history.length > 0 && (
          <div style={{padding: '24px 8px', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
            <div className="sidebar-section-title">Recent Searches</div>
            <div className="history-list">
              {history.map(h => (
                  <div key={h.id} className="history-item" onClick={() => handleAnalyze(h.type, h.value)}>
                    <span className="material-symbols-outlined" style={{fontSize: '16px'}}>
                      {h.type === 'uniprot' ? 'fingerprint' : 'polyline'}
                    </span>
                    <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{h.value}</span>
                  </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="main-content">
        <header className="top-bar !h-auto !py-4 flex flex-col xl:flex-row gap-4 xl:gap-8 items-start xl:items-center">
          <div className="flex flex-col gap-1.5 w-full xl:w-auto">
            <h2 className="text-xl font-bold text-slate-100 truncate w-full max-w-full xl:max-w-[500px]" title={results?.protein_name || 'Protein Dashboard'}>
              {results?.protein_name || 'Protein Dashboard'}
            </h2>
            {results && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-1 rounded">{results.uniprot_id}</span>
                <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded">{results.properties.length} aa</span>
                <StatusBadge status={results.properties.stability} />
                <span className="text-xs text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
                  {results.properties.classification}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            {results && (
              <>
                <button className="btn-outline !text-sm !py-1.5" onClick={() => setShowScientific(true)}>
                  <span className="material-symbols-outlined text-[16px] mr-1.5">science</span> Interpretation
                </button>
                <button className="btn-outline !text-sm !py-1.5" onClick={() => setShowCompare(true)}>
                  <span className="material-symbols-outlined text-[16px] mr-1.5">compare_arrows</span> Compare
                </button>
              </>
            )}
            <button className="btn-outline !text-sm !py-1.5" onClick={exportCSV} disabled={!results}>
              <span className="material-symbols-outlined text-[16px] mr-1.5">download</span> CSV
            </button>
            <div className="scale-90 origin-left">
              <PDFExport results={results} filename={`${results?.uniprot_id || 'protein'}_report.pdf`} />
            </div>
          </div>
        </header>

        <main className="main-viewport" ref={dashboardRef}>
          {error && (
            <div style={{position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 100}}>
              <div className="error-banner">{error}</div>
            </div>
          )}

          {/* Left Area (Grid, Viewer, Charts, or Sequence Viewer) */}
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0}}>
            
            {/* Protein Function / Description */}
            {proteinFunction && (
              <div style={{
                 padding: '16px 20px', 
                 backgroundColor: 'rgba(96, 165, 250, 0.05)', 
                 borderLeft: '4px solid var(--secondary)',
                 borderRadius: '8px',
                 color: 'var(--on-surface)',
                 fontSize: '14px',
                 lineHeight: '1.6',
                 border: '1px solid rgba(255,255,255,0.05)',
                 borderLeft: '4px solid var(--secondary)'
              }}>
                <strong style={{color: 'var(--secondary)'}}>About this protein: </strong> {proteinFunction}
              </div>
            )}
            
            {activeTab === 'molecular' ? (
              <div className="flex flex-col gap-8">
                {/* Stats Grid */}
                {results && (
                  <div className="grid-2" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
                    <div className="card-stat">
                      <div className="card-stat-title">Molecular Weight</div>
                      <div className="card-stat-value">{(results.properties.molecular_weight / 1000).toFixed(1)}k</div>
                      <div style={{fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px'}}>Daltons (kDa)</div>
                    </div>
                    <div className="card-stat">
                      <div className="card-stat-title">Isoelectric Point</div>
                      <div className="card-stat-value">{results.properties.pi.toFixed(2)}</div>
                      <div style={{fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px'}}>pH Level</div>
                    </div>
                    <div className="card-stat" style={{borderTop: `2px solid ${results.properties.gravy > 0 ? 'var(--secondary)' : 'var(--tertiary)'}`}}>
                      <div className="card-stat-title">GRAVY Score</div>
                      <div className="card-stat-value">{results.properties.gravy.toFixed(3)}</div>
                      <div style={{fontSize: '11px', color: results.properties.gravy > 0 ? 'var(--secondary)' : 'var(--tertiary)', marginTop: '4px', fontWeight: '600'}}>{results.properties.classification}</div>
                    </div>
                    <div className="card-stat">
                      <div className="card-stat-title">Sec. Structure</div>
                      <div className="card-stat-value">{(results.secondary_structure.helix*100).toFixed(0)}%</div>
                      <div style={{fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px'}}>Helices ({(results.secondary_structure.sheet*100).toFixed(0)}% Sheets)</div>
                    </div>
                  </div>
                )}

                {/* 3D Viewer - Expanded Width */}
                <section className="glass-panel viewer-container w-full" style={{ height: '500px' }}>
                  <div className="viewer-overlay">
                    {results && (
                      <div className="status-badge">
                        <div className="pulse-dot"></div>
                        <span className="text-label-caps" style={{color: 'var(--on-surface)'}}>Live Render Engine</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{flex: 1, backgroundColor: '#020617', position: 'relative'}}>
                    <Viewer3D cifUrl={results?.cif_url} sequence={results?.sequence} styleMode={styleMode} highlightDomain={selectedDomain} />
                  </div>
                  
                  {results && (
                    <div className="floating-controls">
                      <button className="icon-btn" title="Cycle Render Style" onClick={cycleStyleMode}>
                        <span className="material-symbols-outlined">layers</span>
                      </button>
                      <div className="divider"></div>
                      <div className="text-mono" style={{color: 'var(--on-surface)', fontSize: '11px', textTransform: 'uppercase'}}>{styleMode}</div>
                    </div>
                  )}
                </section>

                {/* Charts */}
                {renderCharts()}
              </div>
            ) : (
              <div style={{flex: 1, overflowY: 'auto'}}>
                {results?.sequence ? (
                  <InteractiveSequence 
                    sequence={results.sequence} 
                    domains={results.alphafold?.pae?.domains} 
                    cifUrl={results.cif_url} 
                  />
                ) : (
                  <div style={{color: 'var(--on-surface-variant)', padding: '24px'}}>No sequence available. Run an analysis.</div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar (PAE Inspector) */}
          {results && (
            <aside style={{width: '380px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0}}>

              {/* Domains / PAE Inspector Panel */}
              <div className="glass-panel" style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px'}}>
                <div style={{padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px'}}>
                  <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px', fontWeight: '500', color: 'var(--on-surface)'}}>
                    <span className="material-symbols-outlined" style={{color: 'var(--secondary)'}}>view_agenda</span> Rigid Domains (PAE)
                  </h3>
                </div>
                <div style={{flex: 1, overflowY: 'auto', padding: '12px'}}>
                  {results.alphafold?.pae ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                      <div style={{fontSize: '13px', color: 'var(--on-surface-variant)', marginBottom: '12px', padding: '0 4px'}}>
                        {results.alphafold.pae.conclusion}
                      </div>
                      
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', padding: '8px 16px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--outline)', fontWeight: '700', letterSpacing: '0.05em'}}>
                         <div>Domain</div>
                         <div>Residues</div>
                         <div style={{textAlign: 'right'}}>Length</div>
                      </div>

                      {results.alphafold.pae.domains.length > 0 ? (
                        results.alphafold.pae.domains.map((dom, i) => (
                          <div 
                            key={i} 
                            className="zebra-row" 
                            style={{
                              gridTemplateColumns: '1fr 1.5fr 1fr',
                              cursor: 'pointer',
                              backgroundColor: selectedDomain && selectedDomain[0] === dom[0] ? 'rgba(20, 184, 166, 0.1)' : undefined,
                              borderLeft: selectedDomain && selectedDomain[0] === dom[0] ? '3px solid var(--tertiary)' : '3px solid transparent'
                            }}
                            onClick={() => setSelectedDomain(selectedDomain && selectedDomain[0] === dom[0] ? null : dom)}
                          >
                            <div style={{color: 'var(--secondary)'}}>Dom {i+1}</div>
                            <div>{dom[0]} - {dom[1]}</div>
                            <div style={{textAlign: 'right'}}>{dom[1] - dom[0] + 1} aa</div>
                          </div>
                        ))
                      ) : (
                        <div style={{padding: '16px', textAlign: 'center', color: 'var(--outline-variant)'}}>
                          No distinct rigid domains detected.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{padding: '16px', fontSize: '13px', color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '20px'}}>
                      No PAE data available to determine domain boundaries.
                    </div>
                  )}
                </div>
              </div>

            </aside>
          )}
        </main>
      </div>
      
      {showCompare && results && (
        <ComparisonMode baseResults={results} onClose={() => setShowCompare(false)} />
      )}
      
      {showScientific && results && (
        <ScientificDrawer 
          results={results} 
          onClose={() => setShowScientific(false)} 
          onDomainSelect={(dom) => {
            setSelectedDomain(dom);
            setShowScientific(false);
          }}
        />
      )}
    </div>
  );
}
