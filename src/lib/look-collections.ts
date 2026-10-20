import type { Look } from "@/lib/offfeed-data";

const SAVED_KEY = "offfeed-saved-looks-v1";
const LIKED_KEY = "offfeed-liked-looks-v1";
function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(window.localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; }
}
function writeIds(key: string, ids: string[]) { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify([...new Set(ids)])); }
export function readSavedLookIds() { return readIds(SAVED_KEY); }
export function readLikedLookIds() { return readIds(LIKED_KEY); }
export function toggleSavedLook(look: Look) { const ids = readIds(SAVED_KEY); writeIds(SAVED_KEY, ids.includes(look.id) ? ids.filter(id => id !== look.id) : [...ids, look.id]); }
export function toggleLikedLook(look: Look) { const ids = readIds(LIKED_KEY); writeIds(LIKED_KEY, ids.includes(look.id) ? ids.filter(id => id !== look.id) : [...ids, look.id]); }
