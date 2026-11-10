---
name: LifeAdmin
description: Calm, personal life-management platform with editorial typography and an attention-first architecture
colors:
  primary: "#087e83"
  primary-deep: "#066568"
  primary-soft: "#ddf1ef"
  primary-dark: "#55bdb5"
  primary-dark-deep: "#4aa8a1"
  neutral-bg-light: "#f5f7f5"
  neutral-surface-light: "#ffffff"
  neutral-surface-secondary-light: "#e8f2f0"
  neutral-text-main-light: "#1d3032"
  neutral-text-secondary-light: "#526967"
  neutral-text-muted-light: "#687f7d"
  neutral-border-light: "#e1e9e6"
  neutral-bg-dark: "#183b4a"
  neutral-surface-dark: "#204b5a"
  neutral-surface-elevated-dark: "#285968"
  neutral-surface-sidebar-dark: "#143440"
  neutral-text-main-dark: "#f1f7f7"
  neutral-text-secondary-dark: "#c5ddde"
  neutral-text-muted-dark: "#a7c5c8"
  neutral-border-dark: "#355966"
  urgency-critical: "#ef4444"
  urgency-urgent: "#f97316"
  urgency-soon: "#f59e0b"
  urgency-upcoming: "#168f91"
  urgency-completed: "#10b981"
typography:
  display:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0em"
  headline:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface-light}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface-secondary-light}"
    textColor: "{colors.neutral-text-main-light}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.neutral-surface-light}"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: LifeAdmin

## Overview

**Creative North Star: "The Editorial Sanctuary"**

LifeAdmin is designed as a calm, personal administrative sanctuary. Rather than mimicking noisy enterprise dashboards or generic corporate project management tools, LifeAdmin blends the quiet dignity of a high-end publication with the modern rigor of focused productivity software. It serves college students and young professionals who face fragmented, high-friction responsibilities—turning panic-inducing deadlines into structured, unhurried next actions.

The interface pairs Coastal Ocean Teal with warm, organic surfaces in light mode and deep, atmospheric maritime tones in dark mode. Typography balances the literary elegance of DM Serif Display for reflective greetings and titles with the engineered legibility of Inter for high-density controls and status tracking. Every element conveys intentional composure: generous white space, restrained elevation, and purposeful contrast that highlights what needs immediate attention while allowing routine tasks to sit quietly in the background.

**Key Characteristics:**

- **Editorial Typography Pairing**: Expressive literary serif headers grounded by crisp, systematic sans-serif controls.
- **Atmospheric Dual-Theme Palette**: Coastal seafoam and soft sage in light mode; deep abyssal ocean navy in dark mode.
- **Attention-First Spatial Model**: Information grouped by urgency and deadline proximity rather than chronological dumps.
- **Tactile Restraint**: Subtle 1px borders, smooth 12–16px rounded corners, and soft ambient shadows that appear primarily on state change.

## Colors

The palette draws from maritime and coastal environments, balancing soothing natural tones with punchy functional urgency indicators.

### Primary

- **Coastal Ocean Teal** (`#087e83`): Used for primary interactive actions, key active states, brand marks, and prominent indicators in light mode.
- **Deep Ocean Teal** (`#066568`): Interactive hover states and emphasized text links in light mode.
- **Phosphor Lagoon Teal** (`#55bdb5`): Primary interactive accent, key focus rings, and active indicators in dark mode.
- **Phosphor Deep Hover** (`#4aa8a1`): Interactive hover and press states in dark mode.

### Neutral

- **Fresh Coastal Canvas** (`#f5f7f5`): Light mode page background, offering a soft paper-like warmth that reduces eye fatigue compared to pure white.
- **Pure Surface White** (`#ffffff`): Light mode cards, modals, popovers, and elevated containers.
- **Soft Teal Tint Surface** (`#e8f2f0`): Light mode secondary containers, sidebars, active table row highlights, and badge backdrops.
- **Deep Ink Text** (`#1d3032`): High-contrast primary text, headings, and prominent metrics in light mode.
- **Secondary Slate Text** (`#526967`): Secondary labels, body paragraphs, and table subtext in light mode.
- **Muted Sage Text** (`#687f7d`): Timestamps, inactive captions, and placeholder text in light mode.
- **Subtle Coastal Border** (`#e1e9e6`): 1px borders, table dividers, and input strokes in light mode.
- **Abyssal Ocean Canvas** (`#183b4a`): Dark mode main page background.
- **Deep Marine Card Surface** (`#204b5a`): Standard cards, containers, and dialogs in dark mode.
- **Elevated Marine Surface** (`#285968`): Hovered cards, selected states, and elevated panels in dark mode.
- **Sidebar Abyssal Layer** (`#143440`): Fixed navigation rail and side drawer background in dark mode.
- **Frosted Seafoam Text** (`#f1f7f7`): High-contrast primary text and titles in dark mode.
- **Soft Foam Text** (`#c5ddde`): Secondary body text and labels in dark mode.
- **Muted Algae Text** (`#a7c5c8`): Inactive captions, metadata, and icons in dark mode.
- **Deep Marine Border** (`#355966`): 1px subtle borders and card outlines in dark mode.

