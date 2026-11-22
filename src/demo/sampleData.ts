import { parseGedcom } from '../parser/gedcomParser';
import { TreeData } from '../types';

export const SAMPLE_GEDCOM_STRING = `0 HEAD
1 SOUR ReactFamilyTree
2 VERS 1.0.0
2 NAME React Family Tree Component Demo
1 DATE 21 NOV 2026
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @SUBM1@
0 @SUBM1@ SUBM
1 NAME Open Source Genealogy Project
0 @I1@ INDI
1 NAME Arthur /Hawthorne/
2 GIVN Arthur
2 SURN Hawthorne
1 SEX M
1 BIRT
2 DATE 12 APR 1928
2 PLAC London, England
1 DEAT
2 DATE 18 NOV 2005
2 PLAC Oxford, England
1 OCCU Architect
1 FAMS @F1@
0 @I2@ INDI
1 NAME Eleanor /Vance/
2 GIVN Eleanor
2 SURN Vance
1 SEX F
1 BIRT
2 DATE 04 AUG 1931
2 PLAC Edinburgh, Scotland
1 DEAT
2 DATE 22 MAY 2012
2 PLAC Oxford, England
1 OCCU Botanical Illustrator
1 FAMS @F1@
0 @I3@ INDI
1 NAME Julian /Hawthorne/
2 GIVN Julian
2 SURN Hawthorne
1 SEX M
1 BIRT
2 DATE 15 SEP 1956
2 PLAC Cambridge, England
1 OCCU Software Engineer
1 FAMC @F1@
1 FAMS @F2@
0 @I4@ INDI
1 NAME Clara /Sterling/
2 GIVN Clara
2 SURN Sterling
1 SEX F
1 BIRT
2 DATE 28 FEB 1959
2 PLAC Boston, MA, USA
1 OCCU Neurologist
1 FAMS @F2@
0 @I5@ INDI
1 NAME Beatrice /Hawthorne/
2 GIVN Beatrice
2 SURN Hawthorne
1 SEX F
1 BIRT
2 DATE 10 OCT 1960
2 PLAC Cambridge, England
1 OCCU Novelist
1 FAMC @F1@
1 FAMS @F3@
0 @I6@ INDI
1 NAME Marcus /Chen/
2 GIVN Marcus
2 SURN Chen
1 SEX M
1 BIRT
2 DATE 03 JUN 1958
2 PLAC Vancouver, BC, Canada
1 OCCU Astrophysicist
1 FAMS @F3@
0 @I7@ INDI
1 NAME Oliver /Hawthorne/
2 GIVN Oliver
2 SURN Hawthorne
1 SEX M
1 BIRT
2 DATE 24 JUL 1984
2 PLAC Seattle, WA, USA
1 OCCU Marine Biologist
1 FAMC @F2@
1 FAMS @F4@
0 @I8@ INDI
1 NAME Sophia /Alvarez/
2 GIVN Sophia
2 SURN Alvarez
1 SEX F
1 BIRT
2 DATE 19 NOV 1987
2 PLAC Madrid, Spain
1 OCCU Graphic Designer
1 FAMS @F4@
0 @I9@ INDI
1 NAME Lucas /Hawthorne/
2 GIVN Lucas
2 SURN Hawthorne
1 SEX M
1 BIRT
2 DATE 02 MAY 1989
2 PLAC Seattle, WA, USA
1 OCCU Chef
1 FAMC @F2@
0 @I10@ INDI
1 NAME Maya /Chen/
2 GIVN Maya
2 SURN Chen
1 SEX F
1 BIRT
2 DATE 14 JAN 1991
2 PLAC Toronto, ON, Canada
1 OCCU Data Scientist
1 FAMC @F3@
0 @I11@ INDI
1 NAME Liam /Chen/
2 GIVN Liam
2 SURN Chen
1 SEX M
1 BIRT
2 DATE 30 AUG 1995
2 PLAC Toronto, ON, Canada
1 OCCU Musician
1 FAMC @F3@
0 @I12@ INDI
1 NAME Emma /Hawthorne/
2 GIVN Emma
2 SURN Hawthorne
1 SEX F
1 BIRT
2 DATE 16 MAR 2018
2 PLAC Portland, OR, USA
1 FAMC @F4@
0 @I13@ INDI
1 NAME Noah /Hawthorne/
2 GIVN Noah
2 SURN Hawthorne
1 SEX M
1 BIRT
2 DATE 09 SEP 2021
2 PLAC Portland, OR, USA
1 FAMC @F4@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I5@
1 MARR
2 DATE 14 JUN 1954
2 PLAC Edinburgh, Scotland
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I7@
1 CHIL @I9@
1 MARR
2 DATE 20 AUG 1982
2 PLAC Boston, MA, USA
0 @F3@ FAM
1 HUSB @I6@
1 WIFE @I5@
1 CHIL @I10@
1 CHIL @I11@
1 MARR
2 DATE 12 SEP 1988
2 PLAC London, England
0 @F4@ FAM
1 HUSB @I7@
1 WIFE @I8@
1 CHIL @I12@
1 CHIL @I13@
1 MARR
2 DATE 05 MAY 2015
181: 2 PLAC Seattle, WA, USA
182: 0 TRLR`;

