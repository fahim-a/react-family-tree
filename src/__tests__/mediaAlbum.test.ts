import { describe, it, expect } from 'vitest';
import { parseGedcom } from '../parser/gedcomParser';
import { SAMPLE_GEDCOM_STRING } from '../demo/sampleData';
import {
  addMediaItem,
  tagPersonInMedia,
  untagPersonFromMedia,
  deleteMediaItem,
  setPersonAvatar
} from '../editor/treeMutations';
import { MediaItem } from '../types';

/**
 * Test Suite: Photo Album, Multi-Person Tagging & Media Management
 *
 * Verifies rich multimedia capabilities for historical genealogy records:
 * - Adding Media Items: Uploading photos and assigning unique M0001 IDs.
 * - Multi-Person Tagging: Tagging multiple relatives in a single candid group photograph.
 * - Primary Avatar Assignment: Designating a tagged portrait as an individual's primary profile avatar.
 * - Untagging & Cleanup: Removing a person's face tag without deleting the underlying photo.
 * - Cascade Media Deletion: Removing a photo and unlinking all references across tagged people.
 * - Direct Avatar Overrides: Programmatically setting or clearing profile avatars.
 */
describe('Media Album, Multi-Person Photo Tagging & Avatar Management', () => {
  it('adds a media item and automatically links tagged individuals', () => {
    const data = parseGedcom(SAMPLE_GEDCOM_STRING);

    const newPhoto: Omit<MediaItem, 'id'> = {
      url: 'https://example.com/wedding_1954.jpg',
      title: 'Arthur & Eleanor Wedding',
      date: '14 JUN 1954',
      year: 1954,
      place: 'Edinburgh, Scotland',
      type: 'group',
      taggedPeople: [
        { personId: 'I1', isPrimaryAvatar: true },
        { personId: 'I2', isPrimaryAvatar: false }
      ]
    };

    const { data: nextData, mediaId } = addMediaItem(data, newPhoto);

    expect(mediaId).toMatch(/^M\d+/);
    expect(nextData.media).toBeDefined();
    expect(nextData.media![mediaId]).toBeDefined();
    expect(nextData.media![mediaId].title).toBe('Arthur & Eleanor Wedding');

    // Arthur should have avatar set and mediaId linked
    const arthur = nextData.people['I1'];
    expect(arthur.mediaIds).toContain(mediaId);
    expect(arthur.avatar).toBe('https://example.com/wedding_1954.jpg');
    expect(arthur.avatarMediaId).toBe(mediaId);

    // Eleanor should have mediaId linked but not avatar set
    const eleanor = nextData.people['I2'];
    expect(eleanor.mediaIds).toContain(mediaId);
  });

  it('tags a relative in an existing photo and updates their profile', () => {
    let data = parseGedcom(SAMPLE_GEDCOM_STRING);

    const { data: d1, mediaId } = addMediaItem(data, {
      url: 'https://example.com/picnic.jpg',
      title: 'Family Picnic',
      type: 'group',
      taggedPeople: [{ personId: 'I1' }]
    });

    data = d1;
    // Tag Julian (I3) in the photo
    data = tagPersonInMedia(data, mediaId, 'I3', false, { x: 20, y: 30, width: 25, height: 25 });

    const item = data.media![mediaId];
    expect(item.taggedPeople.length).toBe(2);
    expect(item.taggedPeople.some(t => t.personId === 'I3')).toBe(true);

    const julian = data.people['I3'];
    expect(julian.mediaIds).toContain(mediaId);
  });

  it('untags an individual and cleans up avatar references', () => {
    let data = parseGedcom(SAMPLE_GEDCOM_STRING);

    const { data: d1, mediaId } = addMediaItem(data, {
      url: 'https://example.com/portrait.jpg',
      title: 'Arthur Portrait',
      type: 'portrait',
      taggedPeople: [{ personId: 'I1', isPrimaryAvatar: true }]
    });

    data = d1;
    expect(data.people['I1'].avatar).toBe('https://example.com/portrait.jpg');

    // Untag Arthur
    data = untagPersonFromMedia(data, mediaId, 'I1');

    expect(data.media![mediaId].taggedPeople.length).toBe(0);
    expect(data.people['I1'].mediaIds).not.toContain(mediaId);
    expect(data.people['I1'].avatar).toBeUndefined();
  });

  it('deletes a media item and unlinks references across all tagged relatives', () => {
    let data = parseGedcom(SAMPLE_GEDCOM_STRING);

    const { data: d1, mediaId } = addMediaItem(data, {
      url: 'https://example.com/reunion.jpg',
      title: 'Hawthorne Reunion',
      type: 'group',
      taggedPeople: [
        { personId: 'I1', isPrimaryAvatar: true },
        { personId: 'I2' },
        { personId: 'I3' }
      ]
    });

    data = d1;
    expect(data.media![mediaId]).toBeDefined();

    data = deleteMediaItem(data, mediaId);

    expect(data.media![mediaId]).toBeUndefined();
    expect(data.people['I1'].mediaIds).not.toContain(mediaId);
    expect(data.people['I2'].mediaIds).not.toContain(mediaId);
    expect(data.people['I3'].mediaIds).not.toContain(mediaId);
    expect(data.people['I1'].avatar).toBeUndefined();
  });

  it('sets a person avatar explicitly', () => {
    let data = parseGedcom(SAMPLE_GEDCOM_STRING);
    data = setPersonAvatar(data, 'I1', 'https://example.com/arthur_new.jpg', 'M9999');

    expect(data.people['I1'].avatar).toBe('https://example.com/arthur_new.jpg');
    expect(data.people['I1'].avatarMediaId).toBe('M9999');
  });
});
