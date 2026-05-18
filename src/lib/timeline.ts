import { addDays } from 'date-fns';
import type { FrozenStateRules } from '@/types';

export interface MilestoneTemplate {
  key: string;
  title: string;
  order: number;
  dateLogic: (moveOutDate: Date, depositDueDate: Date, stateRules: FrozenStateRules) => Date | null;
  linksTo: string;
  requiresDeposit: boolean;
}

export const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  {
    key: 'send_acknowledgment',
    title: 'Send move-out acknowledgment to tenant',
    order: 1,
    dateLogic: (moveOut, _, rules) =>
      rules.inspectionNoticeDays ? addDays(moveOut, -rules.inspectionNoticeDays) : moveOut,
    linksTo: 'template',
    requiresDeposit: false,
  },
  {
    key: 'share_portal',
    title: 'Generate and share tenant portal link',
    order: 2,
    dateLogic: () => null,
    linksTo: 'portal',
    requiresDeposit: false,
  },
  {
    key: 'schedule_inspection',
    title: 'Schedule move-out inspection',
    order: 3,
    dateLogic: (moveOut) => addDays(moveOut, -7),
    linksTo: 'datepicker',
    requiresDeposit: false,
  },
  {
    key: 'conduct_inspection',
    title: 'Conduct inspection',
    order: 4,
    dateLogic: (moveOut) => moveOut,
    linksTo: 'inspection',
    requiresDeposit: false,
  },
  {
    key: 'document_condition',
    title: 'Document condition room-by-room',
    order: 5,
    dateLogic: (moveOut) => moveOut,
    linksTo: 'inspection',
    requiresDeposit: false,
  },
  {
    key: 'compare_photos',
    title: 'Compare with move-in photos',
    order: 6,
    dateLogic: () => null,
    linksTo: 'comparison',
    requiresDeposit: false,
  },
  {
    key: 'draft_deductions',
    title: 'Draft deduction itemization',
    order: 7,
    dateLogic: () => null,
    linksTo: 'deductions',
    requiresDeposit: true,
  },
  {
    key: 'sign_report',
    title: 'Get inspection report signed',
    order: 8,
    dateLogic: () => null,
    linksTo: 'esign',
    requiresDeposit: true,
  },
  {
    key: 'send_itemization',
    title: 'Send itemization to tenant',
    order: 9,
    dateLogic: (_, depositDue) => depositDue,
    linksTo: 'deductions',
    requiresDeposit: true,
  },
  {
    key: 'dispatch_vendors',
    title: 'Dispatch vendors for repairs/cleaning',
    order: 10,
    dateLogic: () => null,
    linksTo: 'vendors',
    requiresDeposit: false,
  },
  {
    key: 'return_deposit',
    title: 'Return deposit or send invoice',
    order: 11,
    dateLogic: (_, depositDue) => depositDue,
    linksTo: 'refund',
    requiresDeposit: true,
  },
  {
    key: 'relist_ready',
    title: 'Verify unit is relist-ready',
    order: 12,
    dateLogic: () => null,
    linksTo: 'relist',
    requiresDeposit: false,
  },
];

export interface Milestone {
  key: string;
  title: string;
  order: number;
  targetDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  linksTo: string;
}

export function generateMilestones(
  moveOutDate: Date,
  depositDueDate: Date,
  stateRules: FrozenStateRules,
  depositAmount: number,
): Milestone[] {
  return MILESTONE_TEMPLATES
    .filter((t) => !t.requiresDeposit || depositAmount > 0)
    .map((t) => ({
      key: t.key,
      title: t.title,
      order: t.order,
      targetDate: t.dateLogic(moveOutDate, depositDueDate, stateRules),
      completed: false,
      completedAt: null,
      linksTo: t.linksTo,
    }));
}
