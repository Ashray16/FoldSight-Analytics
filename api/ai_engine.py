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

def generate_scientific_summary(properties: dict, afdb_data: dict) -> dict:
    """Generates cohesive research paragraphs separated into sections based on protein metrics."""
    seq_len = properties.get("length", 0)
    mw = properties.get("molecular_weight", 0) / 1000  # kDa
    pi = properties.get("pi", 7.0)
    gravy = properties.get("gravy", 0.0)
    instability = properties.get("instability_index", 0.0)
    
    # 1. Overview
    overview = f"The analyzed protein consists of {seq_len} amino acid residues with a calculated molecular weight of {mw:.1f} kDa and an isoelectric point (pI) of {pi:.2f}."
    
    # 2. Biological Interpretation
    bio = ""
    if gravy > 0.2:
        bio += f"The positive GRAVY score ({gravy:.2f}) indicates an overall hydrophobic character, suggesting a probable membrane-associated or transmembrane localization. "
    elif gravy < -0.2:
        bio += f"The negative GRAVY score ({gravy:.2f}) indicates an overall hydrophilic character, suggesting a soluble protein under physiological conditions. "
    else:
        bio += f"The near-neutral GRAVY score ({gravy:.2f}) points to an amphipathic character typically associated with globular proteins. "
        
    if instability < 40:
        bio += f"An instability index of {instability:.1f} predicts the protein maintains structural stability in vitro."
    else:
        bio += f"An instability index of {instability:.1f} suggests limited intrinsic stability in vitro, indicating it may be prone to rapid degradation."
        
    # 3. Structural Assessment
    struct_str = ""
    if afdb_data and afdb_data.get("plddt"):
        plddt = afdb_data["plddt"]
        conf = plddt.get("global", 0)
        vlow = plddt.get("vlow", 0)
        
        if conf > 80:
            struct_str += f"AlphaFold confidence scores (average pLDDT = {conf:.1f}) indicate a highly reliable tertiary structure with a predominantly ordered conformation. "
        elif conf > 60:
            struct_str += f"AlphaFold predicts the structure with moderate confidence (average pLDDT = {conf:.1f}), reflecting potential conformational flexibility in certain domains. "
        else:
            struct_str += f"The low overall AlphaFold confidence (average pLDDT = {conf:.1f}) strongly implies a high degree of intrinsic disorder or a lack of stable tertiary structure in isolation. "
            
        if vlow > 0.2:
            struct_str += f"Importantly, a substantial portion ({(vlow*100):.1f}%) of the sequence is predicted with very low confidence, corresponding to putative intrinsically disordered regions (IDRs). "
            
    if afdb_data and afdb_data.get("pae"):
        domains = afdb_data["pae"].get("domains", [])
        if len(domains) > 1:
            struct_str += f"Domain analysis based on Predicted Aligned Error (PAE) supports a multi-domain structural organization comprising {len(domains)} distinct rigid bodies."
        elif len(domains) == 1:
            struct_str += "Domain analysis based on Predicted Aligned Error (PAE) supports a compact, single-domain structural organization."
            
    if not struct_str:
        struct_str = "No structural prediction data is available for this sequence."
        
    return {
        "overview": overview.strip(),
        "biological": bio.strip(),
        "structural": struct_str.strip()
    }
