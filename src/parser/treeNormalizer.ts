import { TreeData, Person, Family, Gender, VitalEvent } from '../types';

/**
 * Robust JSON normalizer that converts any genealogical JSON format
 * (array-based, record-based, Gramps JSON, legacy schemas, or event-array formats)
 * into a canonical, fully-linked `TreeData` structure.
 *
 * Capabilities:
 * - Array vs Object: Converts `people` / `persons` arrays into `Record<string, Person>`.
 * - Array vs Object: Converts `families` arrays into `Record<string, Family>`.
 * - Aliases: Maps `husbandId`/`husb` -> `husband`, `wifeId` -> `wife`, `childrenIds` -> `children`.
 * - Event arrays: Extracts `Birth`, `Death`, and `Marriage` events from generic `events: []` arrays.
 * - String vs Array: Converts single-string `fams` into `string[]`.
 * - Bidirectional Linking: Patches missing `famc` pointers on children and `fams` pointers on spouses.
 * - Gender normalization: Coerces any casing or values into 'M' | 'F' | 'O' | 'U'.
 */
export function normalizeTreeData(input: unknown): TreeData {
  if (!input || typeof input !== 'object') {
    return {
      people: {},
      families: {},
      media: {}
    };
  }

  const raw = input as Record<string, any>;
  const people: Record<string, Person> = {};
  const families: Record<string, Family> = {};

  // -------------------------------------------------------------------------
  // 1. Normalize People / Persons
  // -------------------------------------------------------------------------
  const rawPeopleList: any[] = Array.isArray(raw.people)
    ? raw.people
    : Array.isArray(raw.persons)
    ? raw.persons
    : raw.people && typeof raw.people === 'object'
    ? Object.values(raw.people)
    : raw.persons && typeof raw.persons === 'object'
    ? Object.values(raw.persons)
    : [];

  for (const p of rawPeopleList) {
    if (!p || typeof p !== 'object' || !p.id) continue;

    const id = String(p.id).trim();
    if (!id) continue;

    // Resolve Birth and Death (either directly provided or extracted from events array)
    let birth: VitalEvent | undefined = p.birth;
    let death: VitalEvent | undefined = p.death;

    if (Array.isArray(p.events)) {
      for (const ev of p.events) {
        if (!ev || typeof ev !== 'object') continue;
        const type = String(ev.type || ev.tag || '').toLowerCase();
        if ((type === 'birth' || type === 'birt') && !birth) {
          birth = {
            date: ev.date || undefined,
            year: typeof ev.year === 'number' ? ev.year : undefined,
            place: ev.place || undefined,
            description: ev.description || undefined
          };
        } else if ((type === 'death' || type === 'deat') && !death) {
          death = {
            date: ev.date || undefined,
            year: typeof ev.year === 'number' ? ev.year : undefined,
            place: ev.place || undefined,
            description: ev.description || undefined
          };
        }
      }
    }

    // Normalize spouse family links (fams)
    let fams: string[] = [];
    if (Array.isArray(p.fams)) {
      fams = p.fams.map(String).filter(Boolean);
    } else if (typeof p.fams === 'string' && p.fams.trim()) {
      fams = [p.fams.trim()];
    }

    // Normalize gender
    let gender: Gender = 'U';
    if (p.gender) {
      const g = String(p.gender).toUpperCase();
      if (g === 'M' || g === 'MALE') gender = 'M';
      else if (g === 'F' || g === 'FEMALE') gender = 'F';
      else if (g === 'O' || g === 'OTHER') gender = 'O';
      else gender = 'U';
    }

    // Name resolution
    const fullName = p.fullName || (p.first && p.surname ? `${p.first} ${p.surname}` : p.name || id);
    const first = p.first || fullName.split(' ')[0] || '';
    const surname = p.surname || fullName.split(' ').slice(1).join(' ') || '';

    people[id] = {
      ...p,
      id,
      fullName,
      first,
      surname,
      gender,
      birth,
      death,
      famc: p.famc ? String(p.famc).trim() : undefined,
      fams
    };
  }

  // -------------------------------------------------------------------------
  // 2. Normalize Families
  // -------------------------------------------------------------------------
  const rawFamiliesList: any[] = Array.isArray(raw.families)
    ? raw.families
    : raw.families && typeof raw.families === 'object'
    ? Object.values(raw.families)
    : [];

  for (const f of rawFamiliesList) {
    if (!f || typeof f !== 'object' || !f.id) continue;

    const id = String(f.id).trim();
    if (!id) continue;

    const husbandRaw = f.husband || f.husbandId || f.husb;
    const wifeRaw = f.wife || f.wifeId;

    const husband = husbandRaw ? String(husbandRaw).trim() : undefined;
    const wife = wifeRaw ? String(wifeRaw).trim() : undefined;

    // Children array resolution
    let children: string[] = [];
    const rawChildren = f.children || f.childrenIds || f.childIds;
    if (Array.isArray(rawChildren)) {
      children = rawChildren.map(String).map(s => s.trim()).filter(Boolean);
    }

    // Marriage event extraction
    let marriage: VitalEvent | undefined = f.marriage;
    if (!marriage && Array.isArray(f.events)) {
      const marrEv = f.events.find((ev: any) => {
        if (!ev || typeof ev !== 'object') return false;
        const t = String(ev.type || ev.tag || '').toLowerCase();
        return t === 'marriage' || t === 'marr';
      });
      if (marrEv) {
        marriage = {
          date: marrEv.date || undefined,
          year: typeof marrEv.year === 'number' ? marrEv.year : undefined,
          place: marrEv.place || undefined,
          description: marrEv.description || undefined
        };
      }
    }

    families[id] = {
      ...f,
      id,
      husband,
      wife,
      children,
      marriage
    };
  }

  // -------------------------------------------------------------------------
  // 3. Bidirectional Graph Repair
  // -------------------------------------------------------------------------
  // Connect family spouse & child references even if one direction was omitted in raw JSON
  for (const [famId, fam] of Object.entries(families)) {
    if (fam.husband && people[fam.husband]) {
      if (!people[fam.husband].fams.includes(famId)) {
        people[fam.husband].fams.push(famId);
      }
    }
    if (fam.wife && people[fam.wife]) {
      if (!people[fam.wife].fams.includes(famId)) {
        people[fam.wife].fams.push(famId);
      }
    }
    for (const childId of fam.children) {
      if (people[childId]) {
        if (!people[childId].famc) {
          people[childId].famc = famId;
        }
      }
    }
  }

  // Also verify reverse: if a person has famc pointing to a family, ensure person is in family's children
  for (const [personId, person] of Object.entries(people)) {
    if (person.famc && families[person.famc]) {
      if (!families[person.famc].children.includes(personId)) {
        families[person.famc].children.push(personId);
      }
    }
    for (const famId of person.fams) {
      if (families[famId]) {
        if (!families[famId].husband && !families[famId].wife) {
          if (person.gender === 'F') {
            families[famId].wife = personId;
          } else {
            families[famId].husband = personId;
          }
        }
      }
    }
  }

  return {
    meta: raw.meta || raw.metadata,
    people,
    families,
    media: raw.media || {}
  };
}
