import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import './index.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Viewer3D = ({ cifUrl, sequence, styleMode }) => {
  const viewerRef = useRef(null);
  const [viewerInstance, setViewerInstance] = useState(null);
  
  const applyStyle = (viewer, mode) => {
    viewer.removeAllSurfaces();
    viewer.setStyle({}, {}); 
    
    // AlphaFold pLDDT is stored in the B-factor column ('b'). Red (low) to Blue (high)
    const plddtColors = {prop: 'b', gradient: 'rwb', min: 50, max: 100};
    
    if (mode === 'cartoon') {
      viewer.setStyle({}, { cartoon: { colorscheme: plddtColors } });
    } else if (mode === 'stick') {
      viewer.setStyle({}, { stick: { colorscheme: plddtColors } });
    } else if (mode === 'sphere') {
      viewer.setStyle({}, { sphere: { colorscheme: plddtColors } });
    } else if (mode === 'surface') {
      viewer.addSurface(window.$3Dmol.VDW, {opacity: 1.0, colorscheme: plddtColors});
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
        applyStyle(viewer, styleMode);
        viewer.zoomTo();
        viewer.render();
      }).catch(err => console.error("Error fetching CIF", err));
    }
  }, [cifUrl, sequence]);

  useEffect(() => {
    if (viewerInstance) {
      applyStyle(viewerInstance, styleMode);
      viewerInstance.render();
    }
  }, [styleMode, viewerInstance]);

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
  const [inputType, setInputType] = useState('uniprot');
  const [inputValue, setInputValue] = useState('');
  
  const [styleMode, setStyleMode] = useState('cartoon');
  const [windowSize, setWindowSize] = useState(9);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [hydroData, setHydroData] = useState([]);
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
      // Persist to local storage so it survives page refreshes
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

  const handleAnalyze = async (overrideType, overrideVal) => {
    const typeToUse = overrideType || inputType;
    const valToUse = overrideVal || inputValue;
    
    if (!valToUse) return;
    
    setLoading(true);
    setError('');
    
    try {
      const payload = typeToUse === 'uniprot' 
        ? { uniprot_id: valToUse, window_size: parseInt(windowSize) } 
        : { sequence: valToUse, window_size: parseInt(windowSize) };
        
      const res = await axios.post("https://fold-sight-analytics-8vs1.vercel.app/api/analyze", payload);
      setResults(res.data);
      setHydroData(res.data.hydrophobicity_plot);
      addToHistory(typeToUse, valToUse);
      
      // Update UI state in case it was triggered from history
      setInputType(typeToUse);
      setInputValue(valToUse);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  // Real-time silent refetch for hydrophobicity slider
  useEffect(() => {
    if (results && results.sequence) {
      axios.post("https://fold-sight-analytics-8vs1.vercel.app/api/hydrophobicity", {
        sequence: results.sequence,
        window_size: parseInt(windowSize)
      }).then(res => {
        setHydroData(res.data.hydrophobicity_plot);
      }).catch(err => console.error("Error fetching updated hydrophobicity", err));
    }
  }, [windowSize]); 
  // intentionally excluding results.sequence from dep array to avoid double fetch on initial load

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
        backgroundColor: '#7bd0ff', // secondary
        borderRadius: 4
      }],
    };

    const hData = {
      labels: hydroData.map((_, i) => i+1),
      datasets: [{
        label: 'Score',
        data: hydroData,
        borderColor: '#4edea3', // tertiary
        backgroundColor: 'rgba(78, 222, 163, 0.1)',
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
            x: { ticks: {color: '#909097'}, grid: {color: 'rgba(255,255,255,0.05)'} },
            y: { ticks: {color: '#909097'}, grid: {color: 'rgba(255,255,255,0.05)'} }
        }
    };

    const hydroChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: {color: '#909097'}, grid: {color: 'rgba(255,255,255,0.05)'} },
            y: { ticks: {color: '#909097'}, grid: {color: 'rgba(255,255,255,0.05)'} }
        }
    };

    return (
      <div className="grid-2">
        <div className="glass-panel" style={{padding: '16px'}}>
          <div className="panel-title">
            <h3><span className="material-symbols-outlined">bar_chart</span> Amino Acid Comp</h3>
          </div>
          <div className="chart-wrapper">
            <Bar data={aaData} options={aaChartOptions} />
          </div>
        </div>
        <div className="glass-panel" style={{padding: '16px'}}>
          <div className="panel-title">
            <h3><span className="material-symbols-outlined">timeline</span> Hydrophobicity</h3>
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
            <span className="material-symbols-outlined">science</span>
          </div>
          <div className="brand-title">FoldSight</div>
        </div>
        
        <div className="sidebar-nav">
          <a className="nav-item active">
            <span className="material-symbols-outlined" style={{marginRight: '12px'}}>analytics</span>
            <span className="text-label-caps">Molecular Analysis</span>
          </a>
          <a className="nav-item">
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
        <header className="top-bar">
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <h2 className="text-headline-md">{results?.protein_name || 'Protein Analysis'}</h2>
            <div className="divider" style={{height: '16px'}}></div>
            <span style={{fontSize: '12px', color: 'var(--on-surface-variant)', background: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)'}}>
              {results?.uniprot_id ? `Target ID: ${results.uniprot_id}` : 'No Target Selected'}
            </span>
          </div>
          <button className="btn-outline" onClick={exportCSV} disabled={!results}>
            <span className="material-symbols-outlined" style={{fontSize: '16px'}}>download</span> Export CSV
          </button>
        </header>

        <main className="main-viewport">
          {error && (
            <div style={{position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 100}}>
              <div className="error-banner">{error}</div>
            </div>
          )}

          {/* Left Area (Grid, Viewer, Charts) */}
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0}}>
            
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

            {/* 3D Viewer */}
            <section className="glass-panel viewer-container">
              <div className="viewer-overlay">
                {results && (
                  <div className="status-badge">
                    <div className="pulse-dot"></div>
                    <span className="text-label-caps" style={{color: 'var(--on-surface)'}}>Live Render Engine</span>
                  </div>
                )}
              </div>
              
              <div style={{flex: 1, backgroundColor: '#010813', position: 'relative'}}>
                <Viewer3D cifUrl={results?.cif_url} sequence={results?.sequence} styleMode={styleMode} />
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

          {/* Right Sidebar (Confidence + Domain PAE Inspector) */}
          {results && (
            <aside style={{width: '380px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0}}>
              
              {/* Confidence Meter Panel */}
              <div className="glass-panel" style={{padding: '20px', flexShrink: 0}}>
                <div className="panel-title" style={{marginBottom: '20px'}}>
                  <h3><span className="material-symbols-outlined">monitoring</span> Confidence (pLDDT)</h3>
                  {results.alphafold?.plddt && (
                    <span style={{fontSize: '11px', background: 'rgba(123, 208, 255, 0.1)', color: 'var(--secondary)', padding: '4px 8px', borderRadius: '4px', fontWeight: '700'}}>
                      Avg: {results.alphafold.plddt.global.toFixed(1)}
                    </span>
                  )}
                </div>

                {results.alphafold?.plddt ? (
                  <div className="confidence-meter">
                    <div className="meter-row">
                      <div className="meter-label"><span>High (&gt;90)</span> <span className="text-mono">{(results.alphafold.plddt.vhigh * 100).toFixed(1)}%</span></div>
                      <div className="meter-track"><div className="meter-fill high" style={{width: `${results.alphafold.plddt.vhigh * 100}%`}}></div></div>
                    </div>
                    <div className="meter-row">
                      <div className="meter-label"><span>Medium (70-90)</span> <span className="text-mono">{(results.alphafold.plddt.conf * 100).toFixed(1)}%</span></div>
                      <div className="meter-track"><div className="meter-fill med" style={{width: `${results.alphafold.plddt.conf * 100}%`}}></div></div>
                    </div>
                    <div className="meter-row">
                      <div className="meter-label"><span>Low/Disordered (&lt;70)</span> <span className="text-mono" style={{color: 'var(--error)'}}>{((results.alphafold.plddt.low + results.alphafold.plddt.vlow) * 100).toFixed(1)}%</span></div>
                      <div className="meter-track"><div className="meter-fill low" style={{width: `${(results.alphafold.plddt.low + results.alphafold.plddt.vlow) * 100}%`}}></div></div>
                    </div>
                    <div style={{marginTop: '12px', fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}>
                      {results.alphafold.plddt.conclusion}
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize: '13px', color: 'var(--on-surface-variant)'}}>No AlphaFold confidence data available for this sequence.</div>
                )}
              </div>

              {/* Domains / PAE Inspector Panel */}
              <div className="glass-panel" style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px'}}>
                <div style={{padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(27, 43, 63, 0.3)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px'}}>
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
                          <div key={i} className="zebra-row" style={{gridTemplateColumns: '1fr 1.5fr 1fr'}}>
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
    </div>
  );
}
