IndiYatra Design System Specification

1. Design Philosophy
The IndiYatra platform prioritizes clarity, readability, and a professional aesthetic suited for an educational learning platform. Maintain consistent spacing, hierarchy, and color usage across all modules.

2. Color Palette (CSS Variables)
Use these variables exclusively for styling to maintain brand integrity:

CSS

:root {
  /* Branding Colors */
  --color-primary: #00509E;      /* Heritage Blue */
  --color-secondary: #00924A;    /* Cultural Green */
  --color-accent: #FF8E00;       /* Saffron Orange */
  
  /* Backgrounds & UI */
  --color-bg-body: #FFFFFF;      /* Main Background */
  --color-bg-alt: #B5D7D5;       /* Feature Section Background */
  --color-surface: #FEF7FF;      /* Button Text/Surface */
  
  /* Text and Neutral */
  --color-text-main: #101828;    /* Primary Headlines */
  --color-text-body: #4A5565;    /* Secondary/Descriptive Text */
  --color-text-muted: #6B6B6B;   /* Muted/meta text — the ONE muted grey */
  --color-border: #E5E7EB;       /* Borders and Dividers */
  --color-border-muted: #F3F4F6; /* Sub-dividers */

  /* Semantic */
  --color-danger: #c62828;       /* Errors, destructive actions */
  --color-browse: #4AADA8;       /* Course-browsing chrome ONLY (legalised teal).
                                    Usage rule: card footers / section markers on
                                    course-browsing surfaces. Never for progress,
                                    success, or rewards (that is --color-secondary). */
}

Rule: use tokens, not hex. New code must reference these CSS variables
(var(--color-…), var(--text-…), var(--radius), var(--space-…)); raw hex literals
in src/ are lint-gated (roadmap 5.7). The full token sheet, including the
5-role type scale (--text-xs/sm/base/lg/xl/hero), radii, spacing and button
shadow, lives in src/index.css — the single source of truth.

3. Typography System
Assign these font families and properties based on the element type:

Role Font Family Weight Size Line Height
Hero Headings Oswald 700 50px 72px 
Section Headings Oswald 500 32px/40px 125%
Card Titles Nunito Sans 700 20px 125%
Body Text Nunito Sans 400 16px 150%/24px
UI/Buttons/Meta Inter 500 14px/16px 20px/24px

4.Component Standards
Buttons
Border Radius: 12px
Box Shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02)
Layout: display: flex; justify-content: center; align-items: center;
Padding: 12px 20px (standard), 10px 16px (navbar/compact).

Cards
Border: 1px solid var(--color-border)
Border Radius: 12px
Padding: 24px
Gap: 24px
Image Radius: 10px

5. Layout & Spacing Rules
Container Widths: Standardize page width at 1440px (or relative containers).
Flexbox Layouts: Use display: flex and gap properties for all component alignment (as defined in original Figma Auto Layout).
Spacing: Consistent use of 24px for internal component padding and card gaps.
Units: Use rem for accessibility (1rem = 16px base font size). Convert pixel values from design files accordingly.

6. Development Instructions
Reference: Always refer back to this file when creating new pages or components.
Consistency: Ensure all "Card" structures share the same border, shadow, and padding defined above.
Responsiveness: When defining fixed widths (e.g., 1440px), ensure the container is responsive or centered using margin: 0 auto;.
No Inventions: Do not invent new brand colors; if a color is needed, approximate it using the existing palette or ask for clarification.