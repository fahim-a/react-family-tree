import React from 'react';
import { LayoutNode } from '../types';
import { User, Camera } from 'lucide-react';

export interface PersonCardProps {
  node: LayoutNode;
  theme?: 'dark' | 'light';
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  highlightVariant?: 'ancestor' | 'descendant' | 'path';
  onClick?: (node: LayoutNode) => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  node,
  theme = 'dark',
  isSelected,
  isHighlighted,
  isDimmed = false,
  highlightVariant,
  onClick
}) => {
  const isDark = theme === 'dark';
  const isMale = node.gender === 'M';
  const isFemale = node.gender === 'F';

  const genderClasses = isDark
    ? isMale
      ? 'border-sky-500/40 bg-slate-900/90 text-sky-100 hover:border-sky-400'
      : isFemale
      ? 'border-rose-500/40 bg-slate-900/90 text-rose-100 hover:border-rose-400'
      : 'border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-500'
    : isMale
    ? 'border-sky-300 bg-white text-slate-800 hover:border-sky-500 shadow-md'
    : isFemale
    ? 'border-rose-300 bg-white text-slate-800 hover:border-rose-500 shadow-md'
    : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500 shadow-md';

  const avatarClasses = isDark
    ? isMale
      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
      : isFemale
      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
      : 'bg-slate-700/30 text-slate-400 border border-slate-600/30'
    : isMale
    ? 'bg-sky-100 text-sky-700 border border-sky-200'
    : isFemale
    ? 'bg-rose-100 text-rose-700 border border-rose-200'
    : 'bg-slate-100 text-slate-600 border border-slate-200';

  const birthYear = node.birth?.year;
  const deathYear = node.death?.year;
  let datesText = '';
  if (birthYear && deathYear) {
    datesText = `${birthYear} – ${deathYear}`;
  } else if (birthYear) {
    datesText = `b. ${birthYear}`;
  } else if (deathYear) {
    datesText = `d. ${deathYear}`;
  }

  const initials = `${node.first?.[0] || ''}${node.surname?.[0] || ''}`.toUpperCase() || '?';

  // Highlight variant ring styling
  let ringClasses = '';
  if (isSelected) {
    ringClasses = 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30 shadow-emerald-500/25';
  } else if (highlightVariant === 'ancestor') {
    ringClasses = 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950 scale-105 z-30 shadow-emerald-500/30';
  } else if (highlightVariant === 'descendant') {
    ringClasses = 'ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-950 scale-105 z-30 shadow-sky-500/30';
  } else if (highlightVariant === 'path') {
    ringClasses = 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950 scale-105 z-30 shadow-amber-500/30';
  } else if (isHighlighted) {
    ringClasses = 'ring-2 ring-amber-400 shadow-amber-500/20 z-20';
  }

  return (
    <div
      onClick={() => onClick?.(node)}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        cursor: 'pointer'
      }}
      className={`group rounded-xl p-2.5 transition-all duration-300 border shadow-lg backdrop-blur-md select-none ${genderClasses} ${
        isDimmed ? 'opacity-25 filter grayscale hover:opacity-75 transition-opacity' : 'opacity-100'
      } ${ringClasses || 'z-10'}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-xs shrink-0 ${avatarClasses}`}>
          {node.avatar ? (
            <img src={node.avatar} alt={node.fullName} className="w-full h-full object-cover rounded-lg" />
          ) : initials !== '?' ? (
            initials
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className={`font-semibold text-xs leading-tight truncate ${
              isDark ? 'text-slate-100 group-hover:text-white' : 'text-slate-900 group-hover:text-black font-bold'
            }`}>
              {node.fullName}
            </h4>
            {node.isLiving && (
              <span title="Living Person (Privacy Protected)" className="inline-block shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            {datesText && (
              <span className={`text-[10px] font-mono leading-none ${
                isDark ? 'text-slate-400' : 'text-slate-500 font-medium'
              }`}>
                {datesText}
              </span>
            )}

            {node.occupation && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded border truncate max-w-[80px] leading-none ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {node.occupation}
              </span>
            )}

            {node.mediaIds && node.mediaIds.length > 0 && (
              <span
                title={`${node.mediaIds.length} photograph${node.mediaIds.length > 1 ? 's' : ''}`}
                className={`text-[9px] px-1 py-0.5 rounded border flex items-center gap-0.5 leading-none shrink-0 ${
                  isDark ? 'bg-slate-800 text-sky-300 border-slate-700' : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                <Camera className="w-2.5 h-2.5" />
                {node.mediaIds.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
