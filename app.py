import streamlit as st
from Bio.SeqUtils.ProtParam import ProteinAnalysis
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import requests
import json
import itertools

# --- AlphaFold Logic ---

CONFIDENT_THRESHOLD = 0.7
MODERATE_THRESHOLD = 0.4
NOTABLE_DISORDER_THRESHOLD = 0.15
MIXED_DISORDER_THRESHOLD = 0.3
MOSTLY_DISORDERED_THRESHOLD = 0.5

def analyze_plddt(entry):
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


# --- UI Setup ---

st.set_page_config(page_title="Protein Property Analyzer", layout="wide")
st.title("🧬 Automated Protein Classifier & Property Analyzer")
st.markdown("Analyze raw amino acid sequences or fetch from UniProt for structural insights via AlphaFold Database.")

input_method = st.radio("Input Method:", ("Raw Sequence", "UniProt ID"))

sequence = ""
uniprot_id = ""
afdb_entry = None
pae_analysis = None
plddt_analysis = None

if input_method == "Raw Sequence":
    sequence_input = st.text_area("Amino Acid Sequence", height=150)
    sequence = sequence_input.replace("\n", "").replace(" ", "").replace("\r", "").upper()
else:
    uniprot_id = st.text_input("Enter UniProt ID (e.g., P04637 for p53):", "").strip().upper()
    if uniprot_id:
        with st.spinner("Fetching data from UniProt and AlphaFold..."):
            # Fetch Sequence from UniProt
            fasta_resp = requests.get(f"https://rest.uniprot.org/uniprotkb/{uniprot_id}.fasta")
            if fasta_resp.status_code == 200:
                lines = fasta_resp.text.split("\n")
                sequence = "".join(lines[1:]).replace("\n", "").replace("\r", "").upper()
                
                # Fetch AlphaFold Metadata
                afdb_resp = requests.get(f"https://alphafold.ebi.ac.uk/api/prediction/{uniprot_id}")
                if afdb_resp.status_code == 200:
                    data = afdb_resp.json()
                    if data:
                        # Find canonical or longest
                        entry = next((e for e in data if e.get("uniprotAccession") == uniprot_id), None)
                        if not entry:
                            entry = max(data, key=lambda e: e.get("sequenceEnd", 0))
                        afdb_entry = entry
                        plddt_analysis = analyze_plddt(entry)
                        
                        # Fetch PAE Matrix
                        pae_url = entry.get("paeDocUrl")
                        if pae_url:
                            pae_resp = requests.get(pae_url)
                            if pae_resp.status_code == 200:
                                pae_data = pae_resp.json()[0]
                                pae_analysis = analyze_pae(pae_data)
            else:
                st.error("Failed to fetch sequence from UniProt. Please check the ID.")

if sequence:
    try:
        # Biopython Analysis
        analysis = ProteinAnalysis(sequence)
        molecular_weight = analysis.molecular_weight()
        pi = analysis.isoelectric_point()
        gravy = analysis.gravy()
        sec_struct = analysis.secondary_structure_fraction() # (helix, turn, sheet)
        aa_counts = analysis.count_amino_acids()
        
        st.subheader("📊 Basic Properties")
        col1, col2, col3 = st.columns(3)
        col1.metric("Molecular Weight", f"{molecular_weight:.2f} Da")
        col2.metric("Isoelectric Point (pI)", f"{pi:.2f}")
        classification = "Hydrophobic (Membrane)" if gravy > 0 else "Hydrophilic (Globular)"
        col3.metric("GRAVY Score", f"{gravy:.3f}", delta=classification, delta_color="off")
        
        st.subheader("🧬 Secondary Structure Tendencies")
        col4, col5, col6 = st.columns(3)
        col4.metric("Helix", f"{sec_struct[0]*100:.1f}%")
        col5.metric("Turn", f"{sec_struct[1]*100:.1f}%")
        col6.metric("Sheet", f"{sec_struct[2]*100:.1f}%")

        if afdb_entry:
            st.divider()
            st.subheader(f"🤖 AlphaFold Structural Analysis ({uniprot_id})")
            
            plddt_col, pae_col = st.columns(2)
            with plddt_col:
                st.markdown("### Confidence (pLDDT)")
                st.write(f"**Global pLDDT:** {plddt_analysis['global']:.2f}")
                st.write(f"**Fraction Confident/Very High:** {(plddt_analysis['conf'] + plddt_analysis['vhigh'])*100:.1f}%")
                st.write(f"**Fraction Low/Very Low (Disordered):** {(plddt_analysis['low'] + plddt_analysis['vlow'])*100:.1f}%")
                st.info(plddt_analysis['conclusion'])
            
            with pae_col:
                st.markdown("### Rigid Domains (PAE)")
                if pae_analysis:
                    domains = pae_analysis['domains']
                    if not domains:
                        st.write("No distinct rigidly-folded domains detected (>50 AAs).")
                    else:
                        for i, (start, end) in enumerate(domains, 1):
                            st.write(f"**Domain {i}:** residues {start} - {end} (Length: {end - start + 1} AAs)")
                    st.info(pae_analysis['conclusion'])
                else:
                    st.warning("PAE data could not be processed for domain boundaries.")

        st.divider()
        st.subheader("📈 Amino Acid Distribution")
        aa_df = pd.DataFrame(list(aa_counts.items()), columns=['Amino Acid', 'Count'])
        aa_df = aa_df.sort_values(by='Count', ascending=False)
        fig, ax = plt.subplots(figsize=(10, 4))
        sns.barplot(x='Amino Acid', y='Count', data=aa_df, palette='viridis', ax=ax)
        ax.set_ylabel("Frequency")
        ax.set_xlabel("Amino Acid")
        st.pyplot(fig)

    except ValueError as e:
        st.error("Error processing the sequence. Please ensure it only contains valid IUPAC protein letters.")
    except Exception as e:
        st.error(f"An unexpected error occurred: {e}")