export const SAMPLE_MEDIA_ITEMS = {
  M0001: {
    id: 'M0001',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&auto=format&fit=crop&q=80',
    title: 'Arthur Hawthorne (Fellowship Portrait)',
    description: 'Portrait taken upon election as Fellow of the Royal Institute of British Architects.',
    date: '15 OCT 1968',
    year: 1968,
    place: 'London, England',
    type: 'portrait' as const,
    taggedPeople: [
      { personId: 'I1', isPrimaryAvatar: true }
    ]
  },
  M0002: {
    id: 'M0002',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=700&auto=format&fit=crop&q=80',
    title: 'Eleanor Vance in the Oxford Studio',
    description: 'Eleanor at work on botanical illustrations for the Royal Horticultural Society catalog.',
    date: '22 APR 1974',
    year: 1974,
    place: 'Oxford, England',
    type: 'portrait' as const,
    taggedPeople: [
      { personId: 'I2', isPrimaryAvatar: true }
    ]
  },
  M0003: {
    id: 'M0003',
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=900&auto=format&fit=crop&q=80',
    title: 'Hawthorne Family Golden Reunion',
    description: 'Celebration of Arthur and Eleanor’s Golden Anniversary surrounded by children and grandchildren.',
    date: '14 JUN 2004',
    year: 2004,
    place: 'Edinburgh, Scotland',
    type: 'group' as const,
    taggedPeople: [
      { personId: 'I1', isPrimaryAvatar: false },
      { personId: 'I2', isPrimaryAvatar: false },
      { personId: 'I3', isPrimaryAvatar: false },
      { personId: 'I5', isPrimaryAvatar: false },
      { personId: 'I7', isPrimaryAvatar: false }
    ]
  },
  M0004: {
    id: 'M0004',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=700&auto=format&fit=crop&q=80',
    title: 'Julian Hawthorne at Cambridge Labs',
    description: 'Early software engineering days working on mainframe compilers.',
    date: '12 MAR 1985',
    year: 1985,
    place: 'Cambridge, England',
    type: 'portrait' as const,
    taggedPeople: [
      { personId: 'I3', isPrimaryAvatar: true }
    ]
  },
  M0005: {
    id: 'M0005',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&auto=format&fit=crop&q=80',
    title: 'Oliver & Sophia Alvarez Wedding Reception',
    description: 'Wedding celebration in Seattle with brother Lucas serving as best man.',
    date: '05 MAY 2015',
    year: 2015,
    place: 'Seattle, WA, USA',
    type: 'group' as const,
    taggedPeople: [
      { personId: 'I7', isPrimaryAvatar: false },
      { personId: 'I8', isPrimaryAvatar: true },
      { personId: 'I9', isPrimaryAvatar: false }
    ]
  }
};

export function getSampleTreeWithMedia(): TreeData {
  const tree = parseGedcom(SAMPLE_GEDCOM_STRING);
  tree.media = { ...SAMPLE_MEDIA_ITEMS };

  Object.values(SAMPLE_MEDIA_ITEMS).forEach(media => {
    media.taggedPeople.forEach(tag => {
      const person = tree.people[tag.personId];
      if (person) {
        const existing = person.mediaIds || [];
        person.mediaIds = existing.includes(media.id) ? existing : [...existing, media.id];
        if (tag.isPrimaryAvatar) {
          person.avatar = media.url;
          person.avatarMediaId = media.id;
        }
      }
    });
  });

  return tree;
}
