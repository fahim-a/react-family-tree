import { TreeData } from '../types';

/**
 * Serializes TreeData into a formatted JSON string.
 */
export function exportJson(data: TreeData, indent = 2): string {
  return JSON.stringify(data, null, indent);
}

/**
 * Triggers a browser download of the tree as a .json file.
 */
export function downloadJsonFile(data: TreeData, filename = 'family_tree.json') {
  if (typeof document === 'undefined') return;
  const jsonContent = exportJson(data);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
