---
name: Precision Bioinformatics
colors:
  surface: '#031427'
  surface-dim: '#031427'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f21'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364a'
  on-surface: '#d3e4fe'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#d3e4fe'
  inverse-on-surface: '#213145'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#001c10'
  on-tertiary-container: '#009365'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#031427'
  on-background: '#d3e4fe'
  surface-variant: '#26364a'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '450'
    lineHeight: '1.6'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  panel-padding: 20px
  container-max-width: 1600px
---

## Brand & Style

The design system is engineered for high-density scientific data visualization and molecular analysis. The brand personality is authoritative, precise, and intellectually rigorous, targeting researchers and bioinformaticians who require deep focus without visual fatigue.

The design style utilizes **Modern Glassmorphism** integrated with a **Structured Corporate** framework. By using semi-transparent containers and subtle backdrop blurs over a deep, stable background, the system makes complex, multi-paneled dashboards feel layered and navigable rather than cluttered. The aesthetic balances the cold precision of laboratory equipment with the fluid, high-tech feel of contemporary SaaS.

## Colors

The palette is anchored in a deep navy (`#0F172A`) to minimize eye strain during long research sessions. 

- **Primary & Neutral:** Uses a Slate and Navy scale to define the UI structure, maintaining a professional and stable environment.
- **Functional Mapping:** 
  - **Success:** Emerald green (`#10B981`) for completed sequence alignments and positive actions.
  - **Hydrophobicity:** A bi-polar scale from Blue (Hydrophilic) to Orange (Hydrophobic) allows for immediate visual recognition of protein properties.
  - **Confidence (pLDDT):** A gradient from Red (Low Confidence) to Blue (High Confidence) follows standard scientific visualization conventions.

## Typography

This design system employs a tiered typographic strategy:
- **Geist** is used for headings to provide a clean, technical, and modern appearance.
- **Inter** serves as the workhorse for all body copy and UI metadata, ensuring maximum legibility at small sizes.
- **JetBrains Mono** is strictly reserved for amino acid sequences, genomic data, and coordinate strings. This ensures that every character (e.g., 'I' vs 'L') is distinct, which is critical for scientific accuracy.

On mobile devices, `headline-lg` should scale down to 24px to maintain readability within dense data panels.

## Layout & Spacing

The layout follows a **Fluid Grid** system designed for 1440px+ displays, common in research environments. The grid uses a 12-column structure with 16px gutters to maximize information density while maintaining clarity.

- **Desktop:** Sidebars are fixed-width (280px) to house complex navigation and filtering, while the main viewport uses fluid panels.
- **Panels:** Data is housed in "Scientific Modules." These modules should use a consistent 20px internal padding.
- **Responsive:** On tablet, the layout reflows to a single-column sequence for data tables. On mobile, 3D visualizations should be capped at a 1:1 aspect ratio to ensure visibility.

## Elevation & Depth

This design system uses a **Glassmorphic Tonal** approach. Depth is not communicated through heavy drop shadows, but through background blur and border luminosity.

- **Level 0 (Background):** Solid `#0F172A`.
- **Level 1 (Main Panels):** Background `rgba(30, 41, 59, 0.7)` with a `backdrop-filter: blur(12px)`. Borders are 1px solid `rgba(255, 255, 255, 0.1)`.
- **Level 2 (Modals/Popovers):** Background `rgba(51, 65, 85, 0.9)` with a `backdrop-filter: blur(20px)`. Subtle 0px 4px 20px shadows are applied using a deep navy tint (`rgba(0, 0, 0, 0.4)`).
- **Interactions:** Hover states on cards should increase the border luminosity rather than changing the background color, maintaining the "glass" transparency.

## Shapes

The shape language is "Soft Professional." A base radius of 8px (Level 2) is applied to all primary containers and panels.

- **Buttons & Inputs:** 8px radius.
- **Data Cards:** 12px (rounded-lg) to distinguish them from the main layout scaffolding.
- **Sequence Tags:** 4px (rounded-sm) to keep them compact when displayed in high-frequency lists.

## Components

- **Buttons:** Primary buttons use a solid Slate-to-Navy gradient with white text. Secondary buttons are "ghost" style with a 1px border.
- **Data Chips:** Used for sequence metadata. They should have a subtle background tint corresponding to their functional category (e.g., orange tint for hydrophobic properties) with a high-contrast label.
- **Amino Acid Lists:** Use `mono-code` typography. Use alternating row highlights (zebra striping) at very low opacity (3%) to assist eye tracking.
- **Input Fields:** Dark, recessed backgrounds with a bright `secondary_color_hex` focus ring. Include clear unit labels (e.g., "Å", "nm") as fixed suffixes.
- **Confidence Gauges:** Small, linear progress bars using the Confidence (pLDDT) color scale to provide instant context for scientific results.
- **Status Indicators:** Use small, pulsing dots for "Processing Alignment" and solid emerald icons for "Success."