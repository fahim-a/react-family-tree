import { TreeData, Person, Family } from '../types';

/**
 * Serializes a TreeData graph back into standard GEDCOM 5.5.1 format.
 */
export function exportGedcom(data: TreeData): string {
  const lines: string[] = [];

  // Header
  lines.push('0 HEAD');
  lines.push('1 SOUR ReactFamilyTree');
  lines.push('2 VERS 1.0.0');
  lines.push('2 NAME React Family Tree Component');
  lines.push(`1 DATE ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push('0 @SUBM1@ SUBM');
  lines.push('1 NAME Open Source Genealogy Project');

  // Individuals
  Object.values(data.people).forEach((p: Person) => {
    lines.push(`0 @${p.id}@ INDI`);
    
    // Name
    const first = p.first || (p.fullName ? p.fullName.split(' ')[0] : 'Unknown');
    const surname = p.surname || (p.fullName ? p.fullName.split(' ').slice(1).join(' ') : '');
    lines.push(`1 NAME ${first} /${surname}/`);
    if (first) lines.push(`2 GIVN ${first}`);
    if (surname) lines.push(`2 SURN ${surname}`);

    // Gender
    if (p.gender && p.gender !== 'U') {
      lines.push(`1 SEX ${p.gender}`);
    }

    // Birth
    if (p.birth && (p.birth.date || p.birth.year || p.birth.place)) {
      lines.push('1 BIRT');
      if (p.birth.date) {
        lines.push(`2 DATE ${p.birth.date}`);
      } else if (p.birth.year) {
        lines.push(`2 DATE ${p.birth.year}`);
      }
      if (p.birth.place) {
        lines.push(`2 PLAC ${p.birth.place}`);
      }
    }

    // Death
    if (!p.isLiving || p.death) {
      if (p.death && (p.death.date || p.death.year || p.death.place)) {
        lines.push('1 DEAT');
        if (p.death.date) {
          lines.push(`2 DATE ${p.death.date}`);
        } else if (p.death.year) {
          lines.push(`2 DATE ${p.death.year}`);
        }
        if (p.death.place) {
          lines.push(`2 PLAC ${p.death.place}`);
        }
      } else if (!p.isLiving) {
        lines.push('1 DEAT Y');
      }
    }

    // Occupation
    if (p.occupation) {
      lines.push(`1 OCCU ${p.occupation}`);
    }

    // Biography / Notes
    if (p.bio) {
      lines.push(`1 NOTE ${p.bio.replace(/\r?\n/g, ' ')}`);
    }

    // Custom Attributes
    if (p.attributes) {
      Object.entries(p.attributes).forEach(([key, val]) => {
        lines.push(`1 EVEN ${val}`);
        lines.push(`2 TYPE ${key}`);
      });
    }

    // Family Links
    if (p.famc) {
      lines.push(`1 FAMC @${p.famc}@`);
    }

    p.fams.forEach(famId => {
      lines.push(`1 FAMS @${famId}@`);
    });
  });

  // Families
  Object.values(data.families).forEach((f: Family) => {
    lines.push(`0 @${f.id}@ FAM`);
    if (f.husband) lines.push(`1 HUSB @${f.husband}@`);
    if (f.wife) lines.push(`1 WIFE @${f.wife}@`);

    f.children.forEach(cid => {
      lines.push(`1 CHIL @${cid}@`);
    });

    if (f.marriage && (f.marriage.date || f.marriage.year || f.marriage.place)) {
      lines.push('1 MARR');
      if (f.marriage.date) {
        lines.push(`2 DATE ${f.marriage.date}`);
      } else if (f.marriage.year) {
        lines.push(`2 DATE ${f.marriage.year}`);
      }
      if (f.marriage.place) {
        lines.push(`2 PLAC ${f.marriage.place}`);
      }
    }
  });

  // Trailer
  lines.push('0 TRLR');

  return lines.join('\n');
}

/**
 * Triggers a browser download of the tree as a .ged file.
 */
export function downloadGedcomFile(data: TreeData, filename = 'family_tree.ged') {
  if (typeof document === 'undefined') return;
  const gedContent = exportGedcom(data);
  const blob = new Blob([gedContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
