export type Gender = 'M' | 'F' | 'O' | 'U';

export interface FaceRegion {
  x: number;      // Percentage 0-100
  y: number;
  width: number;
  height: number;
}

export interface TaggedPerson {
  personId: string;
  isPrimaryAvatar?: boolean;
  faceRegion?: FaceRegion;
}

export type MediaType = 'portrait' | 'group' | 'document' | 'tombstone' | 'candid';

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  date?: string;
  year?: number;
  place?: string;
  type: MediaType;
  taggedPeople: TaggedPerson[];
}

export interface VitalEvent {
  date?: string;
  year?: number;
  place?: string;
  description?: string;
}

export interface Person {
  id: string;
  first: string;
  surname: string;
  fullName: string;
  gender: Gender;
  birth?: VitalEvent;
  death?: VitalEvent;
  occupation?: string;
  famc?: string;
  fams: string[];
  avatar?: string;
  avatarMediaId?: string;
  mediaIds?: string[];
  notes?: string[];
  bio?: string;
  isLiving?: boolean;
  branch?: string;
  attributes?: Record<string, string>;
}

export interface Family {
  id: string;
  husband?: string;
  wife?: string;
  children: string[];
  marriage?: VitalEvent;
}

export interface TreeMeta {
  title?: string;
  version?: string;
  lastUpdated?: string;
  compiler?: string;
  credits?: string[];
  totalPeople?: number;
  totalFamilies?: number;
}

export interface TreeData {
  meta?: TreeMeta;
  metadata?: Record<string, any>;
  people: Record<string, Person>;
  families: Record<string, Family>;
  media?: Record<string, MediaItem>;
}

export interface LayoutNode extends Person {
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
}

export interface LayoutFamilyNode extends Family {
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
}

export interface LayoutEdge {
  id: string;
  fromId: string;
  toId: string;
  type: 'parent-to-family' | 'family-to-child';
  path: string;
}

export interface TreeLayout {
  nodes: Record<string, LayoutNode>;
  familyNodes: Record<string, LayoutFamilyNode>;
  edges: LayoutEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface PrivacyConfig {
  enabled: boolean;
  redactLiving: boolean;
  livingCutoffYear: number;
  maskName?: string;
  maskLivingName?: boolean;
}

export type HistoryChangeType =
  | 'load'
  | 'add_person'
  | 'add_spouse'
  | 'add_child'
  | 'add_parent'
  | 'edit_person'
  | 'delete_person'
  | 'unlink_relation'
  | 'media'
  | 'revert';

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string;
  changeType: HistoryChangeType;
  snapshot: TreeData;
  targetPersonName?: string;
  details?: string;
}
