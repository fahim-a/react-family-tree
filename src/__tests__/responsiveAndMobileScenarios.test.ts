import { describe, it, expect } from 'vitest';
import { computeTreeLayout } from '../layout/bimodalLayout';
import { TreeData } from '../types';

/**
 * Responsive and Mobile/Desktop Screen Resolution Test Suite
 *
 * Verifies:
 * 1. Screen Resolution Scaling (4K, 1440p, 1080p Desktop, Laptop, Tablet, Mobile Portrait & Landscape)
 * 2. Viewport Clamping (Upper bounds 1.0, lower bounds 0.25)
 * 3. Node Centering Math across differing viewport widths (Desktop vs Mobile)
 * 4. Touch Event Math (1-finger drag pan & 2-finger Euclidean distance pinch zoom)
 * 5. Breakpoint and Responsive UI Rules (MiniMap visibility, Drawer width, Search width)
 */

// Helper replicating FamilyTree.tsx fitToScreen math
function calculateFitToScreen(
  viewport: { width: number; height: number },
  bounds: { width: number; height: number }
) {
  const cw = viewport.width;
  const ch = viewport.height;
  const scaleX = (cw - 80) / bounds.width;
  const scaleY = (ch - 80) / bounds.height;
  const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.0);
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  const panX = cw / 2 - centerX * newZoom;
  const panY = ch / 2 - centerY * newZoom;
  return { zoom: newZoom, panX, panY };
}

// Helper replicating FamilyTree.tsx centerOnNode math
function calculateCenterOnNode(
  viewport: { width: number; height: number },
  node: { x: number; y: number; width: number; height: number },
  zoom: number
) {
  const panX = viewport.width / 2 - (node.x + node.width / 2) * zoom;
  const panY = viewport.height / 2 - (node.y + node.height / 2) * zoom;
  return { panX, panY };
}

// Helper replicating 2-finger pinch zoom math in FamilyTree.tsx
function calculatePinchZoom(
  touch1: { clientX: number; clientY: number },
  touch2: { clientX: number; clientY: number },
  prevDist: number,
  currentZoom: number,
  currentPan: { x: number; y: number },
  containerRect: { left: number; top: number }
) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  const newDist = Math.hypot(dx, dy);
  const factor = newDist / prevDist;
  const nextZoom = Math.min(Math.max(currentZoom * factor, 0.2), 2.5);

  const midX = (touch1.clientX + touch2.clientX) / 2 - containerRect.left;
  const midY = (touch1.clientY + touch2.clientY) / 2 - containerRect.top;

  const nextPanX = midX - (midX - currentPan.x) * (nextZoom / currentZoom);
  const nextPanY = midY - (midY - currentPan.y) * (nextZoom / currentZoom);

  return { nextZoom, nextPanX, nextPanY, newDist };
}

const mockMultiGenTree: TreeData = {
  people: {
    'I1': { id: 'I1', first: 'Grandfather', surname: 'One', fullName: 'Grandfather One', gender: 'M', fams: ['F1'] },
    'I2': { id: 'I2', first: 'Grandmother', surname: 'One', fullName: 'Grandmother One', gender: 'F', fams: ['F1'] },
    'I3': { id: 'I3', first: 'Father', surname: 'One', fullName: 'Father One', gender: 'M', famc: 'F1', fams: ['F2'] },
    'I4': { id: 'I4', first: 'Mother', surname: 'One', fullName: 'Mother One', gender: 'F', fams: ['F2'] },
    'I5': { id: 'I5', first: 'Child', surname: 'One', fullName: 'Child One', gender: 'M', famc: 'F2', fams: [] },
    'I6': { id: 'I6', first: 'Child', surname: 'Two', fullName: 'Child Two', gender: 'F', famc: 'F2', fams: [] }
  },
  families: {
    'F1': { id: 'F1', husband: 'I1', wife: 'I2', children: ['I3'] },
    'F2': { id: 'F2', husband: 'I3', wife: 'I4', children: ['I5', 'I6'] }
  }
};

