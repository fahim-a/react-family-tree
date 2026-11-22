import React from 'react';
import { TreeLayout } from '../types';

export interface MiniMapProps {
  layout: TreeLayout;
  viewport: { x: number; y: number; zoom: number; width: number; height: number };
  onNavigate?: (x: number, y: number) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({ layout, viewport }) => {
  const mapWidth = 160;
  const mapHeight = 110;

  const { bounds } = layout;
  if (!bounds || bounds.width === 0 || bounds.height === 0) return null;

  const scale = Math.min(mapWidth / bounds.width, mapHeight / bounds.height);

  // Viewport camera rect on minimap
  // Viewport center in world coords:
  const viewWorldWidth = viewport.width / viewport.zoom;
  const viewWorldHeight = viewport.height / viewport.zoom;
  const viewWorldX = -viewport.x / viewport.zoom;
  const viewWorldY = -viewport.y / viewport.zoom;

  const camX = (viewWorldX - bounds.minX) * scale;
  const camY = (viewWorldY - bounds.minY) * scale;
  const camW = Math.max(10, viewWorldWidth * scale);
  const camH = Math.max(8, viewWorldHeight * scale);

  return (
    <div className="hidden sm:block absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl z-30 select-none overflow-hidden">
      <svg
        width={mapWidth}
        height={mapHeight}
        className="bg-slate-950/80 rounded-lg"
      >
        {/* Draw miniature nodes */}
        {Object.values(layout.nodes).map(n => {
          const nx = (n.x - bounds.minX) * scale;
          const ny = (n.y - bounds.minY) * scale;
          const nw = Math.max(3, n.width * scale);
          const nh = Math.max(2, n.height * scale);
          return (
            <rect
              key={n.id}
              x={nx}
              y={ny}
              width={nw}
              height={nh}
              rx={1}
              fill={n.gender === 'M' ? '#38bdf8' : n.gender === 'F' ? '#fb7185' : '#94a3b8'}
              opacity={0.6}
            />
          );
        })}

        {/* Viewport camera outline */}
        <rect
          x={camX}
          y={camY}
          width={camW}
          height={camH}
          fill="rgba(52, 211, 153, 0.15)"
          stroke="#34d399"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </div>
  );
};
