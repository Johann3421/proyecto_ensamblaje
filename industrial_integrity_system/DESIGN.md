---
name: Industrial Integrity System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#49607e'
  primary: '#000f22'
  on-primary: '#ffffff'
  primary-container: '#0a2540'
  on-primary-container: '#768dad'
  inverse-primary: '#b0c8eb'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#001304'
  on-tertiary: '#ffffff'
  tertiary-container: '#002b0e'
  on-tertiary-container: '#00a148'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#b0c8eb'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#314865'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is engineered for precision, reliability, and high-stakes decision-making within quality control environments. The brand personality is authoritative yet unobtrusive, prioritizing functional clarity over decorative flair. 

The aesthetic follows a **Modern Corporate** approach with **Minimalist** leanings to ensure technicians and administrators can process dense technical data without cognitive overload. The interface uses high-contrast ratios and a structured grid to evoke a sense of "industrial-grade" stability. The emotional response should be one of confidence, order, and rigorous accuracy.

## Colors

The palette is anchored by **Deep Tech Blue**, used for primary actions and structural navigation to establish a professional foundation. **Success Green** is reserved strictly for affirmative states, such as passed inspections or completed batches. **Industrial Gray** provides a neutral bridge for secondary information and borders.

The background uses a high-reflectance light gray to minimize screen glare in bright workshop or factory settings. Text contrast must always meet WCAG AA standards at minimum to ensure legibility on mobile devices used under varied lighting conditions.

## Typography

This design system utilizes **Inter** for all UI elements due to its tall x-height and exceptional legibility at small sizes. For technical data, serial numbers, or measurement values, an optional monospaced secondary font (JetBrains Mono) may be used to prevent character confusion (e.g., '0' vs 'O').

Hierarchy is strictly enforced: 
- Use **Bold** weights for status labels and critical alerts.
- Use **Medium/Regular** for instructional text.
- Headlines are kept compact to maximize information density on screen.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop administration dashboards and a **single-column stack** for mobile technician views. A 4px baseline grid ensures vertical rhythm.

On mobile, touch targets are prioritized, with a minimum height of 48px for all interactive elements. Content should be grouped into logical "Task Blocks" to allow technicians to focus on one check at a time. Desktop views should utilize side-drawers for detail views to maintain the context of the main data table.

## Elevation & Depth

To maintain a clean, industrial feel, this design system avoids heavy shadows. Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**:

- **Surface Level 0 (Background):** #F8FAFC (Light Gray).
- **Surface Level 1 (Cards/Containers):** #FFFFFF (Pure White) with a 1px border of #E2E8F0.
- **Surface Level 2 (Modals/Popovers):** Pure White with a subtle, 8px blur, 10% opacity black shadow to lift the element from the workspace.

Interactions are indicated via color shifts rather than shadow changes to ensure visibility on low-quality mobile panels.

## Shapes

The design system uses a **Soft (0.25rem)** roundedness approach. This provides a modern touch while maintaining the "engineered" feel of the system. 

- **Small Components (Buttons, Inputs):** 4px radius.
- **Medium Components (Cards, Modals):** 8px radius.
- **Large Components (Full-screen containers):** 12px radius.

Status indicators and badges use a slightly higher roundedness (pill-shape) to distinguish them from functional inputs.

## Components

### Buttons
- **Primary:** Deep Tech Blue (#0A2540) with White text. Solid fill.
- **Secondary:** White background with Industrial Gray (#64748B) border.
- **Success:** Solid Green (#22C55E) only for final submission or "Pass" actions.

### Inspection Rows
Rows should be high-density with clear checkboxes. Use a "Hover/Active" state that highlights the entire row in a light blue tint (#F1F5F9). If a check fails, the row background should shift to a light red tint.

### Status Chips
Pill-shaped badges with high-contrast text. 
- *Passed:* Green background, Dark Green text.
- *Pending:* Gray background, Dark Gray text.
- *Flagged:* Amber background, Dark Amber text.

### Input Fields
Strict rectangular forms with 1px borders. Focused states must use a 2px Deep Tech Blue border for high visibility. Include clear "Unit" labels (e.g., kg, mm, psi) fixed to the right side of the input.

### Data Cards
Cards should include a "Header" area for the Part Number or ID and a "Content" area for metrics. Use a top-border accent color to indicate the overall status of the item within the card.