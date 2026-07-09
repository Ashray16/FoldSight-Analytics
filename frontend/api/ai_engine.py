def get_half_life(sequence: str) -> str:
    if not sequence: return "Unknown"
    n_term = sequence[0].upper()
    # Mammalian reticulocytes (in vitro) half-life estimates
    half_lives = {
        'M': '>30 hours', 'G': '>30 hours', 'A': '>30 hours', 'S': '>30 hours', 
        'T': '>30 hours', 'V': '>30 hours', 'P': '>30 hours',
        'I': '20 hours', 'E': '30 mins', 'Q': '10 mins',
        'Y': '10 mins', 'H': '10 mins', 'L': '5.5 mins',
        'F': '3 mins', 'W': '2.8 mins', 'K': '1.3 mins',
        'R': '1 min', 'D': '3 mins', 'N': '3 mins', 'C': '1.2 mins'
    }
    return half_lives.get(n_term, "Unknown")

def predict_solubility(gravy: float, pi: float, is_membrane: bool = False) -> str:
    # Basic heuristic for solubility
    if gravy > 0.5:
        return "Low (Highly Hydrophobic / Membrane)"
    elif gravy < -0.5:
        return "High (Highly Hydrophilic)"
    else:
        return "Moderate (Globular / Mixed)"

def generate_scientific_summary(properties: dict, afdb_data: dict) -> str:
    """Generates a cohesive research paragraph based on protein metrics."""
    seq_len = properties.get("length", 0)
    mw = properties.get("molecular_weight", 0) / 1000  # kDa
    pi = properties.get("pi", 7.0)
    gravy = properties.get("gravy", 0.0)
    instability = properties.get("instability_index", 0.0)
    
    summary = f"This protein is a {seq_len}-residue macromolecule with a molecular weight of approximately {mw:.1f} kDa and an isoelectric point (pI) of {pi:.2f}. "
    
    if gravy > 0.2:
        summary += f"It exhibits a positive GRAVY score ({gravy:.2f}), indicating significant hydrophobic characteristics that are strongly consistent with membrane-associated or transmembrane proteins. "
    elif gravy < -0.2:
        summary += f"It exhibits a negative GRAVY score ({gravy:.2f}), suggesting a highly hydrophilic nature typical of soluble, cytosolic proteins. "
    else:
        summary += f"The near-neutral GRAVY score ({gravy:.2f}) suggests a balanced amphipathic character, typical of globular proteins. "
        
    if instability < 40:
        summary += f"With an instability index of {instability:.1f}, the protein is predicted to be structurally stable in vitro. "
    else:
        summary += f"The elevated instability index of {instability:.1f} indicates that the protein may be prone to rapid degradation or instability in vitro. "
        
    if afdb_data and afdb_data.get("plddt"):
        plddt = afdb_data["plddt"]
        conf = plddt.get("global", 0)
        vlow = plddt.get("vlow", 0)
        
        if conf > 80:
            summary += f"AlphaFold predicts the tertiary structure with high overall confidence (average pLDDT {conf:.1f}), suggesting a well-defined native fold. "
        elif conf > 60:
            summary += f"AlphaFold predicts the structure with moderate confidence (average pLDDT {conf:.1f}), which may reflect some conformational flexibility. "
        else:
            summary += f"The low overall AlphaFold confidence (average pLDDT {conf:.1f}) strongly implies that the sequence may be intrinsically disordered or lacks a stable tertiary structure in isolation. "
            
        if vlow > 0.2:
            summary += f"Notably, {(vlow*100):.1f}% of the sequence is predicted with very low confidence, which often corresponds to functionally important intrinsically disordered regions (IDRs) or flexible linkers."
            
    if afdb_data and afdb_data.get("pae"):
        domains = afdb_data["pae"].get("domains", [])
        if len(domains) > 1:
            summary += f" Furthermore, Predicted Aligned Error (PAE) analysis reveals a multi-domain architecture consisting of {len(domains)} distinct structural domains separated by inter-domain joints."
        elif len(domains) == 1:
            summary += " PAE analysis indicates a single, rigidly folded composite domain architecture."
            
    return summary
