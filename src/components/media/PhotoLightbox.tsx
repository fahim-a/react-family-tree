import React, { useEffect } from 'react';
import { MediaItem, Person } from '../../types';
import {
  X,
  Calendar,
  MapPin,
  Users,
  Image as ImageIcon,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export interface PhotoLightboxProps {
  mediaItem: MediaItem | null;
  isOpen: boolean;
  theme?: 'dark' | 'light';
  people: Record<string, Person>;
  currentPersonId?: string | null;
  editable?: boolean;
  onClose: () => void;
  onSelectPerson?: (personId: string) => void;
  onSetAsPrimaryAvatar?: (mediaId: string, personId: string) => void;
  onDeleteMedia?: (mediaId: string) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  mediaItem,
  isOpen,
  theme = 'dark',
  people,
  currentPersonId,
  editable = true,
  onClose,
  onSelectPerson,
  onSetAsPrimaryAvatar,
  onDeleteMedia
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mediaItem) return null;

  const isDark = theme === 'dark';
  const currentPersonTag = currentPersonId
    ? mediaItem.taggedPeople.find(t => t.personId === currentPersonId)
    : undefined;
  const isCurrentPrimary = currentPersonTag?.isPrimaryAvatar;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition"
          title="Close Lightbox"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Photo Canvas */}
        <div className="flex-1 bg-black/95 flex items-center justify-center p-4 min-h-[300px] md:min-h-[500px] overflow-hidden">
          <img
            src={mediaItem.url}
            alt={mediaItem.title}
            className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Right Side: Photo Metadata & People Tagged */}
        <div className={`w-full md:w-80 lg:w-96 p-5 flex flex-col border-t md:border-t-0 md:border-l overflow-y-auto ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
        }`}>
          {/* Header */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                mediaItem.type === 'portrait'
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                  : mediaItem.type === 'group'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {mediaItem.type}
              </span>
              {mediaItem.date && (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" /> {mediaItem.date}
                </span>
              )}
            </div>

            <h3 className="font-bold text-lg leading-snug">{mediaItem.title}</h3>

            {mediaItem.place && (
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{mediaItem.place}</span>
              </div>
            )}
          </div>

          {/* Description / Story */}
          {mediaItem.description && (
            <div className="text-xs leading-relaxed text-slate-400 mb-5 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <p>{mediaItem.description}</p>
            </div>
          )}

          {/* People Tagged in this Photograph */}
          <div className="space-y-3 flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              People in this Photo ({mediaItem.taggedPeople.length})
            </h4>

            <div className="space-y-1.5">
              {mediaItem.taggedPeople.map(tag => {
                const person = people[tag.personId];
                if (!person) return null;

                const isSelected = currentPersonId === tag.personId;

                return (
                  <div
                    key={tag.personId}
                    onClick={() => {
                      onSelectPerson?.(tag.personId);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        person.gender === 'M'
                          ? 'bg-sky-500/20 text-sky-400'
                          : person.gender === 'F'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {person.first?.[0] || '?'}{person.surname?.[0] || ''}
                      </div>
                      <span className="text-xs font-semibold truncate">{person.fullName}</span>
                    </div>

                    {tag.isPrimaryAvatar && (
                      <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Profile
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Toolbar */}
          {editable && (
            <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
              {currentPersonId && !isCurrentPrimary && onSetAsPrimaryAvatar && (
                <button
                  onClick={() => onSetAsPrimaryAvatar(mediaItem.id, currentPersonId)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Set as Profile Avatar
                </button>
              )}

              {onDeleteMedia && (
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${mediaItem.title}" from media catalog?`)) {
                      onDeleteMedia(mediaItem.id);
                      onClose();
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium border transition ${
                    isDark
                      ? 'border-rose-900/50 hover:bg-rose-950/60 text-rose-400'
                      : 'border-rose-200 hover:bg-rose-50 text-rose-600'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Photo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
