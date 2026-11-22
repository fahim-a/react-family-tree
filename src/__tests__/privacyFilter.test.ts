import { describe, it, expect } from 'vitest';
import { applyPrivacyFilter } from '../parser/privacyFilter';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';

/**
 * Test Suite: Living Relative Privacy & Data Protection Filter
 *
 * Verifies public privacy protection for living individuals in genealogical datasets:
 * - Uncensored Mode: When disabled, all names, exact birth dates, places, and notes are preserved.
 * - Protected Mode: Redacts living individuals' full names to "Private [Living]", masks exact birth dates
 *   and locations, strips sensitive notes, while leaving deceased historical ancestors intact.
 * - Heuristics: Uses death record presence and configurable birth year cutoff threshold (e.g. 1920).
 */
describe('Living Relative Privacy Protection Filter', () => {
  it('does not alter data when privacy is disabled', () => {
    const rawData = parseGedcom(SAMPLE_GEDCOM_STRING);
    const filtered = applyPrivacyFilter(rawData, { enabled: false });

    expect(filtered.people['I13'].fullName).toBe('Noah Hawthorne');
    expect(filtered.people['I13'].birth?.year).toBe(2021);
  });

  it('redacts living individuals when privacy is enabled', () => {
    const rawData = parseGedcom(SAMPLE_GEDCOM_STRING);
    const filtered = applyPrivacyFilter(rawData, {
      enabled: true,
      redactLiving: true,
      maskLivingName: true,
      livingCutoffYear: 1920
    });

    // Deceased person (Arthur) remains unredacted
    expect(filtered.people['I1'].fullName).toBe('Arthur Hawthorne');
    expect(filtered.people['I1'].birth?.year).toBe(1928);
    expect(filtered.people['I1'].death?.year).toBe(2005);

    // Living person (Noah) is redacted
    const noah = filtered.people['I13'];
    expect(noah.fullName).toBe('Private [Living]');
    expect(noah.first).toBe('Private [Living]');
    expect(noah.birth?.date).toBeUndefined(); // Exact date masked
    expect(noah.birth?.place).toBeUndefined(); // Place masked
  });
});
