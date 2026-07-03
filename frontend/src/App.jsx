import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          No 3D structure available. Enter a UniProt ID.
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
        backgroundColor: '#ff7f00',
        borderRadius: 4
      }],
    };

    const hData = {
      labels: hydroData.map((_, i) => i+1),
      datasets: [{
        label: 'Score',
        data: hydroData,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
            x: { ticks: {color: '#888'}, grid: {color: '#333'} },
            y: { ticks: {color: '#888'}, grid: {color: '#333'} }
        }
    };

    const hydroChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: {color: '#888'}, grid: {color: '#333'} },
            y: { ticks: {color: '#888'}, grid: {color: '#333'} }
        }
    };

    return (
      <>
        <div className="card chart-card">
          <div className="card-title">Amino Acid Composition</div>
          <div style={{flex: 1, position: 'relative'}}>
            <Bar data={aaData} options={aaChartOptions} />
          </div>
        </div>
        <div className="card chart-card">
          <div className="card-title">Hydrophobicity Profile (Kyte-Doolittle)</div>
          <div style={{flex: 1, position: 'relative'}}>
            <Line data={hData} options={hydroChartOptions} />
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="brand">
          <span>🧬</span> FoldSight Analytics
        </div>
        
        {/* Input Controls */}
        <div className="sidebar-section">
          <div className="sidebar-title">New Analysis</div>
          
          <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
             <label style={{fontSize: '0.8rem', color: inputType === 'uniprot' ? 'var(--primary-orange)' : 'var(--text-secondary)'}}>
               <input type="radio" checked={inputType==='uniprot'} onChange={()=>setInputType('uniprot')} style={{marginRight: '0.2rem'}}/> UniProt
             </label>
             <label style={{fontSize: '0.8rem', color: inputType === 'sequence' ? 'var(--primary-orange)' : 'var(--text-secondary)'}}>
               <input type="radio" checked={inputType==='sequence'} onChange={()=>setInputType('sequence')} style={{marginRight: '0.2rem'}}/> Sequence
             </label>
          </div>
          
          <input 
            type="text" 
            className="sidebar-input"
            placeholder={inputType === 'uniprot' ? 'e.g. P04637' : 'e.g. MNGTE...'} 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
          />
          
          <label className="file-upload-label">
            📁 Upload FASTA File
            <input type="file" accept=".fasta,.txt,.seq" onChange={handleFileUpload} />
          </label>
          
          <button className="btn-run" onClick={() => handleAnalyze()} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Analysis 🚀'}
          </button>
        </div>

        {/* Interactive Parameters */}
        <div className="sidebar-section">
          <div className="sidebar-title">Analysis Parameters</div>
          
          <div className="slider-container">
             <label>Hydrophobicity Window <span>{windowSize}</span></label>
             <input type="range" min="5" max="21" step="2" value={windowSize} onChange={(e) => setWindowSize(e.target.value)} />
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
             <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>3D View Style</label>
             <select className="style-select" value={styleMode} onChange={e => setStyleMode(e.target.value)}>
                <option value="cartoon">Cartoon / Ribbon</option>
                <option value="stick">Ball and Stick</option>
                <option value="sphere">Space Filling</option>
                <option value="surface">Molecular Surface</option>
             </select>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-title">Recent Searches</div>
            {history.map(h => (
              <button key={h.id} className="history-item" onClick={() => handleAnalyze(h.type, h.value)}>
                {h.type === 'uniprot' ? '🆔 ' : '🧬 '}{h.value}
              </button>
            ))}
          </div>
        )}

        {/* Developer Section */}
        <div className="sidebar-section dev-portfolio">
          <div className="sidebar-title" style={{color: 'var(--text-primary)'}}>Developer Portfolio</div>
          <a href="https://github.com/Ashray16" target="_blank" rel="noreferrer" className="dev-link">
            <span>👾</span> GitHub Profile
          </a>
          <a href="https://linkedin.com/in/ashray-gupta-81312b2aa" target="_blank" rel="noreferrer" className="dev-link">
            <span>💼</span> LinkedIn Profile
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="top-bar">
          <div>
            <h1 className="page-title">{results?.protein_name ? results.protein_name : 'Protein Dashboard'}</h1>
            <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
               {results?.uniprot_id ? `UniProt ID: ${results.uniprot_id}` : 'At a glance summary of your selected protein.'}
            </div>
          </div>
          <button className="btn-secondary" onClick={exportCSV} disabled={!results}>Export Report to CSV</button>
        </div>

        {error && <div style={{color: '#ff4444', marginBottom: '1.5rem', fontWeight: 600, padding: '1rem', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid #ff4444'}}>{error}</div>}

        {results ? (
          <div className="grid-layout">
            
            <div className="card card-small">
              <div className="card-title">Molecular Weight</div>
              <div className="card-value">{(results.properties.molecular_weight).toFixed(2)}</div>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem'}}>Daltons (Da)</div>
            </div>
            
            <div className="card card-small">
              <div className="card-title">Isoelectric Point</div>
              <div className="card-value">{(results.properties.pi).toFixed(2)}</div>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem'}}>pH Level</div>
            </div>
            
            <div className="card card-small" style={{
                borderTop: `4px solid ${results.properties.gravy > 0 ? '#ff7f00' : '#3b82f6'}`, 
                boxShadow: `0 8px 32px 0 ${results.properties.gravy > 0 ? 'rgba(255, 127, 0, 0.15)' : 'rgba(59, 130, 246, 0.15)'}`
            }}>
              <div className="card-title">GRAVY Score</div>
              <div className="card-value">{results.properties.gravy.toFixed(3)}</div>
              <div style={{color: results.properties.gravy > 0 ? '#ff7f00' : '#3b82f6', fontWeight: 600, marginTop: '0.5rem'}}>{results.properties.classification}</div>
            </div>

            <div className="card card-small">
              <div className="card-title">Sec. Structure</div>
              <div className="card-value">{(results.secondary_structure.helix*100).toFixed(0)}% <span style={{fontSize:'1rem'}}>H</span></div>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem'}}>{(results.secondary_structure.sheet*100).toFixed(0)}% Sheets, {(results.secondary_structure.turn*100).toFixed(0)}% Turns</div>
            </div>

            <div className="card viewer-card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <div>
                  <div className="card-title">3D Structure (AlphaFold)</div>
                  {results.alphafold?.plddt && (
                     <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                       pLDDT: {results.alphafold.plddt.global.toFixed(1)} — {results.alphafold.plddt.conclusion}
                     </div>
                  )}
                </div>
              </div>
              
              <div style={{flex: 1, background: '#0E1117', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden'}}>
                 <Viewer3D cifUrl={results?.cif_url} sequence={results?.sequence} styleMode={styleMode} />
              </div>
            </div>

            {renderCharts()}

          </div>
        ) : (
          <div className="card" style={{gridColumn: 'span 4', alignItems: 'center', justifyContent: 'center', height: '500px'}}>
             <h2 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>Welcome to FoldSight Analytics</h2>
             <p style={{color: 'var(--text-secondary)'}}>Use the controls in the sidebar to upload a FASTA file or enter a UniProt ID.</p>
          </div>
        )}
      </div>
      <SpeedInsights />
    </div>
  );
}
