import React, { useState } from 'react';
import { Person } from '../../types';
import { X, Plus, Trash2, Save, User } from 'lucide-react';

export interface EditPersonModalProps {
  person: Person;
  isOpen: boolean;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onSave: (updates: Partial<Person>) => void;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  person,
  isOpen,
  theme = 'dark',
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const [first, setFirst] = useState(person.first || '');
  const [surname, setSurname] = useState(person.surname || '');
  const [gender, setGender] = useState<'M' | 'F' | 'O' | 'U'>(person.gender || 'U');
  const [isLiving, setIsLiving] = useState(person.isLiving ?? true);
  const [birthYear, setBirthYear] = useState<string>(person.birth?.year ? String(person.birth.year) : '');
  const [birthDate, setBirthDate] = useState(person.birth?.date || '');
  const [birthPlace, setBirthPlace] = useState(person.birth?.place || '');
  const [deathYear, setDeathYear] = useState<string>(person.death?.year ? String(person.death.year) : '');
  const [deathDate, setDeathDate] = useState(person.death?.date || '');
  const [deathPlace, setDeathPlace] = useState(person.death?.place || '');
  const [occupation, setOccupation] = useState(person.occupation || '');
  const [bio, setBio] = useState(person.bio || '');

  // Custom key/value pairs
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>(
    Object.entries(person.attributes || {}).map(([key, value]) => ({ key, value: String(value) }))
  );

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: 'key' | 'value', val: string) => {
    setCustomFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const attributes: Record<string, string> = {};
    customFields.forEach(cf => {
      if (cf.key.trim()) {
        attributes[cf.key.trim()] = cf.value.trim();
      }
    });

    const updates: Partial<Person> = {
      first: first.trim(),
      surname: surname.trim(),
      fullName: `${first.trim()} ${surname.trim()}`.trim() || 'Unknown Person',
      gender,
      isLiving,
      birth: {
        date: birthDate.trim() || undefined,
        year: birthYear ? parseInt(birthYear, 10) : undefined,
        place: birthPlace.trim() || undefined
      },
      death: !isLiving ? {
        date: deathDate.trim() || undefined,
        year: deathYear ? parseInt(deathYear, 10) : undefined,
        place: deathPlace.trim() || undefined
      } : undefined,
      occupation: occupation.trim() || undefined,
      bio: bio.trim() || undefined,
      attributes
    };

    onSave(updates);
    onClose();
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl border my-8 overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Edit Person Details</h3>
              <p className="text-xs text-slate-400">ID: {person.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">First Name</label>
              <input
                type="text"
                value={first}
                onChange={e => setFirst(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Surname</label>
              <input
                type="text"
                value={surname}
                onChange={e => setSurname(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Gender & Living Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as any)}
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
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
              <label className="block text-xs font-medium mb-1">Living Status</label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isLiving"
                  checked={isLiving}
                  onChange={e => setIsLiving(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isLiving" className="text-xs cursor-pointer select-none">
                  Person is living
                </label>
              </div>
            </div>
          </div>

          {/* Birth Info */}
          <div className="border-t border-slate-700/50 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Birth Details</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1">Year</label>
                <input
                  type="number"
                  placeholder="e.g. 1960"
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1">Date (Full/GEDCOM)</label>
                <input
                  type="text"
                  placeholder="e.g. 15 SEP 1960"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs mb-1">Birthplace</label>
              <input
                type="text"
                placeholder="City, State/Province, Country"
                value={birthPlace}
                onChange={e => setBirthPlace(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Death Info (if deceased) */}
          {!isLiving && (
            <div className="border-t border-slate-700/50 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Death Details</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs mb-1">Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2015"
                    value={deathYear}
                    onChange={e => setDeathYear(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs mb-1">Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 24 MAY 2015"
                    value={deathDate}
                    onChange={e => setDeathDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs mb-1">Death / Burial Place</label>
                <input
                  type="text"
                  placeholder="City, State/Province, Country"
                  value={deathPlace}
                  onChange={e => setDeathPlace(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Occupation & Bio */}
          <div className="border-t border-slate-700/50 pt-3 space-y-2">
            <div>
              <label className="block text-xs font-medium mb-1">Occupation / Profession</label>
              <input
                type="text"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                placeholder="e.g. Software Engineer, Doctor, Author"
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Biography / Notes</label>
              <textarea
                rows={2}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Life narrative, historical highlights, or personal recollections..."
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Arbitrary Custom Key/Value Attributes */}
          <div className="border-t border-slate-700/50 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Custom Fields (Key/Value)
              </h4>
              <button
                type="button"
                onClick={addCustomField}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Plus className="w-3 h-3" /> Add Field
              </button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No custom fields added yet.</p>
            ) : (
              <div className="space-y-2">
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Property (e.g. Religion, Military)"
                      value={field.key}
                      onChange={e => updateCustomField(idx, 'key', e.target.value)}
                      className={`w-2/5 px-2.5 py-1 text-xs rounded border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={field.value}
                      onChange={e => updateCustomField(idx, 'value', e.target.value)}
                      className={`flex-1 px-2.5 py-1 text-xs rounded border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                      title="Remove field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className={`border-t pt-4 flex items-center justify-end gap-2.5 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
