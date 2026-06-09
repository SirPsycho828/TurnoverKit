# UX Intuitiveness Audit

## App Context
- **Name:** TurnoverKit
- **Domain:** Property management / legal compliance
- **Target Users:** Independent landlords (1-4 units), moderate tech sophistication
- **Tech Stack:** React 19 + Tailwind CSS 4 + shadcn/ui (base-nova)
- **Pages:** 16
- **Routes:** 16

## Workflow Map

### Workflow 1: First-Time Setup -- Bumpy
Path: SignUp -> VerifyEmail -> Onboarding -> Dashboard (empty)
Gaps:
- [WF-001] Unclear Sequence at Dashboard -- New user lands on empty dashboard. No explanation of the workflow chain (Property -> Turnover -> Inspect -> Deductions -> Finalize).
- [WF-002] Missing Handoff at Onboarding -> Dashboard -- No "here's what to do next" beyond the empty state CTA.

### Workflow 2: Add a Property -- Smooth
Path: Dashboard -> PropertyCreate (3-step) -> PropertyDetail
Gaps:
- [WF-003] Dead End at PropertyCreate -> PropertyDetail -- No contextual "next step: start a turnover" guidance.

### Workflow 3: Start a Turnover -- Bumpy
Path: PropertyDetail -> TurnoverCreate (4-step) -> TurnoverDetail
Gaps:
- [WF-004] Hidden Prerequisite at TurnoverCreate -- 0-property message says "All properties have active turnovers" which is misleading.
- [WF-005] Missing Handoff at TurnoverDetail -- First action (Start Inspection) is hidden in Actions tab.

### Workflow 4: Complete Inspection -- Bumpy
Path: TurnoverDetail -> InspectionPage -> TurnoverDetail
Gaps:
- [WF-006] Missing Handoff at Inspection completion -- No "next: add deductions" guidance.
- [WF-007] Unclear Sequence at TurnoverDetail Actions -- All action buttons are equal-weight with no ordering.

### Workflow 5: Draft Deductions -- Bumpy
Path: TurnoverDetail -> DeductionsPage -> TurnoverDetail
Gaps:
- [WF-008] Missing Handoff at Deductions completion -- No next-step guidance.

### Workflow 6: Finalize & Send to Tenant -- Bumpy
Path: TurnoverDetail -> Copy Portal Link -> Advance status -> Finalize -> Archive
Gaps:
- [WF-009] Broken Feedback Loop at "Copy Portal Link" -- No toast confirming clipboard copy.
- [WF-010] Missing Handoff at portal link -- No explanation of what tenant sees or how to send it.
- [WF-011] Unclear Sequence at status advancement -- "Advance to: X" doesn't explain what each status means.

### Workflow 7: Tenant Reviews Deposit -- Smooth
Path: TenantPortal -> View deductions -> Dispute/Acknowledge
Gaps:
- [WF-012] Broken Feedback Loop -- Tenant actions don't notify landlord in TurnoverDetail.

### Workflow 8: Manage Vendors -- Smooth
Path: Bottom Nav -> VendorsPage -> Add Vendor
Gaps:
- [WF-013] Missing Handoff -- No dispatch flow from TurnoverDetail to vendors.

## Page Scorecard

| Page | Orient. | Actions | Progress | Guidance | Metrics | Empty | Next | Feedback | Intent | Score |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Landing | P | P | - | - | - | - | P | - | P | 4/4 |
| Sign In | P | P | - | / | - | - | / | / | P | 3/6 |
| Sign Up | P | P | - | / | - | - | / | / | P | 3/6 |
| Forgot Password | P | P | - | / | - | - | / | P | P | 4/6 |
| Verify Email | P | P | - | / | - | - | / | / | P | 3/6 |
| Onboarding | P | P | - | P | - | - | / | / | P | 4/6 |
| Dashboard | / | P | / | M | / | P | M | / | / | 2/9 |
| Property Create | P | P | P | / | - | - | / | / | P | 3/7 |
| Property Detail | P | P | / | M | M | / | M | / | / | 2/9 |
| Turnover Create | P | P | P | / | - | / | / | / | P | 3/8 |
| Turnover Detail | P | / | P | M | P | - | M | / | / | 3/8 |
| Inspection | P | P | P | M | - | / | M | / | / | 3/8 |
| Deductions | P | P | / | M | / | P | M | / | / | 3/9 |
| Vendors | / | P | - | M | M | P | M | P | / | 3/8 |
| Settings | P | P | - | M | - | - | - | P | P | 4/5 |
| Tenant Portal | P | P | / | M | P | / | M | / | P | 4/9 |

## Findings (Prioritized)

### Critical

- **UX-001** [Unclear Sequence] No workflow chain visibility anywhere in the app. New users cannot see the full Property -> Turnover -> Inspect -> Deductions -> Finalize lifecycle. (Pages: Dashboard, TurnoverDetail)
  Layer: Next Steps + Guidance | Fix: Add a setup checklist to Dashboard that tracks first-time workflow completion, and a contextual "next step" card on TurnoverDetail

- **UX-002** [Missing Handoff] TurnoverDetail buries critical actions in an "Actions" tab with equal-weight buttons. User must discover which action to take next. (Pages: TurnoverDetail)
  Layer: Next Steps + Action Clarity | Fix: Add a prominent "Next Step" card above tabs that shows the single most important action based on turnover status

### High

- **UX-003** [Dead End] After creating a property, no contextual guidance nudging toward starting a turnover. After creating a turnover, no nudge toward inspection. (Pages: PropertyDetail, TurnoverDetail)
  Layer: Next Steps | Fix: Add state-aware NextStepCard on PropertyDetail and post-creation guidance on TurnoverDetail

