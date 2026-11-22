import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { TreeData, LayoutNode, PrivacyConfig, Person, MediaItem } from '../types';
import { computeTreeLayout } from '../layout/bimodalLayout';
import { applyPrivacyFilter, DEFAULT_PRIVACY_CONFIG } from '../parser/privacyFilter';
import {
  getAncestors,
  getDescendants
} from '../analysis/relationshipCalculator';
import {
  addPerson as mutateAddPerson,
  addSpouse as mutateAddSpouse,
  addChild as mutateAddChild,
  addParent as mutateAddParent,
  updatePerson as mutateUpdatePerson,
  removePerson as mutateRemovePerson,
  addMediaItem as mutateAddMediaItem,
  tagPersonInMedia as mutateTagPersonInMedia,
  deleteMediaItem as mutateDeleteMediaItem
} from '../editor/treeMutations';
import { PersonCard } from './PersonCard';
import { PersonDrawer } from './PersonDrawer';
import { MiniMap } from './MiniMap';
import { EditPersonModal } from './modals/EditPersonModal';
import { AddRelativeModal } from './modals/AddRelativeModal';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import { RelationshipModal } from './modals/RelationshipModal';
import { HistoryModal } from './modals/HistoryModal';
import { useTreeHistory } from '../editor/useTreeHistory';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  X,
  UserPlus,
  GitBranch,
  Users,
  Sparkles,
  Undo2,
  Redo2,
  History
} from 'lucide-react';

export interface FamilyTreeProps {
  data: TreeData;
  datasetKey?: string;
  theme?: 'dark' | 'light';
  editable?: boolean;
  privacyConfig?: Partial<PrivacyConfig>;
  initialSelectedPersonId?: string | null;
  renderNode?: (node: LayoutNode, isSelected: boolean, onClick: () => void) => React.ReactNode;
  onSelectPerson?: (personId: string | null) => void;
  onUpdateData?: (newData: TreeData) => void;
  className?: string;
}

export interface HighlightState {
  type: 'none' | 'ancestors' | 'descendants' | 'path';
  title: string;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  familyNodeIds: Set<string>;
}

const DEFAULT_HIGHLIGHT: HighlightState = {
  type: 'none',
  title: '',
  nodeIds: new Set<string>(),
  edgeIds: new Set<string>(),
  familyNodeIds: new Set<string>()
};

