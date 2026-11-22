import React, { useState, useMemo } from 'react';
import { TreeData } from '../../types';
import { calculateRelationship, RelationshipResult } from '../../analysis/relationshipCalculator';
import {
  X,
  Users,
  ArrowRightLeft,
  Heart,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Link2,
  AlertCircle
} from 'lucide-react';

export interface RelationshipModalProps {
  isOpen: boolean;
  theme?: 'dark' | 'light';
  data: TreeData;
  initialPersonAId?: string | null;
  initialPersonBId?: string | null;
  onClose: () => void;
  onHighlightPath?: (personAId: string, personBId: string, path: string[]) => void;
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  theme = 'dark',
  data,
  initialPersonAId,
  initialPersonBId,
  onClose,
  onHighlightPath
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const peopleList = useMemo(() => Object.values(data.people), [data.people]);

  // Default selection if not provided
  const [personAId, setPersonAId] = useState<string>(() => {
    if (initialPersonAId && data.people[initialPersonAId]) return initialPersonAId;
    return peopleList[0]?.id || '';
  });

  const [personBId, setPersonBId] = useState<string>(() => {
    if (initialPersonBId && data.people[initialPersonBId]) return initialPersonBId;
    return peopleList.length > 1 ? peopleList[1].id : peopleList[0]?.id || '';
  });

  const [searchA, setSearchA] = useState<string>('');
  const [searchB, setSearchB] = useState<string>('');

  const personA = data.people[personAId];
  const personB = data.people[personBId];

  // Calculate live relationship
  const result: RelationshipResult | null = useMemo(() => {
    if (!personAId || !personBId || !personA || !personB) return null;
    try {
      return calculateRelationship(data, personAId, personBId);
    } catch {
      return null;
    }
  }, [data, personAId, personBId, personA, personB]);

  const swapPeople = () => {
    const temp = personAId;
    setPersonAId(personBId);
    setPersonBId(temp);
  };

  const filteredPeopleA = useMemo(() => {
    if (!searchA.trim()) return peopleList;
    const q = searchA.toLowerCase();
    return peopleList.filter(p => p.fullName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [peopleList, searchA]);

  const filteredPeopleB = useMemo(() => {
    if (!searchB.trim()) return peopleList;
    const q = searchB.toLowerCase();
    return peopleList.filter(p => p.fullName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [peopleList, searchB]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Relationship Calculator</h3>
              <p className="text-xs text-slate-400">Discover how any two relatives in the tree are connected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Individual Selectors Row */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 items-center">
            {/* Person A Selector */}
            <div className={`p-3 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Person A
              </label>
              <input
                type="text"
                placeholder="Search name..."
                value={searchA}
                onChange={e => setSearchA(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none mb-1 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
              <select
                value={personAId}
                onChange={e => setPersonAId(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none font-medium truncate ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {filteredPeopleA.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.gender || '?'}) {p.birth?.year ? `b. ${p.birth.year}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={swapPeople}
                className={`p-2 rounded-xl border shadow-sm transition hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-black'
                }`}
                title="Swap Person A and Person B"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Person B Selector */}
            <div className={`p-3 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Person B
              </label>
              <input
                type="text"
                placeholder="Search name..."
                value={searchB}
                onChange={e => setSearchB(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none mb-1 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
              <select
                value={personBId}
                onChange={e => setPersonBId(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none font-medium truncate ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {filteredPeopleB.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.gender || '?'}) {p.birth?.year ? `b. ${p.birth.year}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Relationship Result Display */}
          {result ? (
            <div className={`p-5 rounded-2xl border space-y-4 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-800/60">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                    Calculated Kinship
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400">
                    {result.relationshipName.toUpperCase()}
                  </h2>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {result.isDirectBlood ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" /> Direct Blood Kinship
                    </span>
                  ) : result.type === 'spouse' ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <Heart className="w-3.5 h-3.5" /> Spouses / Married
                    </span>
                  ) : result.type === 'self' ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      <Sparkles className="w-3.5 h-3.5" /> Same Individual
                    </span>
                  ) : result.type === 'unrelated' ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
                      <AlertCircle className="w-3.5 h-3.5" /> Unrelated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      <Link2 className="w-3.5 h-3.5" /> Connection by Marriage
                    </span>
                  )}

                  {result.degreeOfKinship !== undefined && (
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${
                      isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                    }`}>
                      Degree: {result.degreeOfKinship}
                    </span>
                  )}
                </div>
              </div>

              {/* Natural Language Narrative */}
              <div className="text-sm leading-relaxed">
                <p className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  {result.description}
                </p>
              </div>

              {/* Common Ancestors (if any) */}
              {result.commonAncestors.length > 0 && (
                <div className="pt-3 border-t border-slate-800/40 text-xs">
                  <span className="font-semibold text-slate-400 block mb-1">
                    Most Recent Common Ancestor(s):
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.commonAncestors.map(anc => (
                      <span
                        key={anc.id}
                        className={`px-2.5 py-1 rounded-lg border font-medium ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        {anc.fullName} ({anc.birth?.year || '?'})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Kinship Path Breadcrumbs */}
              {result.path.length > 0 && (
                <div className="pt-3 border-t border-slate-800/40 text-xs">
                  <span className="font-semibold text-slate-400 block mb-2">
                    Lineage Step-by-Step Path:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result.path.map((item, idx) => {
                      const isPerson = !!data.people[item];
                      const p = isPerson ? data.people[item] : null;

                      return (
                        <React.Fragment key={item}>
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
                              isPerson
                                ? isDark
                                  ? 'bg-slate-800 border-slate-700 text-emerald-400 font-semibold'
                                  : 'bg-white border-slate-200 text-emerald-700 font-semibold shadow-sm'
                                : isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-400 text-[10px]'
                                : 'bg-slate-100 border-slate-200 text-slate-500 text-[10px]'
                            }`}
                          >
                            {p ? p.fullName : `Union (${item})`}
                          </span>
                          {idx < result.path.length - 1 && (
                            <span className="text-slate-500 font-bold text-xs">→</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Select two people to calculate their kinship.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-medium rounded-xl border transition ${
              isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            Close
          </button>

          {onHighlightPath && result && result.path.length > 0 && (
            <button
              onClick={() => {
                onHighlightPath(personAId, personBId, result.path);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-lg shadow-emerald-600/20 transition hover:scale-[1.02]"
            >
              <GitBranch className="w-3.5 h-3.5" /> Highlight Path on Tree
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