### Functional Urgency

- **Critical / Overdue** (`#ef4444`): Immediate deadline failures and urgent warnings. Light background `#fee2e2`, dark background `rgba(239, 68, 68, 0.18)`.
- **Urgent (1–2 Days)** (`#f97316`): Impending commitments. Light background `#ffedd5`, dark background `rgba(249, 115, 22, 0.18)`.
- **Due Soon (3–7 Days)** (`#f59e0b`): Upcoming responsibilities. Light background `#fef3c7`, dark background `rgba(245, 158, 11, 0.18)`.
- **Upcoming / Routine** (`#168f91`): Scheduled items. Light background `#d3eae7`, dark background `rgba(85, 189, 181, 0.15)`.
- **Completed / Active** (`#10b981`): Resolved responsibilities and positive reinforcement. Light background `#dcfce7`, dark background `rgba(16, 185, 129, 0.18)`.

### Named Rules

**The 10% Teal Rule.** Primary ocean teal is reserved for primary focal actions, active navigation states, and key interactive highlights. It must never flood decorative background surfaces or cover more than 10% of any viewport.

**The Functional Urgency Doctrine.** Red, orange, and amber accents are strictly governed by deadline proximity. They are prohibited on arbitrary decorative graphics, marketing ribbons, or secondary status tags.

## Typography

LifeAdmin uses a high-contrast editorial type pairing: **DM Serif Display** provides an unhurried, literary voice for headings, while **Inter** delivers crisp, geometric legibility for operational UI, controls, and structured data.

**Display Font:** `'DM Serif Display', Georgia, serif`

**Body & UI Font:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

**Mono Font:** `'Courier New', monospace` (for currency values, numeric IDs, and reference numbers)

**Character:** Warm, cultivated editorial authority juxtaposed with Scandinavian software precision.

### Hierarchy

- **Display** (Regular 400, `2.25rem` / `36px`, line-height `1.2`): Reserved for top-level dashboard greetings and celebratory milestones.
- **Headline** (Regular 400, `1.75rem` / `28px`, line-height `1.25`): Module page titles.
- **Title** (SemiBold 600, `1.125rem` / `18px`, line-height `1.35`): Section card headers, modal titles, and widget headings.
- **Body** (Regular 400, `0.875rem` / `14px`, line-height `1.5`): Paragraphs, descriptions, list item titles, and table cells.
- **Label / Subtext** (Medium 500 / SemiBold 600, `0.75rem` / `12px`, line-height `1.4`, letter-spacing `0.02em`): Badges, category pills, timestamps, and input field labels.
- **Micro** (Medium 500, `0.6875rem` / `11px`, line-height `1.3`): Subscript indicators, currency qualifiers, and status tags.

### Named Rules

**The Editorial Accent Rule.** DM Serif Display is used strictly for top-level greetings, hero headers, and module page titles. All controls, tables, buttons, metrics, and body text must remain in Inter to prevent visual fatigue and maintain scanability.

**The Currency Alignment Rule.** All Indian Rupee (`₹`) amounts and financial totals must be rendered with tabular figures (`tnum`) in Inter SemiBold or monospace to ensure clean vertical alignment across lists and invoices.

## Layout

The spatial model is built upon a strict **4px vertical and horizontal rhythm**, delivering visual stability and breathable spacing across viewports.

### Grid & Density

- **Micro Rhythm**: `4px` (gaps between icons and text), `8px` (button internal padding, compact element gaps), `12px` (input padding, list item gaps).
- **Component Rhythm**: `16px` (card internal padding, mobile gutters), `20px` (standard card padding), `24px` (section separation, modal padding).
- **Structural Rhythm**: `32px` (desktop module headers), `48px` (page vertical section separation), `64px` (editorial hero spacing).

### Breakpoints & Responsive Behavior

- **Desktop (≥1024px)**: Permanent collapsible sidebar (256px expanded, 72px icon-rail), 12-column layout grid, multi-column dashboard widget matrix.
- **Tablet (768px–1023px)**: Compact drawer navigation, 2-column card layouts, 24px side gutters.
- **Mobile (<768px)**: Fixed bottom navigation bar (64px iOS, 72px Android), single-column stacked layout, 16px edge gutters.

## Elevation & Depth

LifeAdmin adheres to a **Tonal Layering** philosophy supported by soft, diffuse ambient shadows.

### Depth Strategy

- **Resting State**: Surfaces rest flat upon their background layer, defined by crisp 1px borders.
- **Tonal Contrast**: Page Canvas → Container Surface → Elevated Action Card.
- **Interactive State**: Shadows and subtle transforms appear strictly on hover and active focus to signal affordance.

### Shadow Vocabulary

