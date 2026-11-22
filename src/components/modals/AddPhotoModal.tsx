import React, { useState } from 'react';
import { Person, MediaItem, MediaType } from '../../types';
import {
  X,
  Camera,
  Upload,
  Link as LinkIcon,
  Check,
  Calendar,
  MapPin,
  FileText
} from 'lucide-react';

export interface AddPhotoModalProps {
  isOpen: boolean;
  theme?: 'dark' | 'light';
  targetPerson: Person;
  allPeople: Record<string, Person>;
  onClose: () => void;
  onSave: (mediaData: Omit<MediaItem, 'id'>) => void;
}

export const AddPhotoModal: React.FC<AddPhotoModalProps> = ({
  isOpen,
  theme = 'dark',
  targetPerson,
  allPeople,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const [title, setTitle] = useState<string>(`${targetPerson.fullName} Portrait`);
  const [photoType, setPhotoType] = useState<MediaType>('portrait');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [place, setPlace] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isPrimaryAvatar, setIsPrimaryAvatar] = useState<boolean>(!targetPerson.avatar);
  const [taggedPersonIds, setTaggedPersonIds] = useState<string[]>([targetPerson.id]);

  // Handle local file upload via FileReader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleTagPerson = (id: string) => {
    if (taggedPersonIds.includes(id)) {
      if (id === targetPerson.id) return; // Keep target person tagged
      setTaggedPersonIds(taggedPersonIds.filter(pid => pid !== id));
    } else {
      setTaggedPersonIds([...taggedPersonIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      alert('Please provide an image URL or upload an image file.');
      return;
    }

    const yearMatch = date.match(/\b(18|19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;

    const taggedPeople = taggedPersonIds.map(pid => ({
      personId: pid,
      isPrimaryAvatar: pid === targetPerson.id && isPrimaryAvatar
    }));

    onSave({
      url: imageUrl.trim(),
      title: title.trim() || 'Untitled Photograph',
      type: photoType,
      date: date.trim() || undefined,
      year,
      place: place.trim() || undefined,
      description: description.trim() || undefined,
      taggedPeople
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Add Photograph or Media</h3>
              <p className="text-xs text-slate-400">Tag {targetPerson.fullName} and relatives</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Image Input (URL or Local File) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Image Source *
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="https://example.com/photo.jpg or data URL"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer shrink-0 transition bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Live Preview */}
            {imageUrl && (
              <div className="mt-2 h-36 rounded-xl border overflow-hidden bg-black/40 flex items-center justify-center p-2">
                <img src={imageUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
              </div>
            )}
          </div>

          {/* Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className={`w-full px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Media Type
              </label>
              <select
                value={photoType}
                onChange={e => setPhotoType(e.target.value as MediaType)}
                className={`w-full px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="portrait">Portrait / Headshot</option>
                <option value="group">Group / Family Photo</option>
                <option value="candid">Candid / Lifestyle</option>
                <option value="document">Historical Document / Certificate</option>
                <option value="tombstone">Headstone / Monument</option>
              </select>
            </div>
          </div>

          {/* Date & Place */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Date
              </label>
              <input
                type="text"
                placeholder="e.g. 15 AUG 1968"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Location
              </label>
              <input
                type="text"
                placeholder="e.g. London, England"
                value={place}
                onChange={e => setPlace(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Story / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Add historical context or notes about this picture..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full px-3 py-1.5 text-xs rounded-xl border focus:outline-none resize-none ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Primary Avatar Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPrimaryAvatar}
              onChange={e => setIsPrimaryAvatar(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-0 w-4 h-4"
            />
            <span className="text-xs font-medium">
              Set as primary profile avatar for {targetPerson.fullName}
            </span>
          </label>

          {/* Tag Additional Relatives */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Tag Relatives in this Picture ({taggedPersonIds.length} selected)
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {Object.values(allPeople).map(person => {
                const isTagged = taggedPersonIds.includes(person.id);
                const isCurrent = person.id === targetPerson.id;

                return (
                  <div
                    key={person.id}
                    onClick={() => toggleTagPerson(person.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                      isTagged
                        ? isDark
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : isDark
                        ? 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>
                      {person.fullName} {isCurrent && '(This Person)'}
                    </span>
                    {isTagged && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-medium rounded-xl border transition ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
            >
              Save to Album
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
