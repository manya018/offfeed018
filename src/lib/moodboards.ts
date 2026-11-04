export type MoodboardItem = {
  id: string;
  type: "product" | "look";
  title: string;
  image: string;
  subtitle: string;
  href: string;
  price?: number;
  addedAt: string;
};
export type Moodboard = { id: string; name: string; createdAt: string; items: MoodboardItem[] };
const KEY = "offfeed-moodboards-v1";
const EVENT = "offfeed-moodboards-updated";
export function readMoodboards(): Moodboard[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter((board) => board && typeof board.id === "string" && typeof board.name === "string" && Array.isArray(board.items)) : [];
  } catch { return []; }
}
function writeMoodboards(boards: Moodboard[]) {
  localStorage.setItem(KEY, JSON.stringify(boards));
  window.dispatchEvent(new Event(EVENT));
}
export function moodboardsEventName() { return EVENT; }
export function createMoodboard(name: string) {
  const clean = name.trim();
  if (!clean) return null;
  const board: Moodboard = { id: `board-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: clean.slice(0, 48), createdAt: new Date().toISOString(), items: [] };
  writeMoodboards([board, ...readMoodboards()]);
  return board;
}
export function addMoodboardItem(boardId: string, item: Omit<MoodboardItem, "addedAt">) {
  const boards = readMoodboards();
  const next = boards.map((board) => board.id !== boardId || board.items.some((saved) => saved.id === item.id && saved.type === item.type)
    ? board : { ...board, items: [{ ...item, addedAt: new Date().toISOString() }, ...board.items] });
  writeMoodboards(next);
}
export function removeMoodboardItem(boardId: string, itemId: string, type: MoodboardItem["type"]) {
  writeMoodboards(readMoodboards().map((board) => board.id === boardId ? { ...board, items: board.items.filter((item) => !(item.id === itemId && item.type === type)) } : board));
}
export function deleteMoodboard(boardId: string) { writeMoodboards(readMoodboards().filter((board) => board.id !== boardId)); }
