import defaultRules from './_default.json';

export interface StateRules {
  stateCode: string;
  stateName: string;
  supported: boolean;
  deposit: {
    returnDeadlineDays: number;
    deadlineType: 'calendar' | 'business';
    maxDepositMonths: number | null;
    interestRequired: boolean;
    interestRate: number | null;
    itemizationRequired: boolean;
    itemizationDeadlineDays: number | null;
    receiptRequired: boolean;
  };
  inspection: {
    noticeDays: number | null;
    tenantRightToAttend: boolean;
    noticeMethod: string;
  };
  disclosures: string[];
  letterTemplate: {
    id: string;
    requiredSections: string[];
    editableSections: string[];
  };
  notes: string[];
  lastUpdated: string;
  sourceUrl: string;
}

// Lazy-load state rule files
const stateModules = import.meta.glob<{ default: StateRules }>('./*.json', { eager: true });

const stateRulesMap = new Map<string, StateRules>();

for (const [path, module] of Object.entries(stateModules)) {
  const code = path.replace('./', '').replace('.json', '').toUpperCase();
  if (code !== '_DEFAULT') {
    stateRulesMap.set(code, module.default);
  }
}

export function getStateRules(stateCode: string): StateRules {
  return stateRulesMap.get(stateCode.toUpperCase()) ?? (defaultRules as StateRules);
}

export function isStateSupported(stateCode: string): boolean {
  const rules = stateRulesMap.get(stateCode.toUpperCase());
  return rules?.supported ?? false;
}
