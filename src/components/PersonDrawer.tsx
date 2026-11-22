import React, { useState, useMemo } from 'react';
import { Person, Family, MediaItem } from '../types';
import { PhotoLightbox } from './media/PhotoLightbox';
import { AddPhotoModal } from './modals/AddPhotoModal';
import {
  X,
  Calendar,
  MapPin,
  Briefcase,
  Heart,
  ChevronRight,
  ShieldCheck,
  Edit3,
  UserPlus,
  Trash2,
  Tag,
  GitBranch,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Camera,
  CheckCircle2,
  Plus
} from 'lucide-react';

export interface PersonDrawerProps {
  person: Person | null;
  people: Record<string, Person>;
  families: Record<string, Family>;
  media?: Record<string, MediaItem>;
  isOpen: boolean;
  theme?: 'dark' | 'light';
  editable?: boolean;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  onEditPerson?: (person: Person) => void;
  onAddRelative?: (person: Person) => void;
  onDeletePerson?: (person: Person) => void;
  onHighlightAncestors?: (person: Person) => void;
  onHighlightDescendants?: (person: Person) => void;
  onOpenRelationshipCalculator?: (person: Person) => void;
  onAddMedia?: (media: Omit<MediaItem, 'id'>) => void;
  onSetAsPrimaryAvatar?: (mediaId: string, personId: string) => void;
  onDeleteMedia?: (mediaId: string) => void;
}

