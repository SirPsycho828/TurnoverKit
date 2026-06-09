# Design System — TurnoverKit

> Single source of truth for all design decisions.

## Design Direction

**Direction:** Command — Modern operations platform, precision-engineered for landlord workflows
**Signature Element:** Animated turnover pipeline stepper with emerald fill transitions

---

## Typography

### Fonts
- **Heading:** Plus Jakarta Sans (500–800)
- **Body:** Figtree (300–700, with italics)

### Import
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..700;1,300..700&family=Plus+Jakarta+Sans:wght@500..800&display=swap" rel="stylesheet">
```

### Scale
| Level | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| h1 | Plus Jakarta Sans | 2.25rem (36px) | 700 | 1.2 | -0.025em |
| h2 | Plus Jakarta Sans | 1.75rem (28px) | 700 | 1.25 | -0.02em |
| h3 | Plus Jakarta Sans | 1.25rem (20px) | 600 | 1.3 | -0.01em |
| h4 | Plus Jakarta Sans | 1.125rem (18px) | 600 | 1.4 | 0 |
| body | Figtree | 1rem (16px) | 400 | 1.6 | 0 |
| body-sm | Figtree | 0.875rem (14px) | 400 | 1.5 | 0 |
| caption | Figtree | 0.75rem (12px) | 500 | 1.4 | 0.02em |
| button | Figtree | 0.875rem (14px) | 600 | 1 | 0.025em |

---

## Color Palette

### Core
| Token | Hex | Usage |
|-------|-----|-------|
| --primary | #0F172A | Brand identity, primary buttons, header |
| --primary-foreground | #FFFFFF | Text on primary |
| --secondary | #F1F5F9 | Secondary buttons, subtle backgrounds |
| --secondary-foreground | #334155 | Text on secondary |
| --accent | #ECFDF5 | Hover backgrounds, selected states |
| --accent-foreground | #065F46 | Text on accent surfaces |

### Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| --background | #F8FAFC | Page background (cool slate) |
| --foreground | #0F172A | Primary text |
| --card | #FFFFFF | Card/panel backgrounds |
| --card-foreground | #0F172A | Text on cards |
| --muted | #F1F5F9 | Disabled, secondary elements |
| --muted-foreground | #64748B | Secondary text, labels |
| --popover | #FFFFFF | Dropdown/popover backgrounds |
| --popover-foreground | #0F172A | Text in popovers |

### Borders & Input
| Token | Hex | Usage |
|-------|-----|-------|
| --border | #E2E8F0 | Dividers, card borders |
| --input | #CBD5E1 | Form input borders |
| --ring | #10B981 | Focus ring color (emerald) |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| --destructive | #DC2626 | Error, delete, danger |
| --success | #059669 | Success, complete, on-track |
| --success-foreground | #FFFFFF | Text on success |
| --warning | #D97706 | Caution, approaching deadline |
| --warning-foreground | #FFFFFF | Text on warning |
| --emerald | #10B981 | Pipeline fills, status dots, progress |

---

## Spacing

Base unit: 4px (Tailwind default scale)

---

## Border Radius

Base: `--radius: 0.5rem` (8px)

| Token | Value | Usage |
|-------|-------|-------|
| --radius-sm | 4px | Badges, chips |
| --radius-md | 6px | Buttons, inputs |
| --radius-lg | 8px | Cards, panels |
| --radius-xl | 12px | Modals, large containers |
| --radius-full | 9999px | Pills, avatars |

---

## Shadows

Minimal, defined elevation.

| Token | Value |
|-------|-------|
| --shadow-sm | 0 1px 2px 0 rgb(0 0 0 / 0.05) |
| --shadow-md | 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05) |
| --shadow-lg | 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04) |

---

## Animation

| Token | Value | Usage |
|-------|-------|-------|
| --duration-fast | 150ms | Micro-interactions (hover, focus) |
| --duration-normal | 250ms | State transitions |
| --duration-slow | 400ms | Page transitions, reveals |
| --easing-default | cubic-bezier(0.4, 0, 0.2, 1) | General motion |
| --easing-spring | cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy entrances |
| --easing-out | cubic-bezier(0, 0, 0.2, 1) | Exit animations |

**Signature Animation — Status Pipeline:** Horizontal stepper on turnover detail pages showing lifecycle (Scheduled > Move-Out > Inspection > Repair > Ready). Completed steps fill with emerald (#10B981) via 400ms ease-out. Active step pulses with emerald glow ring (2s infinite). Connecting lines fill left-to-right.

---

## Favicon

Shield with checkmark — represents property protection and legal compliance. Dark navy background (#0F172A), emerald shield (#10B981), white checkmark.
