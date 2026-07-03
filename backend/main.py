import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from Bio.SeqUtils.ProtParam import ProteinAnalysis
import requests
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

app = FastAPI()

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
allowed_origins = allowed_origins_env.split(",") if allowed_origins_env else ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    sequence: Optional[str] = Field(None, max_length=10000, description="Raw amino acid sequence")
    uniprot_id: Optional[str] = Field(None, pattern=r"^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$|^[O,P,Q][0-9][A-Z0-9]{3}[0-9]$", description="UniProt Accession ID")
    window_size: Optional[int] = Field(9, ge=3, le=41)

class HydroRequest(BaseModel):
    sequence: str = Field(..., max_length=10000)
    window_size: int = Field(9, ge=3, le=41)

@app.post("/api/hydrophobicity")
@limiter.limit("5/minute")
def calculate_hydrophobicity(request: Request, req: HydroRequest):
    if not req.sequence:
        raise HTTPException(status_code=400, detail="Empty sequence")
    return {"hydrophobicity_plot": get_hydrophobicity_plot(req.sequence, req.window_size)}

# Kyte-Doolittle scale
KD_SCALE = {
    'A': 1.8, 'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
    'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
    'L': 3.8, 'K': -3.9, 'M': 1.9, 'F': 2.8, 'P': -1.6,
    'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
}

def get_hydrophobicity_plot(sequence: str, window: int = 9) -> List[float]:
    scores = []
    for i in range(len(sequence) - window + 1):
        window_seq = sequence[i:i+window]
        score = sum(KD_SCALE.get(aa, 0) for aa in window_seq) / window
        scores.append(round(score, 3))
    return scores

# --- AlphaFold Logic ---
CONFIDENT_THRESHOLD = 0.7
MODERATE_THRESHOLD = 0.4
NOTABLE_DISORDER_THRESHOLD = 0.15
MIXED_DISORDER_THRESHOLD = 0.3
MOSTLY_DISORDERED_THRESHOLD = 0.5

def analyze_plddt(entry: Dict[str, Any]) -> Dict[str, Any]:
    global_plddt = entry.get("globalMetricValue", 0.0)
    frac_vlow = entry.get("fractionPlddtVeryLow", 0.0)
    frac_low = entry.get("fractionPlddtLow", 0.0)
    frac_conf = entry.get("fractionPlddtConfident", 0.0)
    frac_vhigh = entry.get("fractionPlddtVeryHigh", 0.0)
    
    conf_total = frac_conf + frac_vhigh
    if conf_total >= CONFIDENT_THRESHOLD:
        if frac_vlow > NOTABLE_DISORDER_THRESHOLD:
            conclusion = "Protein is mostly confidently predicted, but contains notable disordered regions."
        else:
            conclusion = "Protein is confidently predicted and likely fully ordered/structured."
    elif conf_total >= MODERATE_THRESHOLD:
        if frac_vlow >= MIXED_DISORDER_THRESHOLD:
            conclusion = "Protein has a mixture of confidently predicted structured domains and significant intrinsically disordered regions."
        else:
            conclusion = "Protein has moderate prediction confidence. Certain regions might be flexible or poorly predicted."
    else:
        if frac_vlow >= MOSTLY_DISORDERED_THRESHOLD:
            conclusion = "Protein is mostly poorly predicted, likely being highly intrinsically disordered."
        else:
            conclusion = "Protein prediction is of low confidence overall."
            
    return {
        "global": global_plddt,
        "vlow": frac_vlow,
        "low": frac_low,
        "conf": frac_conf,
        "vhigh": frac_vhigh,
        "conclusion": conclusion
    }

def find_sub_domains(pae_matrix, distance_cutoff=7.0, min_domain_size=40):
    n_res = len(pae_matrix)
    domains = []
    current_domain = []

    for i in range(n_res):
        if not current_domain:
            current_domain.append(i)
            continue
        window_size = min(20, len(current_domain))
        recent_res = current_domain[-window_size:]
        pae_sum = sum(pae_matrix[r][i] + pae_matrix[i][r] for r in recent_res)
        avg_pae = pae_sum / (2.0 * window_size)

        if avg_pae < distance_cutoff:
            current_domain.append(i)
        else:
            if len(current_domain) >= min_domain_size:
                domains.append(current_domain)
            current_domain = [i]

    if len(current_domain) >= min_domain_size:
        domains.append(current_domain)

    domain_boundaries = []
    for comp in domains:
        start = comp[0] + 1
        end = comp[-1] + 1
        domain_boundaries.append([start, end])
    return domain_boundaries

