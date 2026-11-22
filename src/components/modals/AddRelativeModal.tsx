import React, { useState, useMemo } from 'react';
import { Person } from '../../types';
import { X, Heart, UserPlus, Users, ArrowUpCircle, Check } from 'lucide-react';

export interface AddRelativeModalProps {
  sourcePerson: Person;
  allPeople: Record<string, Person>;
  isOpen: boolean;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onAddSpouse: (spouseOrId: Partial<Person> | string, marriage?: { date?: string; year?: number; place?: string }) => void;
  onAddChild: (childOrId: Partial<Person> | string) => void;
  onAddParent: (parentOrId: Partial<Person> | string, relation: 'father' | 'mother') => void;
}

export const AddRelativeModal: React.FC<AddRelativeModalProps> = ({
  sourcePerson,
  allPeople,
  isOpen,
  theme = 'dark',
  onClose,
  onAddSpouse,
  onAddChild,
  onAddParent
}) => {
  if (!isOpen) return null;

  const [relationType, setRelationType] = useState<'spouse' | 'child' | 'parent'>('spouse');
  const [parentType, setParentType] = useState<'father' | 'mother'>('father');
  const [mode, setMode] = useState<'new' | 'existing'>('new');

  // New Person fields
  const [first, setFirst] = useState('');
  const [surname, setSurname] = useState(sourcePerson.surname || '');
  const [gender, setGender] = useState<'M' | 'F' | 'O' | 'U'>(
    relationType === 'spouse'
      ? (sourcePerson.gender === 'M' ? 'F' : 'M')
      : relationType === 'parent'
      ? (parentType === 'father' ? 'M' : 'F')
      : 'U'
  );
  const [birthYear, setBirthYear] = useState('');
  const [occupation, setOccupation] = useState('');

  // Marriage info (if spouse)
  const [marriageYear, setMarriageYear] = useState('');
  const [marriagePlace, setMarriagePlace] = useState('');

  // Existing Person Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');

  // Candidates for existing selection (exclude source person)
  const candidates = useMemo(() => {
    return Object.values(allPeople)
      .filter(p => p.id !== sourcePerson.id)
      .filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return p.fullName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
      });
  }, [allPeople, sourcePerson.id, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'existing') {
      if (!selectedExistingId) return;
      if (relationType === 'spouse') {
        onAddSpouse(selectedExistingId, marriageYear ? { year: parseInt(marriageYear, 10), place: marriagePlace.trim() || undefined } : undefined);
      } else if (relationType === 'child') {
        onAddChild(selectedExistingId);
      } else if (relationType === 'parent') {
        onAddParent(selectedExistingId, parentType);
      }
    } else {
      const newPersonData: Partial<Person> = {
        first: first.trim() || 'New',
        surname: surname.trim() || '',
        fullName: `${first.trim() || 'New'} ${surname.trim() || ''}`.trim(),
        gender,
        isLiving: true,
        birth: birthYear ? { year: parseInt(birthYear, 10) } : undefined,
        occupation: occupation.trim() || undefined
      };

      if (relationType === 'spouse') {
        onAddSpouse(newPersonData, marriageYear ? { year: parseInt(marriageYear, 10), place: marriagePlace.trim() || undefined } : undefined);
      } else if (relationType === 'child') {
        onAddChild(newPersonData);
      } else if (relationType === 'parent') {
        onAddParent(newPersonData, parentType);
      }
    }

    onClose();
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
        }`}>
          <div>
            <h3 className="font-bold text-base">Add Relative</h3>
            <p className="text-xs text-slate-400">Connecting to {sourcePerson.fullName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Relation Type Tabs */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-slate-400">Relationship to Add</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRelationType('spouse');
                  setGender(sourcePerson.gender === 'M' ? 'F' : 'M');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  relationType === 'spouse'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <Heart className="w-3.5 h-3.5" /> Spouse
              </button>
              <button
                type="button"
                onClick={() => setRelationType('child')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  relationType === 'child'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Child
              </button>
              <button
                type="button"
                onClick={() => setRelationType('parent')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  relationType === 'parent'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" /> Parent
              </button>
            </div>
          </div>

          {/* If Parent: Father vs Mother selector */}
          {relationType === 'parent' && (
            <div className="flex gap-4 p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="parentType"
                  checked={parentType === 'father'}
                  onChange={() => { setParentType('father'); setGender('M'); }}
                  className="text-emerald-500"
                />
                Father
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="parentType"
                  checked={parentType === 'mother'}
                  onChange={() => { setParentType('mother'); setGender('F'); }}
                  className="text-emerald-500"
                />
                Mother
              </label>
            </div>
          )}

          {/* Mode Switch: Create New vs Link Existing */}
          <div className="flex border-b border-slate-800 pb-2 gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`pb-1 border-b-2 transition ${
                mode === 'new' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Create New Person
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`pb-1 border-b-2 transition ${
                mode === 'existing' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Link Existing Relative on Tree
            </button>
          </div>

          {mode === 'new' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1">First Name</label>
                  <input
                    type="text"
                    value={first}
                    onChange={e => setFirst(e.target.value)}
                    placeholder="e.g. Elizabeth"
                    required
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Surname</label>
                  <input
                    type="text"
                    value={surname}
                    onChange={e => setSurname(e.target.value)}
                    placeholder="e.g. Hawthorne"
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                    <option value="U">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1">Birth Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 1985"
                    value={birthYear}
                    onChange={e => setBirthYear(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1">Occupation</label>
                <input
                  type="text"
                  placeholder="e.g. Historian, Engineer"
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Marriage Details if adding spouse */}
              {relationType === 'spouse' && (
                <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Marriage Year</label>
                    <input
                      type="number"
                      placeholder="e.g. 2010"
                      value={marriageYear}
                      onChange={e => setMarriageYear(e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Marriage Place</label>
                    <input
                      type="text"
                      placeholder="City, Country"
                      value={marriagePlace}
                      onChange={e => setMarriagePlace(e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search person on tree by name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />

              <div className={`max-h-48 overflow-y-auto rounded-xl border divide-y ${
                isDark ? 'bg-slate-950 border-slate-800 divide-slate-800' : 'bg-slate-50 border-slate-200 divide-slate-200'
              }`}>
                {candidates.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">No matching relatives found</div>
                ) : (
                  candidates.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedExistingId(c.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer text-xs transition ${
                        selectedExistingId === c.id
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div>{c.fullName}</div>
                        <div className="text-[10px] text-slate-400">ID: {c.id} • {c.birth?.year ? `b. ${c.birth.year}` : 'Year unknown'}</div>
                      </div>
                      {selectedExistingId === c.id && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-medium rounded-xl border transition ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mode === 'existing' && !selectedExistingId}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/20 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {mode === 'existing' ? 'Link Relative' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
