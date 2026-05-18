import type { Timestamp } from 'firebase/firestore';

// --- User ---
export interface User {
  email: string;
  state: string; // Two-letter code
  unitCount: number;
  onboardingComplete: boolean;
  fcmToken?: string;
  estimatedStorageBytes?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Property ---
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface MoveInPhoto {
  roomName: string;
  photoUrls: string[];
  uploadedAt: Timestamp;
}

export interface Property {
  landlordId: string;
  name: string;
  address: Address;
  rooms: string[];
  leaseDepositAmount: number; // cents
  petDeposit: number; // cents
  leaseStartDate?: Timestamp;
  moveInPhotos: MoveInPhoto[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Turnover ---
export type TurnoverStatus =
  | 'notice_received'
  | 'inspection_scheduled'
  | 'inspection_complete'
  | 'deductions_drafted'
  | 'tenant_review'
  | 'finalized'
  | 'archived';

export interface FrozenStateRules {
  returnDeadlineDays: number;
  deadlineType: 'calendar' | 'business';
  itemizationRequired: boolean;
  interestRequired: boolean;
  inspectionNoticeDays: number | null;
  tenantRightToAttend: boolean;
  requiredDisclosures: string[];
  letterTemplateId: string;
  receiptRequired: boolean;
}

export interface RelistChecklistItem {
  label: string;
  checked: boolean;
}

export interface Turnover {
  landlordId: string;
  propertyId: string;
  tenantName: string;
  moveOutDate: Timestamp;
  status: TurnoverStatus;
  depositAmount: number; // cents
  petDeposit: number; // cents
  stateRules: FrozenStateRules;
  portalToken: string;
  portalExpiresAt: Timestamp;
  inspectionDate?: Timestamp;
  inspectionComplete: boolean;
  depositDueDate: Timestamp;
  totalDeductions: number; // cents
  refundAmount: number; // cents
  relistReady: boolean;
  relistChecklist?: RelistChecklistItem[];
  returnMethod?: string;
  returnDetails?: string;
  wizardComplete?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  finalizedAt?: Timestamp;
}

// --- Room (turnover subcollection) ---
export interface RoomPhoto {
  url: string;
  thumbnailUrl: string;
  capturedAt: Timestamp;
  storagePath: string;
}

export type RoomCondition = 'good' | 'fair' | 'poor' | 'damaged';

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface Room {
  roomName: string;
  order: number;
  condition?: RoomCondition;
  notes: string;
  photos: RoomPhoto[];
  checklistItems: ChecklistItem[];
  createdAt: Timestamp;
}

// --- Deduction (turnover subcollection) ---
export type DeductionCategory = 'cleaning' | 'repair' | 'replacement' | 'damage' | 'other';

export interface Deduction {
  roomName: string;
  description: string;
  amount: number; // cents
  category: DeductionCategory;
  photoUrls: string[];
  vendorTaskId?: string;
  removed?: boolean;
  createdAt: Timestamp;
}

// --- Tenant Response (turnover subcollection) ---
export type TenantResponseType = 'acknowledgment' | 'dispute';
export type DisputeResolution = 'upheld' | 'adjusted' | 'removed';

export interface TenantResponse {
  type: TenantResponseType;
  tenantName: string;
  deductionId?: string;
  explanation?: string;
  signatureDataUrl?: string;
  status: 'submitted' | 'resolved';
  resolution?: DisputeResolution;
  originalAmount?: number;
  newAmount?: number;
  landlordNote?: string;
  resolvedAt?: Timestamp;
  createdAt: Timestamp;
}

// --- Vendor ---
export type VendorSpecialty =
  | 'cleaning'
  | 'general_repair'
  | 'plumbing'
  | 'electrical'
  | 'painting'
  | 'other';

export interface Vendor {
  landlordId: string;
  name: string;
  email: string;
  phone?: string;
  specialty: VendorSpecialty;
  notes?: string;
  createdAt: Timestamp;
}

// --- Vendor Task (turnover subcollection) ---
export type VendorTaskStatus = 'pending' | 'sent' | 'accepted' | 'complete';

export interface VendorTask {
  vendorId: string;
  description: string;
  status: VendorTaskStatus;
  roomName?: string;
  estimatedCost?: number; // cents
  actualCost?: number; // cents
  sentAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// --- Signature (turnover subcollection) ---
export interface Signature {
  role: 'landlord' | 'tenant';
  name: string;
  signatureDataUrl: string;
  signedAt: Timestamp;
  ipAddress?: string;
}

// --- With ID helper ---
export type WithId<T> = T & { id: string };