- **Shadow XS**: `0 1px 2px rgba(24, 59, 61, 0.04)` (dark: `0 1px 2px rgba(0, 0, 0, 0.2)`).
- **Shadow Card**: `0 4px 12px -2px rgba(24, 59, 61, 0.06), 0 2px 4px -2px rgba(24, 59, 61, 0.04)` (dark: `0 4px 12px -2px rgba(0, 0, 0, 0.3)`).
- **Shadow Elevated**: `0 10px 20px -3px rgba(24, 59, 61, 0.08), 0 4px 6px -4px rgba(24, 59, 61, 0.04)` (dark: `0 10px 20px -3px rgba(0, 0, 0, 0.35)`).
- **Shadow Modal**: `0 24px 40px -8px rgba(24, 59, 61, 0.16)` (dark: `0 24px 40px -8px rgba(0, 0, 0, 0.45)`).

### Named Rules

**The Flat-At-Rest Rule.** All cards, tables, and containers are flat at rest, bounded by their 1px subtle border. Shadows must never be applied decoratively without an interactive or layering purpose.

**The Ghost Border Fallback.** On dark mode surfaces, elevation shifts are accompanied by a 1px border to ensure crisp edge definition regardless of display brightness or gamma curve.

## Shapes

The form language communicates approachability and precision through gently rounded geometry.

- **Micro Radii (6px)**: Compact tags, urgency indicator dots, badge chips.
- **Control Radii (8–12px)**: Inputs, buttons, dropdown triggers, and select menus.
- **Container Radii (16px)**: Primary cards, task items, bill panels, and modal containers.
- **Hero Radii (24px)**: Featured dashboard matrices, onboarding cards, and floating quick-create modals.
- **Pill Radii (9999px)**: Avatar circles, interactive status toggles, floating action buttons, and urgency chips.

## Components

### Buttons

- **Shape**: Rounded rectangle (12px), height 40px (md) / 48px (lg).
- **Primary**: Solid Coastal Ocean Teal (`#087e83` light / `#55bdb5` dark), white or dark-slate text, font weight 600, padding `10px 18px`.
- **Secondary**: Surface tint background (`#e8f2f0` light / `#285968` dark), with a 1px border.
- **Ghost**: Transparent background, muted text, subtle hover background.
- **Danger**: Crimson background (`#dc2626`), white text, reserved for destructive actions.

### Cards / Containers

- **Corner Style**: Rounded 16px.
- **Background**: White in light mode; Deep Marine in dark mode.
- **Border**: 1px solid coastal border in light mode / deep marine border in dark mode.
- **Internal Padding**: 20px standard, responsive to 16px on mobile.
- **Hover Treatment**: Optional subtle shadow expansion and border color transition.

### Inputs & Fields

- **Base Style**: 1px border, white/deep marine background, 12px radius, 10px 14px padding, 14px text.
- **Focus Ring**: 2px ring in primary teal; border shifts to primary.
- **Error State**: Red border and ring, helper text at 12px.

### Navigation

- **Desktop Sidebar**: Fixed left column (256px wide), white in light mode / abyssal sidebar in dark mode.
- **Nav Items**: Height 40px, rounded 12px, font-weight 500. Active state uses tinted surface, primary text and font-weight 600.
- **Mobile Bottom Bar**: Fixed bottom bar (64px iOS, 72px Android, plus safe area), 4–5 tab destinations with 24px icons and 11px label captions.

### Urgency Tag (Signature Component)

- **Geometry**: Pill badge (9999px radius), padding 2px 10px, font size 12px, font weight 500.
- **Indicator**: Contains a 6px dot aligned with the status text.
- **Urgency Matrix**:
  - **Overdue**: Crimson dot `#ef4444`, light fill `#fee2e2`, text `#b91c1c`.
  - **Urgent**: Amber-orange dot `#f97316`, light fill `#ffedd5`, text `#c2410c`.
  - **Due Soon**: Warm yellow dot `#f59e0b`, light fill `#fef3c7`, text `#b45309`.
  - **Upcoming**: Ocean teal dot `#168f91`, light fill `#d3eae7`, text `#0e6567`.

## Do's and Don'ts

### Do:

- Maintain high typographic contrast between DM Serif Display headlines and Inter operational UI.
- Align margins, paddings, and gaps strictly to the 4px baseline.
- Use the Ocean Teal brand scale for interactive affordances and active indicators.
- Provide intentional dark mode surfaces using Deep Ocean Blue rather than simple color inversions.
- Use tabular figures (`tnum`) for ₹ amounts, dates, and metric counters.
- Ensure every interactive element meets the touch target floor: 44×44 pt on iOS, 48×48 dp on Android.
- Respect system reduced-motion preferences by substituting fades for sliding transforms.

### Don't:

- Flood screens with Ocean Teal backgrounds; keep accent usage below 10% of any viewport.
- Use multi-color fluorescent gradients, neon glow shadows, or generic AI SaaS glassmorphic blobs.
- Stack arbitrary nested cards inside cards; use tonal background shifts and whitespace instead.
- Use DM Serif Display for body text, data tables, buttons, form labels, or captions.
- Invent custom alert colors outside the calibrated Urgency Matrix.
- Use gamified guilt mechanics, streak counters, or negative reinforcement. LifeBuddy companions never guilt or punish inactivity.
- Remove or suppress standard system back gestures or native navigation patterns on iOS and Android.
