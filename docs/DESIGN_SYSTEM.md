# LifeAdmin — Design System

## 1. Brand Identity & Palette

LifeAdmin uses an **Ocean Teal-Blue** palette coupled with organic earthen neutrals, creating a calm, focused, editorial atmosphere.

### 1.1 Color Tokens

#### Light Theme
| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `--color-bg` | `#E7F3F1` | Fresh coastal page background |
| `--color-surface` | `#FFFFFF` | Cards, modals, containers |
| `--color-surface-secondary` | `#D3EAE7` | Soft teal container contrast, sidebars, pills |
| `--color-primary` | `#168F91` | Primary action buttons, active states, key icons |
| `--color-primary-deep` | `#106F71` | Hover states, emphasized links, dark accents |
| `--color-primary-soft` | `#D3EAE7` | Accent badges, selected row highlights, tags |
| `--color-text-main` | `#183B3D` | Headings, primary text, prominent data |
| `--color-text-muted` | `#587477` | Secondary labels, timestamps, metadata |
| `--color-border` | `#D0E2DF` | Subtle dividers, container borders |

#### Dark Theme (Deep Ocean Blue + Teal)
| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `--color-bg` / `--bg-main` | `#183B4A` | Main page background |
| `--bg-surface` / sidebar | `#143440` | Sidebar, deepest layer |
| `--bg-surface` (cards) | `#204B5A` | Standard cards, modals, containers |
| `--bg-surface-elevated` | `#285968` | Elevated cards, hover states, active pills |
| `--color-primary` | `#55BDB5` | Primary accent, active states, key icons |
| `--color-primary-deep` | `#4AA8A1` | Interactive hover states |
| `--color-primary-soft` | `#285968` | Accent badges, selected highlights |
| `--text-main` | `#F1F7F7` | Headings, primary text, prominent data |
| `--text-secondary` | `#C5DDDE` | Secondary labels, body text |
| `--text-muted` | `#A7C5C8` | Timestamps, metadata, captions |
| `--border-subtle` | `#355966` | Subtle dividers, container borders |

#### Functional Urgency Palette
| Urgency Level | Light Background | Light Text | Dark Background | Dark Text | Hex Accent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Overdue / Critical** | `#FEE2E2` | `#B91C1C` | `#5C2828` | `#FFD2D2` | `#EF4444` |
| **Urgent (1–2 days)** | `#FFEDD5` | `#C2410C` | `#5A2C14` | `#FFDEC7` | `#F97316` |
| **Due Soon (3–7 days)**| `#FEF3C7` | `#B45309` | `#54390E` | `#FFE8AD` | `#F59E0B` |
| **Upcoming / Normal**  | `#D3EAE7` | `#168F91` | `#285D63` | `#8EE0D9` | `#69BDB7` |
| **Completed / Success** | `#DCFCE7` | `#15803D` | `#1D4F40` | `#A7F3D0` | `#10B981` |

---

## 2. Typography

### 2.1 Font Families
- **Editorial Headings**: `'DM Serif Display', Georgia, serif`
  - Applied selectively to screen titles, welcome greetings, and promotional quotes to deliver a crafted, literary feel.
- **Body & Interface**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - Applied to all navigation, controls, data tables, metrics, cards, and interactive forms.

### 2.2 Scale & Hierarchy
- **Display 1**: `36px (2.25rem)` — Line height `1.2`, DM Serif Display (Dashboard Greeting, Landing titles)
- **Heading 1**: `28px (1.75rem)` — Line height `1.25`, DM Serif Display (Module Page Headers)
- **Heading 2**: `20px (1.25rem)` — Line height `1.3`, Inter SemiBold / DM Serif (Section Cards)
- **Heading 3**: `16px (1.0rem)` — Line height `1.4`, Inter SemiBold (Card Titles, Modal Headings)
- **Body Regular**: `14px (0.875rem)` — Line height `1.5`, Inter Regular (Paragraphs, List Items)
- **Body Small**: `12px (0.75rem)` — Line height `1.4`, Inter Medium (Badges, Metadata, Dates)
- **Micro**: `11px (0.6875rem)` — Line height `1.3`, Inter Medium (Tags, Subscript labels)

---

## 3. Spacing System (4px Rhythm)
All padding, margin, and gap properties must align with the 4px baseline:
- `4px` (`space-1`) — Micro spacing between icons and text
- `8px` (`space-2`) — Compact element gap (chips, button internal padding)
- `12px` (`space-3`) — Standard input vertical padding, item list spacing
- `16px` (`space-4`) — Card internal padding, standard layout gap
- `24px` (`space-6`) — Section grouping separation, modal padding
- `32px` (`space-8`) — Major section dividers, desktop header spacing
- `48px` (`space-12`) — Page-level vertical rhythm
- `64px` (`space-16`) — Spacious editorial separation

---

## 4. Radius & Shadows

### 4.1 Radii
- `--radius-sm`: `6px` (Pills, compact tags)
- `--radius-md`: `8px` (Inputs, standard buttons)
- `--radius-lg`: `12px` (Cards, dropdowns, list items)
- `--radius-xl`: `16px` (Modals, large panels, sidebar)
- `--radius-2xl`: `24px` (Featured banners, floating action bubbles)
- `--radius-full`: `9999px` (Avatars, circular icons, badge pills)

### 4.2 Shadows
- **Shadow Subtitle**: `0 1px 2px 0 rgba(16, 28, 32, 0.04)`
- **Shadow Card**: `0 4px 12px -2px rgba(16, 28, 32, 0.06), 0 2px 4px -2px rgba(16, 28, 32, 0.04)`
- **Shadow Elevated / Flyout**: `0 12px 24px -4px rgba(16, 28, 32, 0.08), 0 4px 8px -2px rgba(16, 28, 32, 0.04)`
- **Shadow Modal**: `0 24px 48px -12px rgba(16, 28, 32, 0.18)`

---

## 5. Standard Component Styling Guidelines

### Buttons
- **Primary**: Solid background `--color-primary`, white text, soft shadow, subtle lift on hover (`scale-[1.01]`).
- **Secondary**: Surface background `--color-surface-secondary`, text `--color-text-main`, subtle border `--color-border`.
- **Ghost**: Transparent background, text `--color-text-muted`, hover background `--color-surface-secondary`.
- **Danger**: Crimson accent background or outline with clear warning state.

### Input Controls
- Base: 1px border `--color-border`, background `--color-surface`, text `--color-text-main`.
- Focus: Ring 2px `--color-primary` with 20% opacity, border color `--color-primary`.
- Validation: Red ring for invalid fields with helper text.

### Cards & Panels
- Soft 1px border `--color-border`, rounded 12px or 16px, background `--color-surface`.
- Subtle hover elevation transition for interactive cards.

---

## 6. Motion & Animation Tokens
- **Micro Transition**: `150ms cubic-bezier(0.16, 1, 0.3, 1)`
- **Drawer / Panel Transition**: `220ms cubic-bezier(0.16, 1, 0.3, 1)`
- **Modal Pop Transition**: `200ms cubic-bezier(0.34, 1.56, 0.64, 1)`
- Respect `@media (prefers-reduced-motion: reduce)`.

