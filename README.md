<div align="center">

# TurnoverKit

**Turnover coordination for independent landlords**

Your legal safety net from move-out notice to deposit return.

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-DD2C00?style=flat-square&logo=firebase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

</div>

---

## Overview

TurnoverKit guides independent landlords (1–4 units) through the entire rental turnover period — from the moment a tenant gives notice to the final deposit return. It enforces state-specific deposit law compliance through frozen legal rules, automated timelines, and structured inspection workflows.

The app is designed as a **mobile-first PWA** so landlords can capture inspections on-site with their phone, and tenants can review deductions via a magic-link portal without creating an account.

## Features

<table>
<tr>
<td width="50%" valign="top">

**Property Management**
- Multi-step property setup wizard
- Room-by-room configuration
- Move-in photo storage for comparison

</td>
<td width="50%" valign="top">

**Legal Compliance**
- State-specific deposit rules (10 launch states)
- Frozen rules on each turnover for audit trail
- Automatic deadline calculation (calendar/business days)

</td>
</tr>
<tr>
<td width="50%" valign="top">

**Inspection Workflow**
- Room-by-room condition assessment
- Photo capture with compression
- Standard checklist per room
- Side-by-side move-in/move-out comparison

</td>
<td width="50%" valign="top">

**Deposit Accounting**
- Itemized deduction tracking by room
- Real-time refund calculation
- Over-deduction alerts
- Return method tracking

</td>
</tr>
<tr>
<td width="50%" valign="top">

**Tenant Portal**
- Magic-link access (no account needed)
- Deposit breakdown view
- Per-deduction dispute flow
- Acknowledgment recording

</td>
<td width="50%" valign="top">

**E-Sign & Disputes**
- Canvas-based signature capture
- Landlord/tenant dual signatures
- Dispute resolution (uphold/adjust/remove)
- Full audit trail in Firestore

</td>
</tr>
<tr>
<td width="50%" valign="top">

**Vendor Management**
- Vendor directory with specialties
- Quick dispatch during turnovers
- Contact info at a glance

</td>
<td width="50%" valign="top">

**Notifications & PWA**
- Deadline-based toast notifications
- Offline-capable service worker
- Installable on mobile devices
- Network-first with cache fallback

</td>
</tr>
</table>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4, shadcn/ui |
| Auth | Firebase Auth (email/password + Google OAuth) |
| Database | Cloud Firestore (offline persistence) |
| Storage | Firebase Storage (photos) |
| Functions | Cloud Functions 2nd gen (Node 20) |
| Forms | React Hook Form + Zod |
| Dates | date-fns |
| Hosting | Firebase Hosting |
| PWA | Custom service worker, Web App Manifest |

## Architecture

```
src/
├── components/
│   ├── auth/           # ProtectedRoute, PublicRoute
│   ├── layout/         # AppLayout, AuthLayout
│   ├── turnover/       # PhotoComparison, ESignPanel, DisputeList, RefundPanel
│   └── ui/             # shadcn/ui components
├── config/
│   ├── state-rules/    # JSON rules per state + loader
│   ├── room-defaults.ts
│   └── us-states.ts
├── contexts/           # AuthContext
├── hooks/              # useAuth, useNotifications
├── lib/                # firebase, currency, timeline, photo-compression
├── pages/
│   ├── auth/           # SignIn, SignUp, Verify, Forgot, Onboarding
│   ├── dashboard/      # DashboardPage
│   ├── portal/         # TenantPortalPage (magic link)
│   ├── property/       # PropertyCreate, PropertyDetail
│   ├── settings/       # SettingsPage
│   ├── turnover/       # Create, Detail, Inspection, Deductions
│   └── vendor/         # VendorsPage
└── types/              # Full Firestore type definitions

functions/
└── src/index.ts        # Token exchange, cascading deletes, deadline checker

public/
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
└── icons/              # PWA icons (192px, 512px)
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Firebase CLI (`npm install -g firebase-tools`)

### Install

```bash
git clone https://github.com/SirPsycho828/TurnoverKit.git
cd TurnoverKit
npm install
cd functions && npm install && cd ..
```

### Environment Setup

Copy the example env file and fill in your Firebase config:

```bash
cp .env.example .env
```

Required variables:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Development

```bash
npm run dev
```

The app runs at `http://localhost:5173` with hot module replacement.

### Build & Deploy

```bash
npm run build                          # Build frontend
cd functions && npm run build && cd .. # Build Cloud Functions
firebase deploy                        # Deploy everything
```

## Supported States

TurnoverKit ships with detailed deposit law rules for 10 states at launch:

| State | Return Deadline | Itemization Required |
|-------|----------------|---------------------|
| California | 21 calendar days | Yes |
| Texas | 30 calendar days | Yes |
| Florida | 15–30 calendar days | Yes |
| New York | 14 calendar days | Yes |
| Ohio | 30 calendar days | Yes |
| Pennsylvania | 30 calendar days | Yes |
| Illinois | 30–45 calendar days | Yes |
| Georgia | 30 calendar days | Yes |
| North Carolina | 30 calendar days | No |
| Arizona | 14 business days | Yes |

All other states use conservative default rules. State rules are frozen onto each turnover document at creation for legal auditability.

## Security

- Firestore security rules enforce landlord-only access to their data
- Storage rules limit uploads to images under 10MB
- Tenant portal uses magic-link tokens with 365-day expiry
- All monetary amounts stored as integers (cents) to avoid floating point issues
- Cloud Functions handle token exchange for tenant portal auth
- No sensitive data exposed to client beyond what the user owns
</div>
