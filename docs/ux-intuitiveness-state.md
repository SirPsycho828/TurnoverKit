# UX Intuitiveness State

## Current Phase: 7 (Verify & Deploy)
## Completed: [1, 2, 3, 4, 5, 6]

## Phase 1 (Discovery) — Complete
- [x] Step 1: Read project identity
- [x] Step 2: Detect tech stack
- [x] Step 3: Inventory all pages
- [x] Step 4: Map navigation structure
- [x] Step 5: Identify existing UX patterns
- [x] Step 6: Check for design system
- [x] Step 7: Output discovery summary
- [x] Step 8: Write state file

## Project
- **Name:** TurnoverKit
- **Domain:** Property management / legal compliance
- **Target Users:** Independent landlords (1-4 units), moderate tech sophistication, using phones on-site
- **Framework:** React 19
- **CSS:** Tailwind CSS 4
- **Component Library:** shadcn/ui (base-nova style, @base-ui/react — NOT Radix)
- **Router:** React Router DOM v7
- **State Management:** React Context (AuthContext)
- **Build Tool:** Vite
- **Animation:** tw-animate-css
- **Icons:** Lucide
- **Toast:** Sonner (bottom-center)
- **Package Manager:** npm

## Page Inventory
| Page | Route | File | Type | Score |
|------|-------|------|------|-------|
| Landing | `/` | src/pages/LandingPage.tsx | landing | pending |
| Sign In | `/signin` | src/pages/auth/SignInPage.tsx | auth | pending |
| Sign Up | `/signup` | src/pages/auth/SignUpPage.tsx | auth | pending |
| Forgot Password | `/forgot-password` | src/pages/auth/ForgotPasswordPage.tsx | auth | pending |
| Verify Email | `/verify-email` | src/pages/auth/VerifyEmailPage.tsx | auth | pending |
| Onboarding | `/onboarding` | src/pages/auth/OnboardingPage.tsx | form | pending |
| Dashboard | `/dashboard` | src/pages/dashboard/DashboardPage.tsx | dashboard | pending |
| Property Create | `/properties/new` | src/pages/property/PropertyCreatePage.tsx | wizard | pending |
| Property Detail | `/properties/:id` | src/pages/property/PropertyDetailPage.tsx | detail | pending |
| Turnover Create | `/turnovers/new` | src/pages/turnover/TurnoverCreatePage.tsx | wizard | pending |
| Turnover Detail | `/turnovers/:id` | src/pages/turnover/TurnoverDetailPage.tsx | detail | pending |
| Inspection | `/turnovers/:id/inspect` | src/pages/turnover/InspectionPage.tsx | form | pending |
| Deductions | `/turnovers/:id/deductions` | src/pages/turnover/DeductionsPage.tsx | list/form | pending |
| Vendors | `/vendors` | src/pages/vendor/VendorsPage.tsx | list | pending |
| Settings | `/settings` | src/pages/settings/SettingsPage.tsx | settings | pending |
| Tenant Portal | `/portal/:token` | src/pages/portal/TenantPortalPage.tsx | detail | pending |

## Navigation Structure
- **Header:** Logo (links to /dashboard) + logout button
- **Bottom nav:** 3 items — Home, Vendors, Settings
- **Sub-pages:** Back arrow navigation
- **Internal tabs:** TurnoverDetailPage has Tabs component
- **No:** sidebar, breadcrumbs, footer nav

## Existing UX Patterns
- **Empty states:** 3 pages (Dashboard, Vendors, Deductions) via shared EmptyState component (icon + title + description + CTA)
- **Loading states:** Skeletons on Dashboard; centered Loader2 spinner on other pages
- **Help text:** Minimal — 1 instance on Onboarding page
- **Metrics:** 2 stat cards on Dashboard (properties, active turnovers). Progress bar on TurnoverDetail.
- **Toasts:** Sonner for save success/error
- **Wizards:** PropertyCreate (3-step), TurnoverCreate (4-step) with step labels
- **Confirmations:** Delete dialogs for property and vendor
- **Error handling:** toast.error() + inline Zod form errors. No error boundary or error pages.

