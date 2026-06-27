import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// 3Dmol.js React wrapper component adapted for stark editorial rendering
const Viewer3D = ({ cifUrl, sequence }) => {
  const containerRef = useRef();
  const viewerRef = useRef();

  const applyEditorialStyle = (viewer) => {
    viewer.removeAllSurfaces();
    viewer.setStyle({}, {}); 
    
    // Stark, flat architectural massing look (Monolithic Charcoal)
    viewer.addSurface(window.$3Dmol.VDW, {opacity: 1.0, color: '#222222'});
    
    // Keep the interactive hover tooltips, but style them to match the editorial theme
    viewer.setHoverable({}, true, 
      function(atom, viewer, event, container) {
        if (!atom.label) {
          atom.label = viewer.addLabel(atom.resn + " " + atom.resi, {
            position: atom,
            backgroundColor: '#EFEAE0',
            fontColor: '#222222',
            fontSize: 11,
            backgroundOpacity: 1.0,
            borderThickness: 1.0,
            borderColor: '#222222'
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
    if (!window.$3Dmol) return;
    if (!viewerRef.current) {
      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, { backgroundColor: 'transparent' });
    }
    
    const viewer = viewerRef.current;
    viewer.clear();

    if (cifUrl) {
      axios.get(cifUrl).then(res => {
        viewer.addModel(res.data, "cif");
        applyEditorialStyle(viewer);
        viewer.zoomTo();
        viewer.render();
      }).catch(err => console.error("Error loading CIF:", err));
    } else if (sequence) {
      // Just showing a placeholder if no structure
    }

    return () => viewer.clear();
  }, [cifUrl, sequence]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />;
};

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`http://localhost:8000/api/analyze/uniprot?uniprot_id=${query}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
      setError('Analysis failed.');
    }
    setLoading(false);
  };

  return (
    <div className="editorial-container">
      
      {/* Top Margin Header (Replaces Sidebar) */}
      <div className="header-margin">
        <div className="brand-bold">DUNE / STUDIO <span style={{fontWeight: 400, marginLeft: '1rem', textTransform: 'lowercase', fontStyle: 'italic', color: 'var(--text-muted)'}}>— quiet architecture</span></div>
        
        <div className="minimal-controls">
          <input 
            type="text" 
            className="minimal-input" 
            placeholder="Enter UniProt ID (e.g. P04637)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runAnalysis()}
          />
          <button className="minimal-btn" onClick={runAnalysis}>
            {loading ? 'Analyzing...' : 'Render Structure'}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="main-grid">
        
        {/* Left Side: Editorial Typography */}
        <div className="text-content">
          <div className="project-meta">— PROJECT 09 / {results ? results.id : 'ATELIER NO. 4'}</div>
          
          <h1 className="headline">
            A house <br />
            <i>made of light</i> <br />
            and pauses.
          </h1>
          
          <div className="chinese-text">
            一座建造时长 28 个月、室内只用两种材料、开窗朝向只考虑两个时刻（清晨 6:40，黄昏 18:10）的住宅。我们叫它 Atelier No. 4.
          </div>
          
          {error && <div style={{color: 'red', marginTop: '2rem', fontSize: '0.8rem'}}>{error}</div>}
        </div>

        {/* Right Side: Architectural Elevation Diagram (3D Viewer) */}
        <div className="diagram-wrapper">
          <div className="diagram-box">
            
            {/* Blueprint Header */}
            <div className="diagram-header">
              <span>North Elevation</span>
              <span>1 : 200</span>
            </div>
            
            {/* The actual 3D Viewer embedded in the crosshairs */}
            <div className="diagram-content">
              {results ? (
                <Viewer3D cifUrl={results.cif_url} sequence={results.sequence} />
              ) : (
                <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <span style={{fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px'}}>Awaiting input...</span>
                </div>
              )}
            </div>

            {/* Blueprint Annotations */}
            <div className="diagram-y-axis">Grade ± 0.000</div>
            <div className="diagram-footer">Sun · 18°</div>
          </div>
        </div>

      </div>

      {/* Bottom Margin Footer */}
      <div className="footer-margin">
        <div>DUNE STUDIO · FOUNDED 2017</div>
        <div style={{textAlign: 'right'}}>
          {results ? (
            <>MW: {results.properties.molecular_weight.toFixed(2)} Da &nbsp;&nbsp;·&nbsp;&nbsp; PI: {results.properties.isoelectric_point.toFixed(2)} &nbsp;&nbsp;·&nbsp;&nbsp; GRAVY: {results.properties.gravy.toFixed(3)}</>
          ) : (
            <>PROJECT NO. 09 · 2024-2026</>
          )}
        </div>
      </div>

    </div>
  );
}

export default App;
