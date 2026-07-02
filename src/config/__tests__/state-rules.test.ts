import { describe, it, expect } from 'vitest';
import { US_STATES } from '@/config/us-states';
import { getStateRules, isStateSupported } from '@/config/state-rules';

describe('US_STATES', () => {
  it('contains all 50 states plus DC', () => {
    expect(US_STATES).toHaveLength(51);
  });

  it('has unique, uppercase two-letter codes', () => {
    const codes = US_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });
});

describe('getStateRules', () => {
  it('returns the default rules for an unknown state code', () => {
    const rules = getStateRules('ZZ');
    expect(rules).toBeDefined();
    expect(rules.deposit).toBeDefined();
    expect(typeof rules.deposit.returnDeadlineDays).toBe('number');
  });

  it('is case-insensitive for the state code', () => {
    expect(getStateRules('ca')).toEqual(getStateRules('CA'));
  });
});

describe('isStateSupported', () => {
  it('returns false for an unknown state code', () => {
    expect(isStateSupported('ZZ')).toBe(false);
  });
});