def merge_global_domains(boundaries, pae_matrix, merge_cutoff=15.0):
    if not boundaries:
        return []
    if len(boundaries) == 1:
        merged = boundaries
    else:
        merged = [boundaries[0]]
        for i in range(1, len(boundaries)):
            prev_end = merged[-1][1] - 1
            curr_start = boundaries[i][0] - 1
            lookback = max(merged[-1][0] - 1, prev_end - 30)
            lookfwd = min(boundaries[i][1] - 1, curr_start + 30)
            pae_sum = 0
            n_pairs = 0
            for r1 in range(lookback, prev_end + 1):
                for r2 in range(curr_start, lookfwd + 1):
                    pae_sum += pae_matrix[r1][r2] + pae_matrix[r2][r1]
                    n_pairs += 2
            if n_pairs > 0 and (pae_sum / n_pairs) < merge_cutoff:
                merged[-1][1] = boundaries[i][1]
            else:
                merged.append(boundaries[i])
    filtered_merged = [dom for dom in merged if (dom[1] - dom[0] + 1) > 50]
    return filtered_merged

def analyze_pae(pae_data):
    if "predicted_aligned_error" in pae_data:
        pae = pae_data["predicted_aligned_error"]
    elif "distance" in pae_data:
        pae = pae_data["distance"]
    else:
        return None

    sub_domains = find_sub_domains(pae, distance_cutoff=7.0, min_domain_size=40)
    global_domains = merge_global_domains(sub_domains, pae, merge_cutoff=15.0)

    if len(global_domains) == 1:
        conclusion = "The protein consists of a single well-folded, rigid composite domain."
    elif len(global_domains) > 1:
        conclusion = f"The protein has {len(global_domains)} independently positioned global domains separated by flexible joints."
    else:
        conclusion = "The protein is likely entirely disordered or lacks rigid tertiary structure."

    return {
        "domains": global_domains,
        "conclusion": conclusion
    }

@app.post("/api/analyze")
@limiter.limit("5/minute")
def analyze_protein(request: Request, req: AnalyzeRequest):
    sequence = ""
    uniprot_id = req.uniprot_id
    afdb_data = None
    pae_data_result = None
    plddt_result = None
    cif_url = None

    if req.uniprot_id:
        uniprot_id = req.uniprot_id.strip().upper()
        fasta_resp = requests.get(f"https://rest.uniprot.org/uniprotkb/{uniprot_id}.fasta")
        if fasta_resp.status_code == 200:
            lines = fasta_resp.text.split("\n")
            sequence = "".join(lines[1:]).replace("\n", "").replace("\r", "").upper()
            
            afdb_resp = requests.get(f"https://alphafold.ebi.ac.uk/api/prediction/{uniprot_id}")
            if afdb_resp.status_code == 200:
                data = afdb_resp.json()
                if data:
                    entry = next((e for e in data if e.get("uniprotAccession") == uniprot_id), None)
                    if not entry:
                        entry = max(data, key=lambda e: e.get("sequenceEnd", 0))
                    
                    cif_url = entry.get("cifUrl")
                    plddt_result = analyze_plddt(entry)
                    
                    pae_url = entry.get("paeDocUrl")
                    if pae_url:
                        pae_resp = requests.get(pae_url)
                        if pae_resp.status_code == 200:
                            pae_data = pae_resp.json()[0]
                            pae_data_result = analyze_pae(pae_data)
        else:
            raise HTTPException(status_code=400, detail="Invalid UniProt ID or not found.")
    elif req.sequence:
        sequence = req.sequence.replace("\n", "").replace(" ", "").replace("\r", "").upper()
    else:
        raise HTTPException(status_code=400, detail="Provide either sequence or uniprot_id")

    if not sequence:
        raise HTTPException(status_code=400, detail="Empty sequence")

    try:
        analysis = ProteinAnalysis(sequence)
        molecular_weight = analysis.molecular_weight()
        pi = analysis.isoelectric_point()
        gravy = analysis.gravy()
        sec_struct = analysis.secondary_structure_fraction()
        aa_counts = analysis.count_amino_acids()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error analyzing sequence: {str(e)}")
        
    hydro_plot = get_hydrophobicity_plot(sequence, req.window_size)

    return {
        "sequence": sequence,
        "uniprot_id": uniprot_id,
        "cif_url": cif_url,
        "properties": {
            "molecular_weight": molecular_weight,
            "pi": pi,
            "gravy": gravy,
            "classification": "Hydrophobic (Membrane)" if gravy > 0 else "Hydrophilic (Globular)"
        },
        "secondary_structure": {
            "helix": sec_struct[0],
            "turn": sec_struct[1],
            "sheet": sec_struct[2]
        },
        "amino_acid_counts": aa_counts,
        "hydrophobicity_plot": hydro_plot,
        "alphafold": {
            "plddt": plddt_result,
            "pae": pae_data_result
        }
    }
