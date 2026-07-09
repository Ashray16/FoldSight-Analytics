from Bio.SeqUtils.ProtParam import ProteinAnalysis

def get_stability_metrics(sequence: str):
    try:
        analysis = ProteinAnalysis(sequence)
        instability = analysis.instability_index()
        extinction_dict = analysis.molar_extinction_coefficient()
        # Biopython returns a tuple (reduced, oxidized) or dict. Actually it returns a tuple of (Cys-reduced, Cys-oxidized)
        ext_reduced = extinction_dict[0]
        ext_oxidized = extinction_dict[1]
        
        # Aliphatic index: (Ala + 2.9 * Val + 3.9 * (Ile + Leu)) / len(seq) * 100
        aa_counts = analysis.count_amino_acids()
        aliphatic_index = (aa_counts.get('A', 0) + 2.9 * aa_counts.get('V', 0) + 3.9 * (aa_counts.get('I', 0) + aa_counts.get('L', 0))) / len(sequence) * 100
        
        return {
            "instability_index": round(instability, 2),
            "aliphatic_index": round(aliphatic_index, 2),
            "extinction_coefficient": {
                "reduced": ext_reduced,
                "oxidized": ext_oxidized
            }
        }
    except Exception as e:
        return str(e)

seq = "MTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTIEDSYRKQVVIDGETCLLDILDTAGQEEYSAMRDQYMRTGEGFLCVFAINNTKSFEDIHQYREQIKRVKDSDDVPMVLVGNKCDLAARTVESRQAQDLARSYGIPYIETSAKTRQGVEDAFYTLVREIRQHKLRKLNPPDESGPGCMSCKCVLS"
print(get_stability_metrics(seq))
