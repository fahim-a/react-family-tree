import { TreeData, Person, Family, Gender, VitalEvent } from '../types';

function extractYear(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/\b\d{4}\b/);
  return match ? parseInt(match[0], 10) : undefined;
}

function cleanId(raw: string): string {
  return raw.replace(/@/g, '').trim();
}

/**
 * Pure TypeScript GEDCOM 5.5.1 / 7 parser.
 * Ingests a raw GEDCOM file string and produces normalized TreeData.
 */
export function parseGedcom(gedcomContent: string): TreeData {
  const lines = gedcomContent.split(/\r?\n/);
  
  const people: Record<string, Person> = {};
  const families: Record<string, Family> = {};
  
  let currentRecordType: 'INDI' | 'FAM' | 'HEAD' | null = null;
  let currentPerson: (Partial<Person> & { _lastEventValue?: string }) | null = null;
  let currentFamily: Partial<Family> | null = null;
  let currentSubContext: 'BIRT' | 'DEAT' | 'MARR' | 'EVEN' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // GEDCOM syntax: <level> [<tag>|<xref>] [<value>]
    const match = rawLine.match(/^(\d+)\s+(@[^@]+@|[A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const part1 = match[2];
    const part2 = match[3] || '';

    // Check for level 0 records: 0 @ID@ INDI or 0 @ID@ FAM or 0 HEAD
    if (level === 0) {
      // Commit previous
      if (currentRecordType === 'INDI' && currentPerson && currentPerson.id) {
        people[currentPerson.id] = finalizePerson(currentPerson);
      } else if (currentRecordType === 'FAM' && currentFamily && currentFamily.id) {
        families[currentFamily.id] = finalizeFamily(currentFamily);
      }

      currentSubContext = null;

      if (part2 === 'INDI') {
        currentRecordType = 'INDI';
        currentPerson = {
          id: cleanId(part1),
          fams: [],
          notes: []
        };
        currentFamily = null;
      } else if (part2 === 'FAM') {
        currentRecordType = 'FAM';
        currentFamily = {
          id: cleanId(part1),
          children: []
        };
        currentPerson = null;
      } else {
        currentRecordType = null;
        currentPerson = null;
        currentFamily = null;
      }
      continue;
    }

    // Inside INDI record
    if (currentRecordType === 'INDI' && currentPerson) {
      if (level === 1) {
        currentSubContext = null;
        if (part1 === 'NAME') {
          // Format: Given /Surname/
          const surnameMatch = part2.match(/\/([^/]+)\//);
          const surname = surnameMatch ? surnameMatch[1].trim() : '';
          const first = part2.replace(/\/[^/]+\//, '').trim();
          currentPerson.first = first;
          currentPerson.surname = surname;
          currentPerson.fullName = surname ? `${first} ${surname}` : first;
        } else if (part1 === 'SEX') {
          const s = part2.toUpperCase().trim();
          currentPerson.gender = (s === 'M' || s === 'F') ? s : 'U';
        } else if (part1 === 'BIRT') {
          currentSubContext = 'BIRT';
          if (!currentPerson.birth) currentPerson.birth = {};
        } else if (part1 === 'DEAT') {
          currentSubContext = 'DEAT';
          if (!currentPerson.death) currentPerson.death = {};
        } else if (part1 === 'OCCU') {
          currentPerson.occupation = part2.trim();
        } else if (part1 === 'FAMC') {
          currentPerson.famc = cleanId(part2);
        } else if (part1 === 'FAMS') {
          currentPerson.fams?.push(cleanId(part2));
        } else if (part1 === 'NOTE') {
          currentPerson.notes?.push(part2.trim());
        } else if (part1 === 'EVEN') {
          currentSubContext = 'EVEN';
          currentPerson._lastEventValue = part2.trim();
        }
      } else if (level === 2 && currentSubContext) {
        if (currentSubContext === 'EVEN') {
          if (part1 === 'TYPE' && currentPerson._lastEventValue) {
            currentPerson.attributes ||= {};
            currentPerson.attributes[part2.trim()] = currentPerson._lastEventValue;
          }
        } else {
          const targetEvent: VitalEvent = currentSubContext === 'BIRT' 
            ? (currentPerson.birth ||= {}) 
            : (currentPerson.death ||= {});

          if (part1 === 'DATE') {
            targetEvent.date = part2.trim();
            targetEvent.year = extractYear(part2);
          } else if (part1 === 'PLAC') {
            targetEvent.place = part2.trim();
          } else if (part1 === 'NOTE') {
            targetEvent.description = part2.trim();
          }
        }
      }
    }

    // Inside FAM record
    if (currentRecordType === 'FAM' && currentFamily) {
      if (level === 1) {
        currentSubContext = null;
        if (part1 === 'HUSB') {
          currentFamily.husband = cleanId(part2);
        } else if (part1 === 'WIFE') {
          currentFamily.wife = cleanId(part2);
        } else if (part1 === 'CHIL') {
          currentFamily.children?.push(cleanId(part2));
        } else if (part1 === 'MARR') {
          currentSubContext = 'MARR';
          if (!currentFamily.marriage) currentFamily.marriage = {};
        }
      } else if (level === 2 && currentSubContext === 'MARR') {
        const mEvent = (currentFamily.marriage ||= {});
        if (part1 === 'DATE') {
          mEvent.date = part2.trim();
          mEvent.year = extractYear(part2);
        } else if (part1 === 'PLAC') {
          mEvent.place = part2.trim();
        }
      }
    }
  }

  // Commit last record
  if (currentRecordType === 'INDI' && currentPerson && currentPerson.id) {
    people[currentPerson.id] = finalizePerson(currentPerson);
  } else if (currentRecordType === 'FAM' && currentFamily && currentFamily.id) {
    families[currentFamily.id] = finalizeFamily(currentFamily);
  }

  return {
    meta: {
      title: 'Family Tree',
      totalPeople: Object.keys(people).length,
      totalFamilies: Object.keys(families).length
    },
    people,
    families
  };
}

function finalizePerson(p: Partial<Person>): Person {
  const currentYear = new Date().getFullYear();
  const birthYear = p.birth?.year;
  const isDeceased = !!p.death?.date || !!p.death?.year;
  
  // Living person detection: no death record AND (birth year > currentYear - 105 or no birth date)
  const isLiving = !isDeceased && (birthYear ? birthYear > (currentYear - 105) : true);

  return {
    id: p.id || 'UNKNOWN',
    first: p.first || '',
    surname: p.surname || '',
    fullName: p.fullName || `${p.first || ''} ${p.surname || ''}`.trim() || 'Unknown',
    gender: (p.gender as Gender) || 'U',
    birth: p.birth,
    death: p.death,
    occupation: p.occupation,
    famc: p.famc,
    fams: p.fams || [],
    notes: p.notes || [],
    attributes: p.attributes || {},
    isLiving
  };
}

function finalizeFamily(f: Partial<Family>): Family {
  return {
    id: f.id || 'UNKNOWN',
    husband: f.husband,
    wife: f.wife,
    children: f.children || [],
    marriage: f.marriage
  };
}