export const FamilyTree: React.FC<FamilyTreeProps> = ({
  data,
  datasetKey,
  theme = 'dark',
  editable = true,
  privacyConfig = {},
  initialSelectedPersonId,
  renderNode,
  onSelectPerson,
  onUpdateData,
  className = ''
}) => {
  const isDark = theme === 'dark';

  // Privacy State
  const [privacyEnabled, setPrivacyEnabled] = useState<boolean>(
    privacyConfig.enabled ?? DEFAULT_PRIVACY_CONFIG.enabled
  );

  // History & Revert State
  const historyManager = useTreeHistory(data, {
    initialReason: datasetKey ? `Loaded "${datasetKey}"` : 'Initial Tree Loaded'
  });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Clear history whenever datasetKey changes
  const prevDatasetKeyRef = useRef<string | undefined>(datasetKey);
  useEffect(() => {
    if (datasetKey !== undefined && datasetKey !== prevDatasetKeyRef.current) {
      prevDatasetKeyRef.current = datasetKey;
      historyManager.clearHistory(data, `Loaded "${datasetKey}"`);
    }
  }, [datasetKey, data, historyManager]);

  // Track external data changes (e.g. blank tree or uploaded dataset)
  const prevDataRef = useRef<TreeData>(data);
  useEffect(() => {
    if (data !== prevDataRef.current) {
      prevDataRef.current = data;
      if (data !== historyManager.currentData) {
        historyManager.clearHistory(data, datasetKey ? `Loaded "${datasetKey}"` : 'New Tree Loaded');
      }
    }
  }, [data, datasetKey, historyManager]);

  // Undo / Redo / Revert Handlers
  const handleUndo = useCallback(() => {
    const prev = historyManager.undo();
    if (prev) {
      prevDataRef.current = prev;
      onUpdateData?.(prev);
    }
  }, [historyManager, onUpdateData]);

  const handleRedo = useCallback(() => {
    const next = historyManager.redo();
    if (next) {
      prevDataRef.current = next;
      onUpdateData?.(next);
    }
  }, [historyManager, onUpdateData]);

  const handleRevertToIndex = useCallback((index: number) => {
    const target = historyManager.revertToIndex(index);
    if (target) {
      prevDataRef.current = target;
      onUpdateData?.(target);
    }
  }, [historyManager, onUpdateData]);

  // Keyboard Shortcuts (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    if (!editable) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editable, handleUndo, handleRedo]);

  // Apply privacy filter
  const processedData = useMemo(() => {
    return applyPrivacyFilter(data, {
      ...privacyConfig,
      enabled: privacyEnabled
    });
  }, [data, privacyConfig, privacyEnabled]);

  // Compute Layout (Normalized positive coordinates)
  const layout = useMemo(() => {
    return computeTreeLayout(processedData);
  }, [processedData]);

  // Viewport transformation state
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 1000, height: 700 });
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Selection & Drawer state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('select');
      if (q && processedData.people[q]) return q;
    }
    return initialSelectedPersonId || null;
  });

  // Lineage Highlighting State
  const [highlightState, setHighlightState] = useState<HighlightState>(DEFAULT_HIGHLIGHT);

  // Modals State
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [addRelativeToPerson, setAddRelativeToPerson] = useState<Person | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);
  const [isAddingRoot, setIsAddingRoot] = useState<boolean>(false);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState<boolean>(false);
  const [relationshipInitialPersonId, setRelationshipInitialPersonId] = useState<string | null>(null);
  const [relationshipInitialPersonBId, setRelationshipInitialPersonBId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [matchingIds, setMatchingIds] = useState<string[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);

  // Measure container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  /**
   * Automatically scales and centers the family tree canvas to fit within the visible viewport bounds.
   * - Calculates proportional scale factors for width (`scaleX`) and height (`scaleY`).
   * - Clamps zoom factor between 0.25 (readable lower floor) and 1.0 (preventing over-magnification on 4K/retina).
   * - Calculates center pan translation to place the midpoint of the tree bounding box at the viewport center.
   */
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !layout.bounds) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const { bounds } = layout;

    const scaleX = (cw - 80) / bounds.width;
    const scaleY = (ch - 80) / bounds.height;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.0);

    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;

    setZoom(newZoom);
    setPan({
      x: cw / 2 - centerX * newZoom,
      y: ch / 2 - centerY * newZoom
    });
  }, [layout]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 60);
    return () => clearTimeout(timer);
  }, [fitToScreen]);

  /**
   * Centers the canvas viewport directly on a specific individual's card node.
   * Adjusts the world pan coordinates so that the card's center aligns with the viewport center.
   */
  const centerOnNode = useCallback((personId: string) => {
    const node = layout.nodes[personId];
    if (!node || !containerRef.current) return;

    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    setSelectedPersonId(personId);
    onSelectPerson?.(personId);

    setPan({
      x: cw / 2 - (node.x + node.width / 2) * zoom,
      y: ch / 2 - (node.y + node.height / 2) * zoom
    });
  }, [layout, zoom, onSelectPerson]);

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // =========================================================================
  // Mobile & Tablet Touch Interactions (1-Finger Drag Pan + 2-Finger Pinch Zoom)
  // =========================================================================
  const touchStartRef = useRef<{ dist?: number }>({});

  /**
   * Handles touch start event:
   * - 1 finger: initiates canvas drag panning, recording relative offset.
   * - 2 fingers: measures initial Euclidean distance `sqrt(dx^2 + dy^2)` for pinch zoom.
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      dragStart.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.hypot(dx, dy);
    }
  };

  /**
   * Handles touch move event:
   * - 1 finger: updates canvas pan position.
   * - 2 fingers: calculates distance ratio (`newDist / initialDist`) to compute zoom delta,
   *   while adjusting pan coordinates so the focal midpoint between both fingers remains stationary.
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      setPan({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist && containerRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const factor = newDist / touchStartRef.current.dist;
      touchStartRef.current.dist = newDist;

      const rect = containerRef.current.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      setZoom(z => {
        const nextZoom = Math.min(Math.max(z * factor, 0.2), 2.5);
        setPan(p => ({
          x: midX - (midX - p.x) * (nextZoom / z),
          y: midY - (midY - p.y) * (nextZoom / z)
        }));
        return nextZoom;
      });
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    touchStartRef.current.dist = undefined;
  };

  // Zoom interaction via wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(Math.max(zoom * factor, 0.2), 2.5);

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchingIds([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = Object.values(processedData.people)
      .filter(p => p.fullName.toLowerCase().includes(q) || p.occupation?.toLowerCase().includes(q))
      .map(p => p.id);

    setMatchingIds(matches);
    setCurrentMatchIdx(0);
    if (matches.length > 0) {
      centerOnNode(matches[0]);
    }
  }, [searchQuery, processedData, centerOnNode]);

  const nextMatch = () => {
    if (matchingIds.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matchingIds.length;
    setCurrentMatchIdx(nextIdx);
    centerOnNode(matchingIds[nextIdx]);
  };

  const prevMatch = () => {
    if (matchingIds.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + matchingIds.length) % matchingIds.length;
    setCurrentMatchIdx(prevIdx);
    centerOnNode(matchingIds[prevIdx]);
  };

  // Highlighting Handlers
  const handleHighlightAncestors = (person: Person) => {
    const ancestors = getAncestors(processedData, person.id);
    const nodeIds = new Set<string>([person.id]);
    const edgeIds = new Set<string>();
    const familyNodeIds = new Set<string>();

    ancestors.forEach((_, ancId) => nodeIds.add(ancId));

    // Connect edges along the ancestor paths
    nodeIds.forEach(pId => {
      const p = processedData.people[pId];
      if (p && p.famc) {
        const fam = processedData.families[p.famc];
        if (fam) {
          const hasParentInTree = (fam.husband && nodeIds.has(fam.husband)) || (fam.wife && nodeIds.has(fam.wife));
          if (hasParentInTree) {
            familyNodeIds.add(fam.id);
            edgeIds.add(`${fam.id}->${p.id}`);
            if (fam.husband && nodeIds.has(fam.husband)) {
              edgeIds.add(`${fam.husband}->${fam.id}`);
            }
            if (fam.wife && nodeIds.has(fam.wife)) {
              edgeIds.add(`${fam.wife}->${fam.id}`);
            }
          }
        }
      }
    });

    setHighlightState({
      type: 'ancestors',
      title: `Direct Ancestors of ${person.fullName} (${nodeIds.size - 1} found)`,
      nodeIds,
      edgeIds,
      familyNodeIds
    });
  };

  const handleHighlightDescendants = (person: Person) => {
    const descendants = getDescendants(processedData, person.id);
    const nodeIds = new Set<string>([person.id]);
    const edgeIds = new Set<string>();
    const familyNodeIds = new Set<string>();

    descendants.forEach((_, descId) => nodeIds.add(descId));

    // Connect edges along descendant paths
    nodeIds.forEach(pId => {
      const p = processedData.people[pId];
      if (p && p.fams) {
        p.fams.forEach(famId => {
          const fam = processedData.families[famId];
          if (fam) {
            const hasDescChild = fam.children.some(cid => nodeIds.has(cid));
            if (hasDescChild) {
              familyNodeIds.add(fam.id);
              edgeIds.add(`${pId}->${fam.id}`);
              fam.children.forEach(cid => {
                if (nodeIds.has(cid)) {
                  edgeIds.add(`${fam.id}->${cid}`);
                }
              });
            }
          }
        });
      }
    });

    setHighlightState({
      type: 'descendants',
      title: `Direct Descendants of ${person.fullName} (${nodeIds.size - 1} found)`,
      nodeIds,
      edgeIds,
      familyNodeIds
    });
  };

  const handleHighlightPath = (personAId: string, personBId: string, path: string[]) => {
    const nodeIds = new Set<string>();
    const familyNodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    for (let i = 0; i < path.length; i++) {
      const curr = path[i];
      if (processedData.people[curr]) {
        nodeIds.add(curr);
      } else if (processedData.families[curr]) {
        familyNodeIds.add(curr);
      }

      if (i > 0) {
        const prev = path[i - 1];
        edgeIds.add(`${prev}->${curr}`);
        edgeIds.add(`${curr}->${prev}`);
      }
    }

    const pA = processedData.people[personAId];
    const pB = processedData.people[personBId];
    const title = pA && pB ? `Kinship Path: ${pA.fullName} ↔ ${pB.fullName}` : 'Kinship Connection Path';

    setHighlightState({
      type: 'path',
      title,
      nodeIds,
      edgeIds,
      familyNodeIds
    });
  };

  const clearHighlighting = () => {
    setHighlightState(DEFAULT_HIGHLIGHT);
  };

  // URL Deep Link Parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hlType = params.get('highlight');
    const pId = params.get('person') || selectedPersonId;
    if (hlType && pId && processedData.people[pId]) {
      const p = processedData.people[pId];
      if (hlType === 'ancestors') {
        handleHighlightAncestors(p);
      } else if (hlType === 'descendants') {
        handleHighlightDescendants(p);
      }
    }
    const modalParam = params.get('modal');
    if (modalParam === 'relationship') {
      const pA = params.get('pA') || 'I7';
      const pB = params.get('pB') || 'I10';
      setRelationshipInitialPersonId(pA);
      setRelationshipInitialPersonBId(pB);
      setIsRelationshipModalOpen(true);
    }
  }, [processedData]);

  // Mutation Handlers
  const handleSavePerson = (updates: Partial<Person>) => {
    if (!editingPerson) return;
    const targetName = editingPerson.fullName;
    const nextData = mutateUpdatePerson(data, editingPerson.id, updates);
    historyManager.recordChange(
      `Updated details for "${targetName}"`,
      nextData,
      'edit_person',
      targetName
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
    setEditingPerson(null);
  };

  const handleAddRootPerson = (personData: Partial<Person>) => {
    const { data: nextData, personId } = mutateAddPerson(data, personData);
    const targetName = personData.fullName || `${personData.first || ''} ${personData.surname || ''}`.trim() || 'New Person';
    historyManager.recordChange(
      `Added independent person "${targetName}"`,
      nextData,
      'add_person',
      targetName
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
    setIsAddingRoot(false);
    setSelectedPersonId(personId);
  };

  const handleAddSpouse = (spouseOrId: Partial<Person> | string, marriage?: { date?: string; year?: number; place?: string }) => {
    if (!addRelativeToPerson) return;
    const { data: nextData, spouseId } = mutateAddSpouse(data, addRelativeToPerson.id, spouseOrId, marriage);
    const spouseName = typeof spouseOrId === 'string'
      ? (data.people[spouseOrId]?.fullName || spouseOrId)
      : (spouseOrId.fullName || `${spouseOrId.first || ''} ${spouseOrId.surname || ''}`.trim() || 'Spouse');
    historyManager.recordChange(
      `Added spouse "${spouseName}" to ${addRelativeToPerson.fullName}`,
      nextData,
      'add_spouse',
      spouseName
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
    setAddRelativeToPerson(null);
    setSelectedPersonId(spouseId);
  };

  const handleAddChild = (childOrId: Partial<Person> | string) => {
    if (!addRelativeToPerson) return;
    const { data: nextData, childId } = mutateAddChild(data, addRelativeToPerson.id, childOrId);
    const childName = typeof childOrId === 'string'
      ? (data.people[childOrId]?.fullName || childOrId)
      : (childOrId.fullName || `${childOrId.first || ''} ${childOrId.surname || ''}`.trim() || 'Child');
    historyManager.recordChange(
      `Added child "${childName}" to ${addRelativeToPerson.fullName}`,
      nextData,
      'add_child',
      childName
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
    setAddRelativeToPerson(null);
    setSelectedPersonId(childId);
  };

  const handleAddParent = (parentOrId: Partial<Person> | string, relation: 'father' | 'mother') => {
    if (!addRelativeToPerson) return;
    const { data: nextData, parentId } = mutateAddParent(data, addRelativeToPerson.id, parentOrId, relation);
    const parentName = typeof parentOrId === 'string'
      ? (data.people[parentOrId]?.fullName || parentOrId)
      : (parentOrId.fullName || `${parentOrId.first || ''} ${parentOrId.surname || ''}`.trim() || relation);
    historyManager.recordChange(
      `Added ${relation} "${parentName}" to ${addRelativeToPerson.fullName}`,
      nextData,
      'add_parent',
      parentName
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
    setAddRelativeToPerson(null);
    setSelectedPersonId(parentId);
  };

  const handleConfirmDelete = () => {
    if (!deletingPerson) return;
    const targetName = deletingPerson.fullName;
    const { data: nextData } = mutateRemovePerson(data, deletingPerson.id);
    historyManager.recordChange(
      `Removed "${targetName}" from tree`,
      nextData,
      'delete_person',
      targetName
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
    if (selectedPersonId === deletingPerson.id) {
      setSelectedPersonId(null);
      onSelectPerson?.(null);
    }
    setDeletingPerson(null);
  };

  const handleAddMedia = (mediaData: Omit<MediaItem, 'id'>) => {
    const { data: nextData } = mutateAddMediaItem(data, mediaData);
    historyManager.recordChange(
      `Added photograph "${mediaData.title || 'Photo'}"`,
      nextData,
      'media'
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
  };

  const handleSetAsPrimaryAvatar = (mediaId: string, personId: string) => {
    const nextData = mutateTagPersonInMedia(data, mediaId, personId, true);
    const p = data.people[personId];
    historyManager.recordChange(
      `Set primary profile avatar for "${p?.fullName || personId}"`,
      nextData,
      'media',
      p?.fullName
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
  };

  const handleDeleteMedia = (mediaId: string) => {
    const nextData = mutateDeleteMediaItem(data, mediaId);
    historyManager.recordChange(
      'Deleted photograph from album',
      nextData,
      'media'
    );
    prevDataRef.current = nextData;
    onUpdateData?.(nextData);
  };

  const selectedPerson = selectedPersonId ? processedData.people[selectedPersonId] || null : null;
  const isTreeEmpty = Object.keys(processedData.people).length === 0;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative w-full h-[740px] overflow-hidden select-none border rounded-2xl shadow-2xl transition-colors duration-300 touch-none ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
      } ${className}`}
      style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
    >
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle, #94a3b8 1px, transparent 1px)'
            : 'radial-gradient(circle, #64748b 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none z-30 flex-wrap sm:flex-nowrap">
        {/* Search Input */}
        <div className={`flex items-center gap-1.5 sm:gap-2 pointer-events-auto backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border shadow-lg ${
          isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <Search className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`bg-transparent text-xs focus:outline-none w-20 sm:w-40 ${
              isDark ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-400'
            }`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {matchingIds.length > 0 && (
            <div className={`flex items-center gap-1.5 border-l pl-2 text-[11px] ${
              isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}>
              <span>{currentMatchIdx + 1}/{matchingIds.length}</span>
              <button onClick={prevMatch} className="hover:text-emerald-500 px-1">▲</button>
              <button onClick={nextMatch} className="hover:text-emerald-500 px-1">▼</button>
            </div>
          )}
        </div>

        {/* View Controls & Action Bar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Undo / Redo & Change History Toolbar (if editable) */}
          {editable && (
            <div className={`flex items-center gap-0.5 backdrop-blur-md p-1 rounded-xl border shadow-lg ${
              isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white/95 border-slate-200'
            }`}>
              <button
                onClick={handleUndo}
                disabled={!historyManager.canUndo}
                className={`p-1.5 rounded-lg transition disabled:opacity-25 ${
                  isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!historyManager.canRedo}
                className={`p-1.5 rounded-lg transition disabled:opacity-25 ${
                  isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition ${
                  historyManager.history.length > 1
                    ? isDark
                      ? 'text-purple-300 hover:bg-slate-800 hover:text-white'
                      : 'text-purple-700 hover:bg-purple-50'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="View Session Changes & Revert History"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  History{historyManager.history.length > 1 ? ` (${historyManager.history.length - 1})` : ''}
                </span>
              </button>
            </div>
          )}

          {/* Add Root Person Button (if editable) */}
          {editable && (
            <button
              onClick={() => setIsAddingRoot(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition"
              title="Add an independent person or new root"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Person</span>
            </button>
          )}

          {/* Relationship Calculator Launch Button */}
          <button
            onClick={() => {
              setRelationshipInitialPersonId(selectedPersonId);
              setIsRelationshipModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-md shadow-lg transition ${
              isDark
                ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-purple-300'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-purple-700'
            }`}
            title="Calculate relationship and kinship path between any two individuals"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Compare</span>
          </button>

          {/* Privacy Toggle */}
          <button
            onClick={() => setPrivacyEnabled(!privacyEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-md shadow-lg transition ${
              privacyEnabled
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/70'
                : 'bg-amber-950/70 border-amber-500/40 text-amber-300 hover:bg-amber-900/70'
            }`}
            title={privacyEnabled ? 'Privacy Mode: Active (Living info masked)' : 'Uncensored Mode: Active'}
          >
            {privacyEnabled ? <Shield className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{privacyEnabled ? 'Privacy Protected' : 'Uncensored'}</span>
          </button>

          {/* Zoom & Fit Toolbar */}
          <div className={`flex items-center gap-1 backdrop-blur-md p-1 rounded-xl border shadow-lg ${
            isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white/95 border-slate-200'
          }`}>
            <button
              onClick={() => setZoom(z => Math.min(z * 1.2, 2.5))}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100'
              }`}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100'
              }`}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={fitToScreen}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100'
              }`}
              title="Fit to Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100'
              }`}
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lineage Highlighting Active Banner */}
      {highlightState.type !== 'none' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in slide-in-from-top duration-300">
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border shadow-xl backdrop-blur-md text-xs font-semibold ${
            highlightState.type === 'ancestors'
              ? isDark
                ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-300 shadow-emerald-500/10'
                : 'bg-white/95 border-emerald-500/50 text-emerald-700 shadow-emerald-500/10'
              : highlightState.type === 'descendants'
              ? isDark
                ? 'bg-slate-900/95 border-sky-500/50 text-sky-300 shadow-sky-500/10'
                : 'bg-white/95 border-sky-500/50 text-sky-700 shadow-sky-500/10'
              : isDark
              ? 'bg-slate-900/95 border-amber-500/50 text-amber-300 shadow-amber-500/10'
              : 'bg-white/95 border-amber-500/50 text-amber-700 shadow-amber-500/10'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{highlightState.title}</span>
            <button
              onClick={clearHighlighting}
              className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold tracking-wider border transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              Clear View
            </button>
          </div>
        </div>
      )}

      {/* Empty State Banner */}
      {isTreeEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <div className={`p-8 rounded-2xl border text-center max-w-sm pointer-events-auto backdrop-blur-md shadow-2xl ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <GitBranch className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-1">Your family tree is empty</h3>
            <p className="text-xs text-slate-400 mb-5">
              Get started by adding your first root ancestor or upload a GEDCOM / JSON file.
            </p>
            {editable ? (
              <button
                onClick={() => setIsAddingRoot(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition"
              >
                <UserPlus className="w-4 h-4" /> Add First Person
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Read-only mode active: editing features are disabled.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive World Canvas */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          left: 0,
          top: 0,
          width: layout.bounds.width,
          height: layout.bounds.height
        }}
      >
        {/* SVG Bezier Relationship Connectors */}
        <svg
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: layout.bounds.width,
            height: layout.bounds.height,
            overflow: 'visible',
            pointerEvents: 'none'
          }}
          viewBox={`0 0 ${layout.bounds.width} ${layout.bounds.height}`}
        >
          {layout.edges.map(edge => {
            const isHighlighted = highlightState.edgeIds.has(edge.id);
            const isHighlightActive = highlightState.type !== 'none';

            let strokeColor = isDark ? '#94a3b8' : '#64748b';
            let strokeWidth = 1.5;
            let opacity = isDark ? 0.75 : 0.85;

            if (isHighlightActive) {
              if (isHighlighted) {
                strokeColor =
                  highlightState.type === 'ancestors'
                    ? '#10b981'
                    : highlightState.type === 'descendants'
                    ? '#38bdf8'
                    : '#f59e0b';
                strokeWidth = 2.75;
                opacity = 1;
              } else {
                opacity = 0.12;
              }
            }

            return (
              <path
                key={edge.id}
                d={edge.path}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={edge.type === 'parent-to-family' ? '4 2' : 'none'}
                opacity={opacity}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Family Union Gate Nodes (Visual Anchor Rings) */}
          {Object.values(layout.familyNodes).map(fam => {
            const isHighlighted = highlightState.familyNodeIds.has(fam.id);
            const isHighlightActive = highlightState.type !== 'none';

            let strokeColor = isDark ? '#94a3b8' : '#475569';
            let strokeWidth = 1.5;
            let radius = 5;
            let opacity = 1;

            if (isHighlightActive) {
              if (isHighlighted) {
                strokeColor =
                  highlightState.type === 'ancestors'
                    ? '#10b981'
                    : highlightState.type === 'descendants'
                    ? '#38bdf8'
                    : '#f59e0b';
                strokeWidth = 2.5;
                radius = 6;
                opacity = 1;
              } else {
                opacity = 0.15;
              }
            }

            return (
              <circle
                key={fam.id}
                cx={fam.x}
                cy={fam.y}
                r={radius}
                fill={isDark ? '#0f172a' : '#ffffff'}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Person Cards */}
        {Object.values(layout.nodes).map(node => {
          const isSelected = selectedPersonId === node.id;
          const isSearchMatch = matchingIds.includes(node.id);
          const isHighlightActive = highlightState.type !== 'none';
          const isNodeInHighlight = highlightState.nodeIds.has(node.id);
          const isDimmed = isHighlightActive && !isNodeInHighlight;

          let highlightVariant: 'ancestor' | 'descendant' | 'path' | undefined;
          if (isHighlightActive && isNodeInHighlight) {
            highlightVariant =
              highlightState.type === 'ancestors'
                ? 'ancestor'
                : highlightState.type === 'descendants'
                ? 'descendant'
                : 'path';
          }

          if (renderNode) {
            return (
              <div
                key={node.id}
                style={{ position: 'absolute', left: node.x, top: node.y }}
                onClick={() => {
                  setSelectedPersonId(node.id);
                  onSelectPerson?.(node.id);
                }}
              >
                {renderNode(node, isSelected, () => setSelectedPersonId(node.id))}
              </div>
            );
          }

          return (
            <PersonCard
              key={node.id}
              node={node}
              theme={theme}
              isSelected={isSelected}
              isHighlighted={isSearchMatch}
              isDimmed={isDimmed}
              highlightVariant={highlightVariant}
              onClick={n => {
                setSelectedPersonId(n.id);
                onSelectPerson?.(n.id);
              }}
            />
          );
        })}
      </div>

      {/* MiniMap Overview */}
      <MiniMap
        layout={layout}
        viewport={{
          x: pan.x,
          y: pan.y,
          zoom,
          width: viewportSize.width,
          height: viewportSize.height
        }}
      />

      {/* Slide-over Detail Drawer */}
      <PersonDrawer
        person={selectedPerson}
        people={processedData.people}
        families={processedData.families}
        media={processedData.media}
        isOpen={!!selectedPersonId}
        theme={theme}
        editable={editable}
        onClose={() => {
          setSelectedPersonId(null);
          onSelectPerson?.(null);
        }}
        onSelectPerson={centerOnNode}
        onEditPerson={editable ? (p: Person) => setEditingPerson(p) : undefined}
        onAddRelative={editable ? (p: Person) => setAddRelativeToPerson(p) : undefined}
        onDeletePerson={editable ? (p: Person) => setDeletingPerson(p) : undefined}
        onHighlightAncestors={handleHighlightAncestors}
        onHighlightDescendants={handleHighlightDescendants}
        onOpenRelationshipCalculator={(p: Person) => {
          setRelationshipInitialPersonId(p.id);
          setIsRelationshipModalOpen(true);
        }}
        onAddMedia={editable ? handleAddMedia : undefined}
        onSetAsPrimaryAvatar={editable ? handleSetAsPrimaryAvatar : undefined}
        onDeleteMedia={editable ? handleDeleteMedia : undefined}
      />

      {/* Relationship Calculator Modal */}
      {isRelationshipModalOpen && (
        <RelationshipModal
          isOpen={true}
          theme={theme}
          data={processedData}
          initialPersonAId={relationshipInitialPersonId}
          initialPersonBId={relationshipInitialPersonBId}
          onClose={() => {
            setIsRelationshipModalOpen(false);
            setRelationshipInitialPersonBId(null);
          }}
          onHighlightPath={handleHighlightPath}
        />
      )}

      {/* Edit Person Modal */}
      {editingPerson && (
        <EditPersonModal
          person={editingPerson}
          isOpen={true}
          theme={theme}
          onClose={() => setEditingPerson(null)}
          onSave={handleSavePerson}
        />
      )}

      {/* Add Relative Modal */}
      {addRelativeToPerson && (
        <AddRelativeModal
          sourcePerson={addRelativeToPerson}
          allPeople={data.people}
          isOpen={true}
          theme={theme}
          onClose={() => setAddRelativeToPerson(null)}
          onAddSpouse={handleAddSpouse}
          onAddChild={handleAddChild}
          onAddParent={handleAddParent}
        />
      )}

      {/* Add Root Person Modal */}
      {isAddingRoot && (
        <EditPersonModal
          person={{
            id: 'NEW',
            fullName: 'New Ancestor',
            first: 'New',
            surname: 'Ancestor',
            gender: 'U',
            isLiving: true,
            fams: [],
            attributes: {}
          }}
          isOpen={true}
          theme={theme}
          onClose={() => setIsAddingRoot(false)}
          onSave={handleAddRootPerson}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingPerson && (
        <ConfirmDeleteModal
          person={deletingPerson}
          isOpen={true}
          theme={theme}
          affectedChildrenCount={
            deletingPerson.fams.reduce((acc, fId) => acc + (data.families[fId]?.children.length || 0), 0)
          }
          onClose={() => setDeletingPerson(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Session Change History & Revert Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        theme={theme}
        history={historyManager.history}
        currentIndex={historyManager.currentIndex}
        canUndo={historyManager.canUndo}
        canRedo={historyManager.canRedo}
        onClose={() => setIsHistoryModalOpen(false)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRevertToIndex={handleRevertToIndex}
      />
    </div>
  );
};
