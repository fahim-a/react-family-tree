import React, { useState } from 'react';
import { FamilyTree } from '../components/FamilyTree';
import { parseGedcom } from '../parser/gedcomParser';
import { normalizeTreeData } from '../parser/treeNormalizer';
import { getSampleTreeWithMedia } from './sampleData';
import { createEmptyTree } from '../editor/treeMutations';
import { downloadGedcomFile } from '../exporter/gedcomExporter';
import { downloadJsonFile } from '../exporter/jsonExporter';
import { TreeData } from '../types';
import {
  GitFork,
  Upload,
  Shield,
  Users,
  Layers,
  Code,
  Sun,
  Moon,
  FileJson,
  FileText,
  RotateCcw,
  Sparkles,
  PenLine,
  Lock
} from 'lucide-react';

export const App: React.FC = () => {
  // Theme state with localStorage persistence & URL parameter override
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const urlTheme = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('theme') as 'dark' | 'light')
      : null;
    return urlTheme || (localStorage.getItem('family_tree_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('family_tree_theme', nextTheme);
  };

  const isDark = theme === 'dark';

  // Editable state (can be toggled or initialized via ?editable=false or ?readonly=true)
  const [editable, setEditable] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('editable') === 'false' || p.get('mode') === 'readonly' || p.get('readonly') === 'true') {
        return false;
      }
    }
    return true;
  });

  // Tree data state
  const [treeData, setTreeData] = useState<TreeData>(() => getSampleTreeWithMedia());
  const [currentDatasetName, setCurrentDatasetName] = useState<string>('Hawthorne Dynasty (4 Generations)');
  const [activeTab, setActiveTab] = useState<'canvas' | 'docs'>('canvas');

  // Handle custom GEDCOM or JSON file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed && typeof parsed === 'object') {
            const normalized = normalizeTreeData(parsed);
            if (Object.keys(normalized.people).length > 0) {
              setTreeData(normalized);
              setCurrentDatasetName(file.name);
            } else {
              alert('Invalid family tree JSON: no individuals found in dataset.');
            }
          } else {
            alert('Invalid family tree JSON: root element must be a valid JSON object.');
          }
        } catch (err: any) {
          alert(`Failed to parse JSON file: ${err.message}`);
        }
      } else {
        try {
          const parsed = parseGedcom(content);
          setTreeData(parsed);
          setCurrentDatasetName(file.name);
        } catch (err: any) {
          alert(`Failed to parse GEDCOM file: ${err.message}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadSample = () => {
    setTreeData(getSampleTreeWithMedia());
    setCurrentDatasetName('Hawthorne Dynasty (4 Generations)');
  };

  const loadQueenVictoria = async () => {
    try {
      const mod = await import('../../samples/queen_victoria.json');
      setTreeData(normalizeTreeData(mod.default || mod));
      setCurrentDatasetName('Queen Victoria & Royal Descendants (487 People)');
    } catch (err: any) {
      alert(`Failed to load Queen Victoria dataset: ${err.message}`);
    }
  };

  const startBlankTree = () => {
    setTreeData(createEmptyTree());
    setCurrentDatasetName('New Blank Tree');
  };

  // Metrics
  const peopleCount = Object.keys(treeData.people).length;
  const familyCount = Object.keys(treeData.families).length;
  const livingCount = Object.values(treeData.people).filter(p => p.isLiving).length;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
      {/* Top Navigation Bar */}
      <header className={`border-b backdrop-blur-xl sticky top-0 z-40 transition-colors duration-300 ${isDark ? 'border-slate-800/80 bg-slate-900/70' : 'border-slate-200 bg-white/80'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <GitFork className="w-5 h-5 rotate-180" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm tracking-tight">React Family Tree</h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  MIT Open Source
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 hidden md:inline">
                  GEDCOM 5.5.x & 7.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">Zero-backend client-rendered genealogy visualizer & interactive editor with GEDCOM 5.5.x & 7.0 support</p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Tab Switcher */}
            <div className={`flex items-center p-0.5 rounded-lg border text-xs ${isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-100 border-slate-200'
              }`}>
              <button
                onClick={() => setActiveTab('canvas')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${activeTab === 'canvas'
                  ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm font-semibold'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Interactive Canvas
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${activeTab === 'docs'
                  ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm font-semibold'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                <Code className="w-3.5 h-3.5" /> Quickstart & API
              </button>
            </div>

            {/* Read-Only vs Edit Mode Toggle */}
            <button
              onClick={() => setEditable(!editable)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${editable
                ? isDark
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/70'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-sm'
                : isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 shadow-sm'
                }`}
              title={editable ? 'Editing is enabled. Click to toggle Read-Only Mode.' : 'Read-Only Mode active. Click to enable editing.'}
            >
              {editable ? (
                <>
                  <PenLine className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Edit Mode</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Read-Only</span>
                </>
              )}
            </button>

            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition ${isDark
                ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Custom File Upload Button */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-emerald-600/20 transition">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload GEDCOM / JSON</span>
              <input
                type="file"
                accept=".ged,.gedcom,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-4">
        {/* Dataset Header Card */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
          }`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-slate-400">
              Active Dataset: <strong className={`font-semibold ml-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentDatasetName}</strong>
            </div>

            {currentDatasetName !== 'Hawthorne Dynasty (4 Generations)' && (
              <button
                onClick={loadSample}
                className="text-xs text-sky-500 hover:text-sky-400 underline underline-offset-2 flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Hawthorne Sample
              </button>
            )}

            <button
              onClick={loadQueenVictoria}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                currentDatasetName.includes('Queen Victoria')
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-semibold'
                  : isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-purple-400'
                  : 'border-slate-200 hover:bg-purple-50 text-purple-700'
              }`}
              title="Load 487 European royals spanning 7 generations"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Queen Victoria (487 Royals)
            </button>

            {editable && (
              <button
                onClick={startBlankTree}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
              >
                + New Blank Tree
              </button>
            )}
          </div>

          {/* Export Buttons & Metrics Pill Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <button
                onClick={() => downloadGedcomFile(treeData, `${currentDatasetName.replace(/\s+/g, '_')}.ged`)}
                disabled={peopleCount === 0}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition disabled:opacity-40 ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                title="Download as standard GEDCOM 5.5.1"
              >
                <FileText className="w-3 h-3 text-emerald-500" /> Export GED
              </button>
              <button
                onClick={() => downloadJsonFile(treeData, `${currentDatasetName.replace(/\s+/g, '_')}.json`)}
                disabled={peopleCount === 0}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition disabled:opacity-40 ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                title="Download as structured JSON"
              >
                <FileJson className="w-3 h-3 text-sky-500" /> Export JSON
              </button>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Users className="w-3.5 h-3.5 text-sky-500" /> <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{peopleCount}</span> Individuals
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Layers className="w-3.5 h-3.5 text-amber-500" /> <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{familyCount}</span> Families
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{livingCount}</span> Living
              </span>
            </div>
          </div>
        </div>

        {/* Tab 1: Interactive Canvas */}
        {activeTab === 'canvas' && (
          <div className="flex-1 min-h-[720px] flex flex-col">
            <FamilyTree
              data={treeData}
              datasetKey={currentDatasetName}
              theme={theme}
              editable={editable}
              onUpdateData={(nextData: TreeData) => setTreeData(nextData)}
              privacyConfig={{
                enabled: false,
                redactLiving: true,
                livingCutoffYear: 1920
              }}
              className="flex-1 h-[760px]"
            />
          </div>
        )}

        {/* Tab 2: Documentation & API Guide */}
        {activeTab === 'docs' && (
          <div className={`p-6 rounded-2xl border space-y-8 text-sm ${isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
            }`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Getting Started with @fahim/react-family-tree
                </h2>
              </div>
              <p className="leading-relaxed">
                A modern, zero-backend React genealogy visualizer and interactive tree editor. Designed to ingest standard GEDCOM 5.5.x (including legacy 5.5 & 5.5.1) as well as modern <a href="https://gedcom.io/specifications/FamilySearchGEDCOMv7.html" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline font-medium">FamilySearch GEDCOM 7.0</a> (<a href="https://github.com/FamilySearch/GEDCOM" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline font-medium">GitHub Repository</a>) and normalized JSON, automatically calculate non-overlapping hierarchical tree coordinates, route clean cubic bezier relationship curves, and support full in-browser tree editing, photo tagging, and exporting.
              </p>
            </div>

            {/* Quickstart Code */}
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                1. Quickstart Installation & React Component
              </h3>
              <pre className={`p-4 rounded-xl font-mono text-xs overflow-x-auto border ${isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-700 text-emerald-300'
                }`}>
                {`// 1. Install package
npm install @fahim/react-family-tree

// 2. Import into your React application
import React, { useState } from 'react';
import { FamilyTree, parseGedcom, exportGedcom, exportJson } from '@fahim/react-family-tree';
import '@fahim/react-family-tree/style.css';

export function MyGenealogyApp() {
  const [data, setData] = useState(() => parseGedcom(rawGedcomString));

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <FamilyTree
        data={data}
        theme="dark" // 'dark' | 'light'
        editable={true}
        onUpdateData={(newData) => setData(newData)}
        privacyConfig={{
          enabled: true,
          redactLiving: true,
          livingCutoffYear: 1925
        }}
      />
    </div>
  );
}`}
              </pre>
            </div>

            {/* Component Props Table */}
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                2. Component Props Reference
              </h3>
              <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${isDark ? 'bg-slate-800/60 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>
                      <th className="p-3">Prop</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Default</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    <tr>
                      <td className="p-3 font-mono text-emerald-500 font-semibold">data</td>
                      <td className="p-3 font-mono">TreeData</td>
                      <td className="p-3 italic">required</td>
                      <td className="p-3">The parsed tree graph containing <code>people</code>, <code>families</code>, and optional <code>media</code> records.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-emerald-500 font-semibold">datasetKey</td>
                      <td className="p-3 font-mono">string</td>
                      <td className="p-3">undefined</td>
                      <td className="p-3">Unique identifier for the active dataset. Changing this prop automatically clears previous session history and resets the undo stack.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-emerald-500 font-semibold">theme</td>
                      <td className="p-3 font-mono">'dark' | 'light'</td>
                      <td className="p-3">'dark'</td>
                      <td className="p-3">Canvas and modal color palette with complete dark and light mode parity.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-emerald-500 font-semibold">editable</td>
                      <td className="p-3 font-mono">boolean</td>
                      <td className="p-3">true</td>
                      <td className="p-3">Toggle between interactive editing and read-only static viewing. When <code>false</code>, all mutation controls (+ Person, drawer actions, undo/redo) are disabled.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-emerald-500 font-semibold">onUpdateData</td>
                      <td className="p-3 font-mono">(newData: TreeData) =&gt; void</td>
                      <td className="p-3">undefined</td>
                      <td className="p-3">Callback fired whenever a person, marriage union, or photo is added, edited, or removed.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-emerald-500 font-semibold">privacyConfig</td>
                      <td className="p-3 font-mono">Partial&lt;PrivacyConfig&gt;</td>
                      <td className="p-3">&#123; enabled: true &#125;</td>
                      <td className="p-3">Configures living-relative redaction, exact birth date masking, and cutoff year.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-emerald-500 font-semibold">onSelectPerson</td>
                      <td className="p-3 font-mono">(id: string | null) =&gt; void</td>
                      <td className="p-3">undefined</td>
                      <td className="p-3">Callback triggered when an individual node is clicked or deselected.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-emerald-500 font-semibold">initialSelectedPersonId</td>
                      <td className="p-3 font-mono">string | null</td>
                      <td className="p-3">null</td>
                      <td className="p-3">Person ID to automatically select and focus on initial canvas load.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kinship & Relationship Analysis Documentation */}
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                3. Kinship Analysis & Relationship Calculator API
              </h3>
              <p className="mb-3 leading-relaxed text-xs">
                Compute gender-aware genealogical relationships between any two individuals in plain English, query generational ancestor/descendant distance, or find the shortest connection path:
              </p>
              <pre className={`p-4 rounded-xl font-mono text-xs overflow-x-auto border ${isDark ? 'bg-slate-950 border-slate-800 text-purple-400' : 'bg-slate-900 border-slate-700 text-purple-300'
                }`}>
                {`import {
  calculateRelationship,
  getAncestors,
  getDescendants,
  findShortestKinshipPath
} from '@fahim/react-family-tree';

// 1. Calculate kinship between two people
const result = calculateRelationship(data, 'I7', 'I10');
console.log(result.relationshipName); // "1st Cousin"
console.log(result.isDirectBlood);    // true (genetic vs marriage connection)
console.log(result.degreeOfKinship);  // 4 degrees of civil kinship
console.log(result.description);      // "Oliver Hawthorne and Maya Chen are 1st cousins..."

// 2. Query direct ancestors or descendants with generational depth
const ancestors = getAncestors(data, 'I12'); // Map: personId -> generation distance
const descendants = getDescendants(data, 'I1'); // Map: personId -> generation distance

// 3. Shortest connection path (list of person and union IDs)
const path = findShortestKinshipPath(data, 'I9', 'I10');`}
              </pre>
            </div>

            {/* History & Revert API */}
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                4. Session History, Undo-Redo & Timeline Revert
              </h3>
              <p className="mb-3 leading-relaxed text-xs">
                Manage undo/redo stacks and time-travel rollback programmatically or with the built-in React hook:
              </p>
              <pre className={`p-4 rounded-xl font-mono text-xs overflow-x-auto border ${isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-900 border-slate-700 text-amber-300'
                }`}>
                {`import { useTreeHistory, TreeHistoryManager } from '@fahim/react-family-tree';

// Pure TypeScript usage (works in Node, Web Workers, or React):
const manager = new TreeHistoryManager(initialTreeData, 'Baseline');

// Record changes
manager.recordChange('Added child Daniel', nextTreeData, 'add_child', 'Daniel');

// Single-step undo and redo
manager.undo(); // Returns previous TreeData snapshot
manager.redo(); // Returns next TreeData snapshot

// Non-destructive append-only revert (retains all prior edits without truncation)
manager.revertToIndex(0); // Appends a restore entry of Step 0 without losing intermediate changes
manager.undo();           // Reverses the revert itself!`}
              </pre>
            </div>

            {/* Normalized JSON Schema */}
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                5. Normalized JSON Schema Specification
              </h3>
              <p className="mb-3 leading-relaxed text-xs">
                In addition to standard <code>.ged</code> GEDCOM files, <code>@fahim/react-family-tree</code> natively consumes and exports a clean, normalized JSON schema (<code>TreeData</code>). You can upload or generate JSON files following this structure:
              </p>
              <pre className={`p-4 rounded-xl font-mono text-xs overflow-x-auto border ${isDark ? 'bg-slate-950 border-slate-800 text-sky-400' : 'bg-slate-900 border-slate-700 text-sky-300'
                }`}>
                {`{
  "people": {
    "I0001": {
      "id": "I0001",
      "fullName": "Arthur Hawthorne",
      "first": "Arthur",
      "surname": "Hawthorne",
      "gender": "M", // 'M' | 'F' | 'O' | 'U'
      "birth": {
        "date": "12 APR 1928",
        "year": 1928,
        "place": "London, England"
      },
      "death": {
        "date": "18 NOV 2005",
        "year": 2005,
        "place": "Oxford, England"
      },
      "isLiving": false,
      "occupation": "Architect",
      "bio": "Fellow of the Royal Institute of British Architects.",
      "famc": null,           // Child of Family ID (null if root ancestor)
      "fams": ["F0001"],      // Spouse in Family IDs (supports multiple spouses)
      "mediaIds": ["M001"],   // Associated photograph IDs
      "avatarMediaId": "M001",// ID of primary avatar photograph
      "attributes": {
        "Religion": "Anglican",
        "Burial": "St. Giles Cemetery, Oxford"
      }
    }
  },
  "families": {
    "F0001": {
      "id": "F0001",
      "husband": "I0001",
      "wife": "I0002",
      "children": ["I0003", "I0005"],
      "marriage": {
        "date": "14 JUN 1954",
        "year": 1954,
        "place": "Edinburgh, Scotland"
      }
    }
  },
  "media": {
    "M001": {
      "id": "M001",
      "url": "https://example.com/portrait.jpg",
      "title": "Arthur Hawthorne Portrait",
      "type": "portrait",
      "taggedPeople": [
        { "personId": "I0001", "isPrimaryAvatar": true }
      ]
    }
  }
}`}
              </pre>
            </div>

            {/* Publishing & CI/CD */}
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                6. Library Packaging & Publishing Architecture
              </h3>
              <p className="mb-3 leading-relaxed text-xs">
                <code>@fahim/react-family-tree</code> is packaged as an isomorphic zero-dependency NPM distribution that bundles both ESM (<code>dist/index.js</code>) and CommonJS (<code>dist/index.cjs</code>), along with TypeScript type definitions (<code>dist/index.d.ts</code>) and compiled CSS (<code>dist/style.css</code>).
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
                <li><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Build Output:</strong> Run <code>npm run build:lib</code> to generate the library bundle, or <code>npm run build</code> to compile both the library and demo website.</li>
                <li><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>GitHub Pages Demo:</strong> Automated deployment via <code>.github/workflows/deploy-demo.yml</code> deploys the interactive canvas demo to GitHub Pages on every push to <code>main</code>.</li>
                <li><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>NPM Publishing:</strong> Automated via <code>.github/workflows/publish.yml</code> whenever a new semantic version tag (e.g. <code>v1.0.0</code>) is pushed.</li>
              </ul>
            </div>

            {/* Responsive Guidelines */}
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                7. Responsive Screen Resolutions & Mobile vs. Desktop Guidelines
              </h3>
              <p className="mb-3 leading-relaxed text-xs">
                The visualizer is architected for fluid responsiveness across devices:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
                <li><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Mobile Handsets (&lt;640px):</strong> Touch gestures handle 1-finger panning and 2-finger pinch-to-zoom; PersonDrawer expands to 100% full-width (<code>w-full</code>); toolbar collapses into touch icons; MiniMap unmounts automatically to maximize canvas area.</li>
                <li><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Tablets (640px - 1024px):</strong> Supports simultaneous touch and pointer inputs; drawer transitions to a 384px slide-over (<code>sm:w-96</code>); MiniMap is displayed.</li>
                <li><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Desktop &amp; Ultrawide (&gt;1024px, 4K):</strong> Mouse wheel zoom centered on cursor, drag panning with grab/grabbing cursor, global keyboard shortcuts (<code>Ctrl+Z</code>, <code>Ctrl+Y</code>), and resolution-aware zoom scale clamping (0.25x to 1.0x).</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