## Design System
- **Colors:** Primary #0F172A, Emerald accent #10B981, Background #F8FAFC, Card #FFFFFF
- **Typography:** Plus Jakarta Sans (headings), Figtree (body)
- **Radius:** 0.5rem base with computed variants
- **Shadows:** sm/md/lg defined
- **CSS custom properties:** Full set in :root (index.css)

## Workflow Map

### Workflow 1: First-Time Setup — Bumpy
Path: SignUp -> VerifyEmail -> Onboarding -> Dashboard (empty)
Dependencies: none
Gaps:
- [WF-001] Unclear Sequence at Dashboard — New user lands on empty dashboard with "Add Property" CTA. No explanation of the overall workflow chain (Property -> Turnover -> Inspection -> Deductions -> Finalize). User must discover the sequence.
- [WF-002] Missing Handoff at Onboarding -> Dashboard — Onboarding redirects to dashboard with no "here's what to do next" guidance beyond the empty state.

### Workflow 2: Add a Property — Smooth
Path: Dashboard -> PropertyCreate (3-step wizard) -> PropertyDetail
Dependencies: none
Gaps:
- [WF-003] Dead End at PropertyCreate completion — After creating a property, user arrives at PropertyDetail. "Start Turnover" button exists, but no contextual guidance saying "Property ready! Next step: start a turnover."

### Workflow 3: Start a Turnover — Bumpy
Path: PropertyDetail -> TurnoverCreate (4-step wizard) -> TurnoverDetail
Dependencies: Requires Workflow 2 (property must exist)
Gaps:
- [WF-004] Hidden Prerequisite at TurnoverCreate — If user has 0 eligible properties, message says "All your properties have active turnovers" which is misleading when user simply has no properties.
- [WF-005] Missing Handoff at TurnoverDetail — After creation, user lands on TurnoverDetail default "Timeline" tab. The first needed action (Start Inspection) is hidden in the "Actions" tab with no nudge.

### Workflow 4: Complete Inspection — Bumpy
Path: TurnoverDetail (Actions tab) -> InspectionPage -> TurnoverDetail
Dependencies: Requires Workflow 3 (turnover must exist)
Gaps:
- [WF-006] Missing Handoff at InspectionPage -> TurnoverDetail — After saving inspection, user navigates back but no guidance says "Inspection done! Next: add deductions for damages."
- [WF-007] Unclear Sequence at TurnoverDetail Actions tab — All action buttons (Inspect, Deductions, Portal Link, Advance Status) are equal-weight with no indication of order. No "Step 1, Step 2" guidance.

### Workflow 5: Draft Deductions — Bumpy
Path: TurnoverDetail -> DeductionsPage -> TurnoverDetail
Dependencies: Requires Workflow 4 (inspection should be done first)
Gaps:
- [WF-008] Missing Handoff at DeductionsPage — After adding deductions, no guidance about next steps (send portal link, advance status).

### Workflow 6: Finalize & Send to Tenant — Bumpy
Path: TurnoverDetail -> Copy Portal Link -> Advance status stages -> Finalize -> Archive
Dependencies: Requires Workflows 4-5
Gaps:
- [WF-009] Broken Feedback Loop at "Copy Portal Link" — Button copies to clipboard with no toast or visual confirmation that copy succeeded.
- [WF-010] Missing Handoff at "Copy Portal Link" — No guidance on what to do with the link (text/email to tenant), and no explanation of what the tenant will see.
- [WF-011] Unclear Sequence at status advancement — "Advance to: [status]" button doesn't explain what each status means or what triggers the advance.

### Workflow 7: Tenant Reviews Deposit — Smooth
Path: TenantPortal (magic link) -> View deductions -> Dispute or Acknowledge
Dependencies: Requires Workflow 6 (portal link shared)
Gaps:
- [WF-012] Broken Feedback Loop at tenant acknowledgment -> landlord — After tenant acknowledges or disputes, no notification or visual indicator appears on the landlord's TurnoverDetail to show tenant activity.

