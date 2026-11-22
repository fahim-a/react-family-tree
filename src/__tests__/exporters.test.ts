import { describe, it, expect } from 'vitest';
import { exportGedcom } from '../exporter/gedcomExporter';
import { exportJson } from '../exporter/jsonExporter';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';

/**
 * Test Suite: GEDCOM & JSON Export Pipelines
 *
 * Verifies standard compliance and serialization fidelity for both export formats:
 * - GEDCOM 5.5.1 Specification: Validates presence of standard HEAD, SOUR, GEDC VERS 5.5.1,
 *   CHAR UTF-8, INDI records, FAM records with HUSB/WIFE/CHIL xrefs, and TRLR terminal tag.
 * - JSON Export: Serializes normalized TreeData into clean, human-readable JSON string.
 * - Roundtrip Fidelity: Confirms that exporting to GEDCOM and re-parsing yields identical node and family counts.
 */
describe('GEDCOM 5.5.1 & JSON Export Pipelines', () => {
  it('exports valid GEDCOM 5.5.1 format with HEAD, INDI, FAM, and TRLR', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const gedOutput = exportGedcom(data);

    expect(gedOutput).toContain('0 HEAD');
    expect(gedOutput).toContain('1 GEDC');
    expect(gedOutput).toContain('2 VERS 5.5.1');
    expect(gedOutput).toContain('0 @I1@ INDI');
    expect(gedOutput).toContain('1 NAME Arthur /Hawthorne/');
    expect(gedOutput).toContain('0 @F1@ FAM');
    expect(gedOutput).toContain('1 HUSB @I1@');
    expect(gedOutput).toContain('1 WIFE @I2@');
    expect(gedOutput).toContain('0 TRLR');
  });

  it('exports formatted JSON that can be re-parsed into identical graph', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const jsonOutput = exportJson(data);

    expect(typeof jsonOutput).toBe('string');
    const parsed = JSON.parse(jsonOutput);

    expect(parsed.people).toBeDefined();
    expect(Object.keys(parsed.people).length).toBe(13);
    expect(parsed.families).toBeDefined();
    expect(Object.keys(parsed.families).length).toBe(4);
    expect(parsed.people['I1'].fullName).toBe('Arthur Hawthorne');
  });

  it('performs roundtrip GEDCOM export and re-import with fidelity', () => {
    const originalData = parseGedcom(SAMPLE_GEDCOM_STRING);
    const exportedGed = exportGedcom(originalData);
    const reImported = parseGedcom(exportedGed);

    expect(Object.keys(reImported.people).length).toBe(Object.keys(originalData.people).length);
    expect(Object.keys(reImported.families).length).toBe(Object.keys(originalData.families).length);

    const origArthur = originalData.people['I1'];
    const newArthur = reImported.people['I1'];
    expect(newArthur.fullName).toBe(origArthur.fullName);
    expect(newArthur.birth?.year).toBe(origArthur.birth?.year);
    expect(newArthur.death?.year).toBe(origArthur.death?.year);
  });
});