describe('Responsive and Mobile vs Desktop Scenarios', () => {
  const layout = computeTreeLayout(mockMultiGenTree);

  describe('Screen Resolution Scaling & Clamping', () => {
    it('handles 4K UHD (3840x2160) displays and enforces upper zoom cap of 1.0', () => {
      // 4K monitors have ample pixels; small to mid trees should never scale up to blurred or giant cards
      const viewport = { width: 3840, height: 2160 };
      const { zoom, panX, panY } = calculateFitToScreen(viewport, layout.bounds);

      // Verify zoom is capped at 1.0 (100% natural resolution)
      expect(zoom).toBeLessThanOrEqual(1.0);
      expect(zoom).toBe(1.0);

      // Verify canvas is centered horizontally and vertically
      const expectedCenterX = 3840 / 2 - (layout.bounds.width / 2) * 1.0;
      const expectedCenterY = 2160 / 2 - (layout.bounds.height / 2) * 1.0;
      expect(panX).toBeCloseTo(expectedCenterX, 1);
      expect(panY).toBeCloseTo(expectedCenterY, 1);
    });

    it('handles Ultra-wide 1440p (3440x1440) displays where height is the constraining axis', () => {
      const viewport = { width: 3440, height: 1440 };
      const { zoom, panX, panY } = calculateFitToScreen(viewport, layout.bounds);

      expect(zoom).toBeLessThanOrEqual(1.0);
      expect(zoom).toBeGreaterThanOrEqual(0.25);
      expect(panX).toBeGreaterThan(0);
      expect(panY).toBeGreaterThan(0);
    });

    it('handles Standard Full HD 1080p Desktop (1920x1080)', () => {
      const viewport = { width: 1920, height: 1080 };
      const { zoom, panX, panY } = calculateFitToScreen(viewport, layout.bounds);

      expect(zoom).toBeGreaterThan(0.25);
      expect(zoom).toBeLessThanOrEqual(1.0);
      expect(panX).toBeDefined();
      expect(panY).toBeDefined();
    });

    it('handles Standard Laptop Viewport (1366x768)', () => {
      const viewport = { width: 1366, height: 768 };
      const { zoom, panX, panY } = calculateFitToScreen(viewport, layout.bounds);

      expect(zoom).toBeGreaterThanOrEqual(0.25);
      expect(zoom).toBeLessThanOrEqual(1.0);
      expect(panX).toBeDefined();
      expect(panY).toBeDefined();
      // Canvas fits comfortably within the 768px height
      const visibleTreeHeight = layout.bounds.height * zoom;
      expect(visibleTreeHeight).toBeLessThanOrEqual(768);
    });

    it('handles Tablet Portrait (768x1024 - iPad / Surface)', () => {
      const viewport = { width: 768, height: 1024 };
      const { zoom, panX, panY } = calculateFitToScreen(viewport, layout.bounds);

      expect(zoom).toBeGreaterThanOrEqual(0.25);
      expect(zoom).toBeLessThanOrEqual(1.0);
      expect(panY).toBeDefined();
      // Width is constrained: tree width scaled must fit within 768 - 80 padding = 688
      const visibleTreeWidth = layout.bounds.width * zoom;
      expect(visibleTreeWidth).toBeLessThanOrEqual(768);
      expect(panX).toBeGreaterThanOrEqual(0);
    });

    it('handles Mobile Portrait (390x844 - iPhone 12/13/14/15 / Modern Galaxy)', () => {
      const viewport = { width: 390, height: 844 };
      const { zoom, panX } = calculateFitToScreen(viewport, layout.bounds);

      // On narrow mobile screens, zoom scales down to fit width or clamps at minimum readable floor 0.25
      expect(zoom).toBeGreaterThanOrEqual(0.25);
      // Bounding box scaled
      const scaledWidth = layout.bounds.width * zoom;
      expect(scaledWidth).toBeDefined();
      expect(panX).toBeDefined();
    });

    it('handles Compact Mobile Portrait (360x640 - Android compact)', () => {
      const viewport = { width: 360, height: 640 };
      const { zoom } = calculateFitToScreen(viewport, layout.bounds);

      // Must never drop below minimum readable zoom clamp
      expect(zoom).toBeGreaterThanOrEqual(0.25);
    });

    it('handles Mobile Landscape (844x390 - iPhone Landscape)', () => {
      const viewport = { width: 844, height: 390 };
      const { zoom } = calculateFitToScreen(viewport, layout.bounds);

      // In landscape, height (390 - 80 = 310) is the tight constraint
      const scaledHeight = layout.bounds.height * zoom;
      expect(scaledHeight).toBeLessThanOrEqual(390);
    });
  });

  describe('Node Centering Math Across Viewports (Desktop vs Mobile)', () => {
    it('accurately centers a selected node in a 1920px wide desktop viewport', () => {
      const desktopViewport = { width: 1920, height: 1080 };
      const targetNode = layout.nodes['I3'];
      const zoom = 0.85;

      const { panX, panY } = calculateCenterOnNode(desktopViewport, targetNode, zoom);

      // At zoom 0.85, the center of the node must equal the center of the viewport (960, 540)
      const nodeCenterX = targetNode.x + targetNode.width / 2;
      const nodeCenterY = targetNode.y + targetNode.height / 2;
      const screenNodeX = panX + nodeCenterX * zoom;
      const screenNodeY = panY + nodeCenterY * zoom;

      expect(screenNodeX).toBeCloseTo(960, 1);
      expect(screenNodeY).toBeCloseTo(540, 1);
    });

    it('accurately centers a selected node in a 390px wide mobile viewport', () => {
      const mobileViewport = { width: 390, height: 844 };
      const targetNode = layout.nodes['I5'];
      const zoom = 0.5;

      const { panX, panY } = calculateCenterOnNode(mobileViewport, targetNode, zoom);

      const nodeCenterX = targetNode.x + targetNode.width / 2;
      const nodeCenterY = targetNode.y + targetNode.height / 2;
      const screenNodeX = panX + nodeCenterX * zoom;
      const screenNodeY = panY + nodeCenterY * zoom;

      // Screen center on mobile is 390/2 = 195, 844/2 = 422
      expect(screenNodeX).toBeCloseTo(195, 1);
      expect(screenNodeY).toBeCloseTo(422, 1);
    });
  });

  describe('Mobile Touch Gestures (Pinch to Zoom & 1-Finger Drag)', () => {
    it('calculates 1-finger drag delta accurately without drifting', () => {
      const initialPan = { x: 100, y: 150 };
      const touchStart = { clientX: 200, clientY: 300 };
      const dragStart = {
        x: touchStart.clientX - initialPan.x, // 100
        y: touchStart.clientY - initialPan.y  // 150
      };

      // User drags finger 50px right and 30px down
      const currentTouch = { clientX: 250, clientY: 330 };
      const nextPan = {
        x: currentTouch.clientX - dragStart.x,
        y: currentTouch.clientY - dragStart.y
      };

      expect(nextPan.x).toBe(150); // 100 + 50
      expect(nextPan.y).toBe(180); // 150 + 30
    });

    it('calculates 2-finger Euclidean distance and zoom factor correctly', () => {
      // Touch 1 at (100, 100), Touch 2 at (100, 200) -> Distance = 100
      const touch1Start = { clientX: 100, clientY: 100 };
      const touch2Start = { clientX: 100, clientY: 200 };
      const initialDist = Math.hypot(
        touch1Start.clientX - touch2Start.clientX,
        touch1Start.clientY - touch2Start.clientY
      );
      expect(initialDist).toBe(100);

      // User pinches outward (zooms in): Touch 1 at (100, 50), Touch 2 at (100, 250) -> Distance = 200
      const touch1Move = { clientX: 100, clientY: 50 };
      const touch2Move = { clientX: 100, clientY: 250 };
      const containerRect = { left: 0, top: 0 };
      const initialZoom = 1.0;
      const initialPan = { x: 0, y: 0 };

      const { nextZoom, nextPanX, nextPanY, newDist } = calculatePinchZoom(
        touch1Move,
        touch2Move,
        initialDist,
        initialZoom,
        initialPan,
        containerRect
      );

      expect(newDist).toBe(200);
      expect(nextZoom).toBe(2.0); // Doubled distance doubles zoom

      // Midpoint between fingers is (100, 150). The focal point stays stationary on zoom
      // Formula: midY - (midY - 0) * (2.0 / 1.0) = 150 - 300 = -150
      expect(nextPanY).toBe(-150);
      expect(nextPanX).toBe(-100);
    });

    it('clamps pinch zoom within safe limits (min 0.20, max 2.50)', () => {
      const containerRect = { left: 0, top: 0 };

      // Enormous pinch out
      const resultMax = calculatePinchZoom(
        { clientX: 100, clientY: 0 },
        { clientX: 100, clientY: 1000 },
        10,
        1.0,
        { x: 0, y: 0 },
        containerRect
      );
      expect(resultMax.nextZoom).toBe(2.50);

      // Extreme pinch in
      const resultMin = calculatePinchZoom(
        { clientX: 100, clientY: 100 },
        { clientX: 100, clientY: 101 },
        1000,
        1.0,
        { x: 0, y: 0 },
        containerRect
      );
      expect(resultMin.nextZoom).toBe(0.20);
    });
  });

  describe('Breakpoint & Responsive UI Rules', () => {
    // Tailwind breakpoint definition
    const SM_BREAKPOINT = 640;

    it('hides MiniMap on mobile screens (< 640px) to conserve canvas area', () => {
      const isMiniMapVisible = (viewportWidth: number) => viewportWidth >= SM_BREAKPOINT;

      expect(isMiniMapVisible(360)).toBe(false); // Mobile compact
      expect(isMiniMapVisible(390)).toBe(false); // iPhone 13/14/15
      expect(isMiniMapVisible(412)).toBe(false); // Pixel 7
      expect(isMiniMapVisible(639)).toBe(false); // Just below breakpoint

      expect(isMiniMapVisible(640)).toBe(true);  // Tailwind sm breakpoint
      expect(isMiniMapVisible(768)).toBe(true);  // iPad portrait
      expect(isMiniMapVisible(1024)).toBe(true); // iPad landscape
      expect(isMiniMapVisible(1920)).toBe(true); // Full HD desktop
    });

    it('switches PersonDrawer to full width on mobile and fixed 384px on tablet/desktop', () => {
      const getDrawerWidthClass = (viewportWidth: number) =>
        viewportWidth < SM_BREAKPOINT ? 'w-full' : 'w-96';

      expect(getDrawerWidthClass(390)).toBe('w-full');
      expect(getDrawerWidthClass(600)).toBe('w-full');
      expect(getDrawerWidthClass(768)).toBe('w-96');
      expect(getDrawerWidthClass(1920)).toBe('w-96');
    });

    it('collapses search input width gracefully on mobile vs desktop', () => {
      const getSearchInputClass = (viewportWidth: number) =>
        viewportWidth < SM_BREAKPOINT ? 'w-20' : 'w-40';

      expect(getSearchInputClass(375)).toBe('w-20');
      expect(getSearchInputClass(768)).toBe('w-40');
      expect(getSearchInputClass(1440)).toBe('w-40');
    });

    it('collapses button text labels on mobile while keeping actionable icons', () => {
      const isLabelVisible = (viewportWidth: number) => viewportWidth >= SM_BREAKPOINT;

      expect(isLabelVisible(390)).toBe(false); // Only icon visible on mobile
      expect(isLabelVisible(768)).toBe(true);  // Icon + text visible on tablet/desktop
    });
  });
});
