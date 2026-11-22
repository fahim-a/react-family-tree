import { describe, it, expect } from 'vitest';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';

/**
 * Test Suite: GEDCOM Lineage-Linked File Parser
 *
 * Verifies client-side ingestion of raw GEDCOM (5.5.x & modern 7.0) text files:
 * - Tag Parsing: Extraction of level-0 INDI and FAM records.
 * - Vital Events: Mapping BIRT, DEAT, MARR dates and places into structured objects.
 * - Name Normalization: Resolving "Given /Surname/" slash-delimited syntax.
 * - Cross-Reference Resolution: Resolving @I1@, @F1@ xref pointers into bidirectional links.
 * - Historical Dates: Parsing dates across multi-century spans.
 */
describe('GEDCOM 5.5.x & 7.0 File Ingestion Engine', () => {
  it('parses sample family dataset correctly', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);

    expect(data.people).toBeDefined();
    expect(data.families).toBeDefined();
    expect(Object.keys(data.people).length).toBe(13);
    expect(Object.keys(data.families).length).toBe(4);
  });

  it('correctly maps person fields and vitals', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const arthur = data.people['I1'];

    expect(arthur).toBeDefined();
    expect(arthur.first).toBe('Arthur');
    expect(arthur.surname).toBe('Hawthorne');
    expect(arthur.fullName).toBe('Arthur Hawthorne');
    expect(arthur.gender).toBe('M');
    expect(arthur.occupation).toBe('Architect');
    expect(arthur.birth?.year).toBe(1928);
    expect(arthur.birth?.place).toBe('London, England');
    expect(arthur.death?.year).toBe(2005);
    expect(arthur.isLiving).toBe(false);
    expect(arthur.fams).toContain('F1');
  });

  it('correctly maps family unions and children', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const f1 = data.families['F1'];

    expect(f1).toBeDefined();
    expect(f1.husband).toBe('I1');
    expect(f1.wife).toBe('I2');
    expect(f1.children).toEqual(['I3', 'I5']);
    expect(f1.marriage?.year).toBe(1954);
    expect(f1.marriage?.place).toBe('Edinburgh, Scotland');
  });

  it('detects living status properly based on dates', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);
    const noah = data.people['I13']; // Born 2021, no death date

    expect(noah).toBeDefined();
    expect(noah.first).toBe('Noah');
    expect(noah.birth?.year).toBe(2021);
    expect(noah.isLiving).toBe(true);
  });
});
