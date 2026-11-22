import { TreeData, Person, Family, MediaItem, TaggedPerson, FaceRegion } from '../types';
import { getAncestors, getDescendants } from '../analysis/relationshipCalculator';

/**
 * Creates an empty TreeData structure.
 */
export function createEmptyTree(): TreeData {
  return {
    people: {},
    families: {},
    media: {},
    metadata: {
      source: 'ReactFamilyTree',
      date: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Generates the next sequential ID for people (e.g. I0001), families (e.g. F0001), or media (e.g. M0001).
 */
export function generateNextId(prefix: 'I' | 'F' | 'M', existingIds: string[]): string {
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  for (const id of existingIds) {
    const m = id.match(regex);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

/**
 * Adds an independent person to the tree (e.g. a new root or standalone individual).
 */
export function addPerson(
  data: TreeData,
  personData: Partial<Person>
): { data: TreeData; personId: string } {
  const people = { ...data.people };
  const id = personData.id || generateNextId('I', Object.keys(people));

  const newPerson: Person = {
    id,
    fullName: personData.fullName || `${personData.first || 'New'} ${personData.surname || 'Person'}`.trim(),
    first: personData.first || 'New',
    surname: personData.surname || 'Person',
    gender: personData.gender || 'U',
    birth: personData.birth,
    death: personData.death,
    isLiving: personData.isLiving ?? true,
    occupation: personData.occupation,
    avatar: personData.avatar,
    bio: personData.bio,
    fams: personData.fams || [],
    famc: personData.famc,
    attributes: personData.attributes || {}
  };

  people[id] = newPerson;
  return {
    data: { ...data, people },
    personId: id
  };
}

/**
 * Updates an individual's details, vitals, bio, and custom key/value pairs.
 */
export function updatePerson(
  data: TreeData,
  personId: string,
  updates: Partial<Person>
): TreeData {
  const current = data.people[personId];
  if (!current) return data;

  const updated: Person = {
    ...current,
    ...updates,
    id: personId, // ID cannot be altered
    fullName: updates.fullName || (
      updates.first !== undefined || updates.surname !== undefined
        ? `${updates.first ?? current.first ?? ''} ${updates.surname ?? current.surname ?? ''}`.trim()
        : current.fullName
    ),
    attributes: {
      ...(current.attributes || {}),
      ...(updates.attributes || {})
    }
  };

  return {
    ...data,
    people: {
      ...data.people,
      [personId]: updated
    }
  };
}

/**
 * Adds a spouse to an individual. Supports multiple spouses (each having its own family union).
 * Can create a new spouse or link an existing person from the tree.
 */
export function addSpouse(
  data: TreeData,
  personId: string,
  spouseOrId: Partial<Person> | string,
  marriageDetails?: { date?: string; year?: number; place?: string }
): { data: TreeData; spouseId: string; familyId: string } {
  let nextData = { ...data, people: { ...data.people }, families: { ...data.families } };
  const person = nextData.people[personId];
  if (!person) throw new Error(`Person ${personId} not found`);

  let spouseId: string;
  if (typeof spouseOrId === 'string') {
    spouseId = spouseOrId;
    if (!nextData.people[spouseId]) throw new Error(`Existing spouse ${spouseId} not found`);
  } else {
    const res = addPerson(nextData, spouseOrId);
    nextData = res.data;
    spouseId = res.personId;
  }

  // Create Family Union
  const famId = generateNextId('F', Object.keys(nextData.families));
  const isHusband = person.gender === 'M' || nextData.people[spouseId]?.gender === 'F';

  const newFam: Family = {
    id: famId,
    husband: isHusband ? personId : spouseId,
    wife: isHusband ? spouseId : personId,
    children: [],
    marriage: marriageDetails
  };

  nextData.families[famId] = newFam;

  // Link family to both spouses
  nextData.people[personId] = {
    ...nextData.people[personId],
    fams: [...(nextData.people[personId].fams || []), famId]
  };

  nextData.people[spouseId] = {
    ...nextData.people[spouseId],
    fams: [...(nextData.people[spouseId].fams || []), famId]
  };

  return { data: nextData, spouseId, familyId: famId };
}

/**
 * Adds a child to a parent. Can link to an existing marriage family or create a single-parent family.
 * Supports creating a new child or linking an existing individual.
 */
export function addChild(
  data: TreeData,
  parentId: string,
  childOrId: Partial<Person> | string,
  specificFamilyId?: string
): { data: TreeData; childId: string } {
  let nextData = { ...data, people: { ...data.people }, families: { ...data.families } };
  const parent = nextData.people[parentId];
  if (!parent) throw new Error(`Parent ${parentId} not found`);

  let childId: string;
  if (typeof childOrId === 'string') {
    childId = childOrId;
    if (!nextData.people[childId]) throw new Error(`Child ${childId} not found`);
  } else {
    const res = addPerson(nextData, childOrId);
    nextData = res.data;
    childId = res.personId;
  }

  // Find or create appropriate family union
  let targetFamId = specificFamilyId;
  if (!targetFamId) {
    if (parent.fams && parent.fams.length > 0) {
      targetFamId = parent.fams[0];
    } else {
      // Create single-parent family
      targetFamId = generateNextId('F', Object.keys(nextData.families));
      const isFather = parent.gender === 'M';
      nextData.families[targetFamId] = {
        id: targetFamId,
        husband: isFather ? parentId : undefined,
        wife: isFather ? undefined : parentId,
        children: []
      };
      nextData.people[parentId] = {
        ...nextData.people[parentId],
        fams: [targetFamId]
      };
    }
  }

  const fam = nextData.families[targetFamId];
  if (!fam) throw new Error(`Target family ${targetFamId} not found`);

  // Add child to family if not already present
  if (!fam.children.includes(childId)) {
    nextData.families[targetFamId] = {
      ...fam,
      children: [...fam.children, childId]
    };
  }

  // Link child's famc
  nextData.people[childId] = {
    ...nextData.people[childId],
    famc: targetFamId
  };

  return { data: nextData, childId };
}

/**
 * Adds a parent to a child. Automatically links with any existing parent or creates a new union.
 */
export function addParent(
  data: TreeData,
  childId: string,
  parentOrId: Partial<Person> | string,
  relation: 'father' | 'mother'
): { data: TreeData; parentId: string } {
  let nextData = { ...data, people: { ...data.people }, families: { ...data.families } };
  const child = nextData.people[childId];
  if (!child) throw new Error(`Child ${childId} not found`);

  let parentId: string;
  if (typeof parentOrId === 'string') {
    parentId = parentOrId;
    if (!nextData.people[parentId]) throw new Error(`Parent ${parentId} not found`);
  } else {
    const defaultGender = relation === 'father' ? 'M' : 'F';
    const res = addPerson(nextData, { ...parentOrId, gender: parentOrId.gender || defaultGender });
    nextData = res.data;
    parentId = res.personId;
  }

  // If child already has a parent family (famc)
  if (child.famc && nextData.families[child.famc]) {
    const fam = nextData.families[child.famc];
    if (relation === 'father') {
      nextData.families[child.famc] = { ...fam, husband: parentId };
    } else {
      nextData.families[child.famc] = { ...fam, wife: parentId };
    }
    // Update parent's fams
    const parentPerson = nextData.people[parentId];
    if (!parentPerson.fams.includes(child.famc)) {
      nextData.people[parentId] = {
        ...parentPerson,
        fams: [...parentPerson.fams, child.famc]
      };
    }
  } else {
    // Create new parent family
    const famId = generateNextId('F', Object.keys(nextData.families));
    nextData.families[famId] = {
      id: famId,
      husband: relation === 'father' ? parentId : undefined,
      wife: relation === 'mother' ? parentId : undefined,
      children: [childId]
    };

    nextData.people[parentId] = {
      ...nextData.people[parentId],
      fams: [...(nextData.people[parentId].fams || []), famId]
    };

    nextData.people[childId] = {
      ...nextData.people[childId],
      famc: famId
    };
  }

  return { data: nextData, parentId };
}

/**
 * Removes an individual from the tree and safely unlinks all associated family references.
 * Returns the count of downstream children affected.
 */
export function removePerson(
  data: TreeData,
  personId: string
): { data: TreeData; affectedChildrenCount: number } {
  const people = { ...data.people };
  const families = { ...data.families };
  const target = people[personId];
  if (!target) return { data, affectedChildrenCount: 0 };

  let affectedChildrenCount = 0;

  // 1. Remove from parent family (famc)
  if (target.famc && families[target.famc]) {
    const fam = families[target.famc];
    families[target.famc] = {
      ...fam,
      children: fam.children.filter(cid => cid !== personId)
    };
  }

  // 2. Handle marriage families (fams)
  target.fams.forEach(famId => {
    const fam = families[famId];
    if (!fam) return;

    affectedChildrenCount += fam.children.length;

    const remainingSpouseId = fam.husband === personId ? fam.wife : fam.husband;

    if (!remainingSpouseId && fam.children.length === 0) {
      // Empty family, delete it
      delete families[famId];
    } else if (!remainingSpouseId) {
      // Only children left: update family with no parents
      families[famId] = {
        ...fam,
        husband: undefined,
        wife: undefined
      };
    } else {
      // One spouse remaining
      families[famId] = {
        ...fam,
        husband: fam.husband === personId ? undefined : fam.husband,
        wife: fam.wife === personId ? undefined : fam.wife
      };
    }
  });

  // 3. Remove person
  delete people[personId];

  return {
    data: { ...data, people, families },
    affectedChildrenCount
  };
}

/**
 * Unlinks a specific relationship (child, spouse, or parent) without deleting the individuals.
 */
export function removeRelation(
  data: TreeData,
  relationType: 'spouse' | 'child' | 'parent',
  personId: string,
  targetId: string
): TreeData {
  const nextData = { ...data, people: { ...data.people }, families: { ...data.families } };

  if (relationType === 'child') {
    // Unlink child from parent
    const child = nextData.people[targetId];
    if (child && child.famc && nextData.families[child.famc]) {
      const fam = nextData.families[child.famc];
      if (fam.husband === personId || fam.wife === personId) {
        nextData.families[child.famc] = {
          ...fam,
          children: fam.children.filter(c => c !== targetId)
        };
        nextData.people[targetId] = {
          ...child,
          famc: undefined
        };
      }
    }
  } else if (relationType === 'spouse') {
    // Unlink spouse union
    const person = nextData.people[personId];
    if (person) {
      person.fams.forEach(fId => {
        const fam = nextData.families[fId];
        if (fam && (
          (fam.husband === personId && fam.wife === targetId) ||
          (fam.wife === personId && fam.husband === targetId)
        )) {
          // Remove union if no children, or unlink spouse
          if (fam.children.length === 0) {
            delete nextData.families[fId];
            nextData.people[personId] = {
              ...nextData.people[personId],
              fams: nextData.people[personId].fams.filter(f => f !== fId)
            };
            if (nextData.people[targetId]) {
              nextData.people[targetId] = {
                ...nextData.people[targetId],
                fams: nextData.people[targetId].fams.filter(f => f !== fId)
              };
            }
          } else {
            nextData.families[fId] = {
              ...fam,
              husband: fam.husband === targetId ? undefined : fam.husband,
              wife: fam.wife === targetId ? undefined : fam.wife
            };
            if (nextData.people[targetId]) {
              nextData.people[targetId] = {
                ...nextData.people[targetId],
                fams: nextData.people[targetId].fams.filter(f => f !== fId)
              };
            }
          }
        }
      });
    }
  }

  return nextData;
}

/**
 * Adds a photograph, document, or media item to the tree catalog,
 * and automatically links mediaIds on any tagged individuals.
 */
export function addMediaItem(
  data: TreeData,
  mediaData: Omit<MediaItem, 'id'>,
  customId?: string
): { data: TreeData; mediaId: string } {
  const media = { ...(data.media || {}) };
  const people = { ...data.people };
  const mediaId = customId || generateNextId('M', Object.keys(media));

  const newItem: MediaItem = {
    ...mediaData,
    id: mediaId,
    taggedPeople: mediaData.taggedPeople || []
  };

  media[mediaId] = newItem;

  // Link mediaId to each tagged person
  newItem.taggedPeople.forEach(tag => {
    const person = people[tag.personId];
    if (person) {
      const existingMedia = person.mediaIds || [];
      const updatedMediaIds = existingMedia.includes(mediaId) ? existingMedia : [...existingMedia, mediaId];
      people[tag.personId] = {
        ...person,
        mediaIds: updatedMediaIds,
        avatar: tag.isPrimaryAvatar ? newItem.url : person.avatar,
        avatarMediaId: tag.isPrimaryAvatar ? mediaId : person.avatarMediaId
      };
    }
  });

  return {
    data: { ...data, media, people },
    mediaId
  };
}

/**
 * Tags an individual in an existing photograph / media item,
 * with optional primary avatar assignment and face crop bounding box.
 */
export function tagPersonInMedia(
  data: TreeData,
  mediaId: string,
  personId: string,
  isPrimaryAvatar?: boolean,
  faceRegion?: FaceRegion
): TreeData {
  const media = { ...(data.media || {}) };
  const people = { ...data.people };
  const item = media[mediaId];
  const person = people[personId];

  if (!item || !person) return data;

  const existingTagIdx = item.taggedPeople.findIndex(t => t.personId === personId);
  const updatedTag: TaggedPerson = {
    personId,
    isPrimaryAvatar: isPrimaryAvatar ?? false,
    faceRegion
  };

  let updatedTags: TaggedPerson[];
  if (existingTagIdx >= 0) {
    updatedTags = [...item.taggedPeople];
    updatedTags[existingTagIdx] = updatedTag;
  } else {
    updatedTags = [...item.taggedPeople, updatedTag];
  }

  media[mediaId] = {
    ...item,
    taggedPeople: updatedTags
  };

  const existingMedia = person.mediaIds || [];
  const updatedMediaIds = existingMedia.includes(mediaId) ? existingMedia : [...existingMedia, mediaId];

  people[personId] = {
    ...person,
    mediaIds: updatedMediaIds,
    avatar: isPrimaryAvatar ? item.url : person.avatar,
    avatarMediaId: isPrimaryAvatar ? mediaId : person.avatarMediaId
  };

  return { ...data, media, people };
}

/**
 * Removes a person's tag from a photo/media item.
 */
export function untagPersonFromMedia(
  data: TreeData,
  mediaId: string,
  personId: string
): TreeData {
  const media = { ...(data.media || {}) };
  const people = { ...data.people };
  const item = media[mediaId];
  const person = people[personId];

  if (!item) return data;

  media[mediaId] = {
    ...item,
    taggedPeople: item.taggedPeople.filter(t => t.personId !== personId)
  };

  if (person) {
    people[personId] = {
      ...person,
      mediaIds: (person.mediaIds || []).filter(id => id !== mediaId),
      avatar: person.avatarMediaId === mediaId ? undefined : person.avatar,
      avatarMediaId: person.avatarMediaId === mediaId ? undefined : person.avatarMediaId
    };
  }

  return { ...data, media, people };
}

/**
 * Deletes a media item from the catalog and unlinks all references.
 */
export function deleteMediaItem(
  data: TreeData,
  mediaId: string
): TreeData {
  const media = { ...(data.media || {}) };
  const people = { ...data.people };

  delete media[mediaId];

  Object.keys(people).forEach(pId => {
    const p = people[pId];
    if (p.mediaIds?.includes(mediaId) || p.avatarMediaId === mediaId) {
      people[pId] = {
        ...p,
        mediaIds: (p.mediaIds || []).filter(id => id !== mediaId),
        avatar: p.avatarMediaId === mediaId ? undefined : p.avatar,
        avatarMediaId: p.avatarMediaId === mediaId ? undefined : p.avatarMediaId
      };
    }
  });

  return { ...data, media, people };
}

/**
 * Sets an individual's primary avatar photo.
 */
export function setPersonAvatar(
  data: TreeData,
  personId: string,
  avatarUrl: string,
  mediaId?: string
): TreeData {
  const people = { ...data.people };
  const person = people[personId];
  if (!person) return data;

  people[personId] = {
    ...person,
    avatar: avatarUrl,
    avatarMediaId: mediaId || person.avatarMediaId
  };

  return { ...data, people };
}

/**
 * Validates whether a person can be linked as a child of a given parent without creating circular cycles.
 */
export function canLinkChild(data: TreeData, parentId: string, potentialChildId: string): boolean {
  if (parentId === potentialChildId) return false;
  const parent = data.people[parentId];
  const child = data.people[potentialChildId];
  if (!parent || !child) return false;

  // Cannot link if potential child is an ancestor of the parent (would cause an ancestral cycle)
  const ancestors = getAncestors(data, parentId);
  if (ancestors.has(potentialChildId)) return false;

  return true;
}

/**
 * Validates whether a person can be linked as a parent of a given child without creating circular cycles.
 */
export function canLinkParent(data: TreeData, childId: string, potentialParentId: string): boolean {
  if (childId === potentialParentId) return false;
  const child = data.people[childId];
  const parent = data.people[potentialParentId];
  if (!child || !parent) return false;

  // Cannot link if potential parent is a descendant of the child
  const descendants = getDescendants(data, childId);
  if (descendants.has(potentialParentId)) return false;

  return true;
}