### Workflow 8: Manage Vendors — Smooth
Path: Bottom Nav -> VendorsPage -> Add Vendor dialog
Dependencies: none
Gaps:
- [WF-013] Missing Handoff at Vendors -> Turnovers — Vendors exist as an isolated directory. No "dispatch vendor" flow from TurnoverDetail. No cross-reference.

### Cross-Workflow Dependencies
1. Turnover requires Property (communicated via disabled button + hint text)
2. Inspection requires Turnover (handled via navigation from TurnoverDetail)
3. Deductions require Turnover (handled via navigation)
4. Portal link requires Turnover (handled via navigation)
5. First-time user has NO visibility into this dependency chain

## Phase 4 (Components) — Complete
- [x] Step 1: Load references (component-catalog.md, anti-patterns.md)
- [x] Step 2: Analyze findings for patterns (NextStepCard 4x, GuidanceTip 3x)
- [x] Step 3: Determine component directory (src/components/ux/)
- [ ] Step 4: Fetch library documentation — skipped: project uses shadcn/ui base-nova with known patterns from memory
- [x] Step 5: Build components (NextStepCard, GuidanceTip)
- [x] Step 6: Verify build (tsc --noEmit passes)
- [x] Step 7: Update state

### Components Created
- `src/components/ux/NextStepCard.tsx` — state-aware "do this next" card with icon, title, description, CTA
- `src/components/ux/GuidanceTip.tsx` — dismissible contextual help tip with localStorage persistence

## Phase 3 (Page Scorecard) — Complete
- [x] Step 1: Load references (ux-layers.md)
- [x] Step 2: Score each page (16 pages scored)
- [x] Step 3: Cross-reference with workflow gaps
- [x] Step 4: Generate findings (18 findings)
- [x] Step 5: Write audit report (docs/ux-audit-report.md)
- [x] Step 6: Present summary
- [x] Step 7: Update state
- [x] Step 8: Load Phase 4

## Findings Tracker
| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| UX-001 | critical | resolved | No workflow chain visibility |
| UX-002 | critical | resolved | Actions tab hides next steps |
| UX-003 | high | resolved | No post-creation next-step guidance |
| UX-004 | high | resolved | Missing handoff after inspection/deductions |
| UX-005 | high | resolved | Portal link copy has no feedback |
| UX-006 | high | resolved | Status advancement unexplained |
| UX-007 | high | resolved | TurnoverCreate 0-property message misleading |
| UX-008 | high | resolved | Inspection page missing guidance |
| UX-009 | high | resolved | No domain-specific guidance on complex pages |
| UX-010 | medium | resolved | Missing metrics on PropertyDetail/Vendors |
| UX-011 | medium | resolved | Settings default state not explained |
| UX-012 | medium | resolved | Vendors not connected to turnovers |
| UX-013 | medium | resolved | PropertyDetail no turnover empty state |
| UX-014 | medium | resolved | No success toast after create wizards |
| UX-015 | medium | resolved | Tenant portal post-action guidance missing |
| UX-016 | medium | resolved | Dashboard metrics lack context |
| UX-017 | low | resolved | Milestone toggle no toast |
| UX-018 | low | resolved | Portal expired vs invalid distinction |

## Phase 5 (Implementation) — Complete
- [x] All 18 findings resolved across 11 pages
- [x] TypeScript build passes clean

## Phase 6 (Onboarding) — Skipped
- Assessment: Neither setup wizard nor app tour needed
- Reason: NextStepCards already provide contextual guidance at every step; page count is low (5 app pages); no multi-field setup form beyond existing onboarding

## Phase 2 (Workflow Audit) — Complete
- [x] Step 1: Load references (workflow-gap-types.md)
- [x] Step 2: Discover workflows (8 workflows identified)
- [x] Step 3: Walk each workflow (13 gaps found)
- [x] Step 4: Identify cross-workflow dependencies
- [x] Step 5: Rate workflow health
- [x] Step 6: Output workflow map
- [x] Step 7: Update state
- [x] Step 8: Load Phase 3