export const PersonDrawer: React.FC<PersonDrawerProps> = ({
  person,
  people,
  families,
  media = {},
  isOpen,
  theme = 'dark',
  editable = true,
  onClose,
  onSelectPerson,
  onEditPerson,
  onAddRelative,
  onDeletePerson,
  onHighlightAncestors,
  onHighlightDescendants,
  onOpenRelationshipCalculator,
  onAddMedia,
  onSetAsPrimaryAvatar,
  onDeleteMedia
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'photos'>(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'photos' || t === 'media') return 'photos';
    }
    return 'details';
  });
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(() => {
    if (typeof window !== 'undefined') {
      const mId = new URLSearchParams(window.location.search).get('media');
      if (mId && media && media[mId]) return media[mId];
    }
    return null;
  });
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState<boolean>(false);

  // Parents
  const parents = useMemo(() => {
    if (!person || !person.famc) return { father: null, mother: null };
    const parentFam = families[person.famc];
    if (!parentFam) return { father: null, mother: null };
    return {
      father: parentFam.husband ? people[parentFam.husband] || null : null,
      mother: parentFam.wife ? people[parentFam.wife] || null : null
    };
  }, [person, families, people]);

  // Spouses & Children
  const spouseEntries = useMemo(() => {
    if (!person) return [];
    const entries: { spouse: Person | null; children: Person[] }[] = [];
    person.fams.forEach(famId => {
      const fam = families[famId];
      if (fam) {
        const spouseId = fam.husband === person.id ? fam.wife : fam.husband;
        const spouse = spouseId ? people[spouseId] || null : null;
        const children = fam.children.map(cid => people[cid]).filter(Boolean);
        entries.push({ spouse, children });
      }
    });
    return entries;
  }, [person, families, people]);

  // Photos where this person is tagged or referenced
  const personMediaList = useMemo(() => {
    if (!person || !media) return [];
    return Object.values(media).filter(m =>
      m.taggedPeople.some(t => t.personId === person.id) ||
      (person.mediaIds && person.mediaIds.includes(m.id))
    );
  }, [media, person]);

  if (!isOpen || !person) return null;

  const isDark = theme === 'dark';

  return (
    <>
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 backdrop-blur-xl border-l shadow-2xl z-40 flex flex-col transition-all duration-300 ${
        isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${person.gender === 'M' ? 'bg-sky-400' : person.gender === 'F' ? 'bg-rose-400' : 'bg-slate-400'}`} />
            <h3 className="font-semibold text-sm">Individual Details</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Summary */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border overflow-hidden shrink-0 ${
              person.gender === 'M'
                ? (isDark ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-sky-100 text-sky-700 border-sky-200')
                : (isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-200')
            }`}>
              {person.avatar ? (
                <img src={person.avatar} alt={person.fullName} className="w-full h-full object-cover" />
              ) : (
                `${person.first?.[0] || '?'}${person.surname?.[0] || ''}`
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold leading-snug truncate">{person.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  ID: {person.id}
                </span>
                {person.isLiving ? (
                  <span className="text-[11px] flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                    <ShieldCheck className="w-3 h-3" /> Living
                  </span>
                ) : (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    isDark ? 'text-slate-400 bg-slate-800/60 border-slate-700/40' : 'text-slate-500 bg-slate-100 border-slate-200'
                  }`}>
                    Deceased
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab Switcher: Details vs Photos */}
          <div className={`flex rounded-xl p-0.5 border mt-4 text-xs font-semibold ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-1.5 rounded-lg transition text-center ${
                activeTab === 'details'
                  ? isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Details & Vitals
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'photos'
                  ? isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Photos ({personMediaList.length})
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          {/* TAB 1: DETAILS & VITALS */}
          {activeTab === 'details' && (
            <>
              {/* Quick Action Toolbar (Edit actions only shown if editable) */}
              {(onAddRelative || onEditPerson || onDeletePerson) && (
                <div className="grid grid-cols-3 gap-2">
                  {onAddRelative && (
                    <button
                      onClick={() => onAddRelative(person)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium border transition ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> + Relative
                    </button>
                  )}

                  {onEditPerson && (
                    <button
                      onClick={() => onEditPerson(person)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium border transition ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-sky-400" /> Edit
                    </button>
                  )}

                  {onDeletePerson && (
                    <button
                      onClick={() => onDeletePerson(person)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium border transition ${
                        isDark
                          ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/50 text-rose-300'
                          : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              )}

              {/* Lineage & Relationship Analysis Actions */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-emerald-400" /> Lineage & Kinship Analysis
                </span>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {onHighlightAncestors && (
                    <button
                      onClick={() => onHighlightAncestors(person)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[11px] font-medium transition ${
                        isDark
                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300'
                          : 'bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 shadow-sm'
                      }`}
                      title="Highlight only direct genetic ancestors"
                    >
                      <ArrowUpRight className="w-4 h-4 mb-1 text-emerald-400" />
                      Ancestors
                    </button>
                  )}

                  {onHighlightDescendants && (
                    <button
                      onClick={() => onHighlightDescendants(person)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[11px] font-medium transition ${
                        isDark
                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300'
                          : 'bg-white hover:bg-sky-50 border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-700 shadow-sm'
                      }`}
                      title="Highlight all direct offspring and generations"
                    >
                      <ArrowDownRight className="w-4 h-4 mb-1 text-sky-400" />
                      Descendants
                    </button>
                  )}

                  {onOpenRelationshipCalculator && (
                    <button
                      onClick={() => onOpenRelationshipCalculator(person)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[11px] font-medium transition ${
                        isDark
                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-purple-300'
                          : 'bg-white hover:bg-purple-50 border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 shadow-sm'
                      }`}
                      title="Calculate kinship between this person and anyone else"
                    >
                      <Users className="w-4 h-4 mb-1 text-purple-400" />
                      Compare
                    </button>
                  )}
                </div>
              </div>

              {/* Vital Events */}
              <div className={`space-y-3 p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vital Events</h4>
                
                {person.birth?.date && (
                  <div className="flex items-start gap-3 text-xs">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Born:</span> {person.birth.date}
                      {person.birth.place && <div className="text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {person.birth.place}</div>}
                    </div>
                  </div>
                )}

                {person.death?.date && (
                  <div className="flex items-start gap-3 text-xs">
                    <Calendar className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Died:</span> {person.death.date}
                      {person.death.place && <div className="text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {person.death.place}</div>}
                    </div>
                  </div>
                )}

                {person.occupation && (
                  <div className="flex items-center gap-3 text-xs">
                    <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
                    <div><span className="font-medium">Occupation:</span> {person.occupation}</div>
                  </div>
                )}

                {person.bio && (
                  <div className="pt-2 border-t border-slate-700/40 text-xs">
                    <span className="font-medium block mb-1 text-slate-400">Biography:</span>
                    <p className="leading-relaxed">{person.bio}</p>
                  </div>
                )}
              </div>

              {/* Custom Attributes */}
              {person.attributes && Object.keys(person.attributes).length > 0 && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Additional Details
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(person.attributes).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-none">
                        <span className="text-slate-400 font-medium">{key}:</span>
                        <span className="font-semibold">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parents */}
              {(parents.father || parents.mother) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Parents</h4>
                  <div className="space-y-1.5">
                    {parents.father && (
                      <button
                        onClick={() => onSelectPerson(parents.father!.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition text-left text-xs ${
                          isDark ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60' : 'bg-slate-100 hover:bg-slate-200/70 border-slate-200'
                        }`}
                      >
                        <span><span className="text-slate-400 mr-2">Father:</span>{parents.father.fullName}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                    {parents.mother && (
                      <button
                        onClick={() => onSelectPerson(parents.mother!.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition text-left text-xs ${
                          isDark ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60' : 'bg-slate-100 hover:bg-slate-200/70 border-slate-200'
                        }`}
                      >
                        <span><span className="text-slate-400 mr-2">Mother:</span>{parents.mother.fullName}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Spouse & Children */}
              {spouseEntries.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Family & Children</h4>
                  {spouseEntries.map((entry, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {entry.spouse ? (
                        <button
                          onClick={() => onSelectPerson(entry.spouse!.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg transition text-left text-xs ${
                            isDark ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-white hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 text-rose-400" /> Spouse: {entry.spouse.fullName}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ) : (
                        <div className="text-xs text-slate-400 italic">Unrecorded spouse</div>
                      )}

                      {entry.children.length > 0 && (
                        <div className="pl-3 space-y-1 border-l-2 border-slate-700/50 ml-1 mt-2">
                          <span className="text-[11px] font-medium text-slate-400 block mb-1">Children ({entry.children.length}):</span>
                          {entry.children.map(ch => (
                            <button
                              key={ch.id}
                              onClick={() => onSelectPerson(ch.id)}
                              className={`w-full flex items-center justify-between p-1.5 rounded transition text-left text-xs ${
                                isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-200/60'
                              }`}
                            >
                              <span className="truncate">{ch.fullName}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 2: PHOTOS & MEDIA */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              {/* Add Photo Button (if editable) */}
              {editable && onAddMedia && (
                <button
                  onClick={() => setIsAddPhotoOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
                >
                  <Plus className="w-4 h-4" /> Add Photo or Media
                </button>
              )}

              {personMediaList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto border border-slate-700/40">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p>No photographs found for {person.fullName}.</p>
                  {editable && onAddMedia && (
                    <button
                      onClick={() => setIsAddPhotoOpen(true)}
                      className="text-xs text-emerald-400 hover:underline font-semibold"
                    >
                      + Add the first photograph
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {personMediaList.map(item => {
                    const isPrimary = person.avatarMediaId === item.id || person.avatar === item.url;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setViewingMedia(item)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer transition hover:scale-[1.03] shadow-md ${
                          isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-600' : 'bg-slate-100 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="aspect-square bg-black/60 flex items-center justify-center overflow-hidden">
                          <img
                            src={item.thumbnailUrl || item.url}
                            alt={item.title}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                          />
                        </div>

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-white border border-white/20">
                            {item.type}
                          </span>

                          {isPrimary && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/90 text-white flex items-center gap-1 shadow-md">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Avatar
                            </span>
                          )}
                        </div>

                        {/* Bottom Info Bar */}
                        <div className="p-2 text-left">
                          <h4 className="font-semibold text-xs leading-tight truncate">{item.title}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            {item.year && <span>{item.year}</span>}
                            {item.taggedPeople.length > 1 && (
                              <span>• {item.taggedPeople.length} people</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {viewingMedia && (
        <PhotoLightbox
          mediaItem={viewingMedia}
          isOpen={true}
          theme={theme}
          people={people}
          currentPersonId={person.id}
          editable={editable}
          onClose={() => setViewingMedia(null)}
          onSelectPerson={onSelectPerson}
          onSetAsPrimaryAvatar={onSetAsPrimaryAvatar}
          onDeleteMedia={onDeleteMedia}
        />
      )}

      {/* Add Photo Modal */}
      {isAddPhotoOpen && onAddMedia && (
        <AddPhotoModal
          isOpen={true}
          theme={theme}
          targetPerson={person}
          allPeople={people}
          onClose={() => setIsAddPhotoOpen(false)}
          onSave={onAddMedia}
        />
      )}
    </>
  );
};
