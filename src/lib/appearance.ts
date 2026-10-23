export type Appearance = 'light' | 'dark';
export const APPEARANCE_STORAGE_KEY = 'fundscope-appearance-v1';

export function readAppearance(storage?: Pick<Storage, 'getItem'>): Appearance {
  try { return (storage ?? globalThis.localStorage).getItem(APPEARANCE_STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}

export function saveAppearance(appearance: Appearance, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? globalThis.localStorage).setItem(APPEARANCE_STORAGE_KEY, appearance); return true; }
  catch { return false; }
}