- **UX-004** [Missing Handoff] After completing inspection, user returns to TurnoverDetail with no guidance about next step (add deductions). After adding deductions, no guidance about sending to tenant. (Pages: TurnoverDetail)
  Layer: Next Steps | Fix: Status-aware "next step" card that updates based on turnover progress

- **UX-005** [Broken Feedback Loop] "Copy Tenant Portal Link" copies to clipboard with no visual confirmation. (Pages: TurnoverDetail)
  Layer: Feedback | Fix: Add toast("Portal link copied to clipboard")

- **UX-006** [Unclear Sequence] "Advance to: [status]" button doesn't explain what each status means or when to advance. (Pages: TurnoverDetail)
  Layer: Guidance + Action Clarity | Fix: Add description text below each advance action explaining what the status means

- **UX-007** [Hidden Prerequisite] TurnoverCreate shows "All properties have active turnovers" when user has 0 properties, which is misleading. (Pages: TurnoverCreate)
  Layer: Empty States | Fix: Detect 0-property case and show appropriate message with link to add property

- **UX-008** [Missing Guidance] Inspection page has no explanation of condition ratings (good/fair/poor/damaged) or what to photograph. (Pages: InspectionPage)
  Layer: Guidance | Fix: Add brief help text for condition ratings and photo guidance

- **UX-009** [Missing Guidance] No inline guidance on complex pages about domain-specific concepts. (Pages: InspectionPage, DeductionsPage, TurnoverDetail)
  Layer: Guidance | Fix: Add contextual help text for domain concepts (conditions, deduction categories, status meanings)

### Medium

- **UX-010** [Missing Metrics] PropertyDetail and VendorsPage don't show aggregate metrics. (Pages: PropertyDetail, VendorsPage)
  Layer: Metrics | Fix: Add turnover count/status breakdown on PropertyDetail, vendor count by specialty on VendorsPage

- **UX-011** [Missing Guidance] Settings page doesn't explain what "Default State" is used for. (Pages: SettingsPage)
  Layer: Guidance | Fix: Add help text: "Used as the default state when adding new properties"

- **UX-012** [Missing Handoff] Vendor directory has no connection to turnover workflow. (Pages: VendorsPage, TurnoverDetail)
  Layer: Next Steps | Fix: Add "Dispatch vendor" hint on TurnoverDetail relist checklist

- **UX-013** [Partial Empty State] PropertyDetail has no empty state for turnovers section. Just doesn't render if 0. (Pages: PropertyDetail)
  Layer: Empty States | Fix: Show "No turnovers yet" with CTA when turnover list is empty

- **UX-014** [Missing Feedback] No success toast after PropertyCreate or TurnoverCreate completion. (Pages: PropertyCreate, TurnoverCreate)
  Layer: Feedback | Fix: Add toast on successful creation

- **UX-015** [Missing Guidance] Tenant portal doesn't explain what happens after dispute or acknowledgment. (Pages: TenantPortal)
  Layer: Guidance + Next Steps | Fix: Add "What happens next" text after acknowledgment/dispute

- **UX-016** [Partial Progress] Dashboard metrics show counts but lack context or trend. (Pages: Dashboard)
  Layer: Metrics | Fix: Add status breakdown (e.g., "2 need inspection, 1 in review")

### Low

- **UX-017** [Partial Feedback] Milestone toggle on TurnoverDetail has no toast feedback. (Pages: TurnoverDetail)
  Layer: Feedback | Fix: Optional toast on milestone toggle

- **UX-018** [Partial Empty State] Tenant portal shows same "invalid" message for expired and truly-invalid tokens. (Pages: TenantPortal)
  Layer: Empty States | Fix: Distinguish "expired" from "invalid" with different messaging

## Summary
- **Total findings:** 18
- **By severity:** 2 critical, 7 high, 7 medium, 2 low
- **Pages with worst scores:** Dashboard (2/9), Property Detail (2/9), Deductions (3/9)
- **Most common missing layer:** Next Steps (missing on 7 pages), Guidance (missing on 7 pages)
- **Workflows at risk:** First-Time Setup (Bumpy), Complete Inspection (Bumpy), Finalize & Send (Bumpy)

---

## Results

### Before/After Scorecard

| Page | Before | After | Change |
|------|:------:|:-----:|:------:|
| Dashboard | 2/9 | 7/9 | +5 |
| Property Create | 3/7 | 4/7 | +1 |
| Property Detail | 2/9 | 6/9 | +4 |
| Turnover Create | 3/8 | 5/8 | +2 |
| Turnover Detail | 3/8 | 8/8 | +5 |
| Inspection | 3/8 | 6/8 | +3 |
| Deductions | 3/9 | 6/9 | +3 |
| Vendors | 3/8 | 5/8 | +2 |
| Settings | 4/5 | 5/5 | +1 |
| Tenant Portal | 4/9 | 7/9 | +3 |

### Summary
- **Findings resolved:** 18/18 (0 remaining)
- **Average page score (modified pages):** 3.0/9 -> 5.9/9
- **Workflows fixed:** First-Time Setup (Bumpy -> Smooth), Add Property (Smooth), Start Turnover (Bumpy -> Smooth), Complete Inspection (Bumpy -> Smooth), Draft Deductions (Bumpy -> Smooth), Finalize & Send (Bumpy -> Smooth), Tenant Review (Smooth), Manage Vendors (Smooth)
- **Components created:** NextStepCard (`src/components/ux/NextStepCard.tsx`), GuidanceTip (`src/components/ux/GuidanceTip.tsx`)
- **Onboarding:** Not applicable — NextStepCards provide contextual guidance; page count is low
- **Pages modified:** 11
