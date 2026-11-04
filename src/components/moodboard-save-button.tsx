import { useEffect, useState } from "react";
import { BookmarkPlus, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMoodboardItem, createMoodboard, readMoodboards, moodboardsEventName } from "@/lib/moodboards";
import { toast } from "sonner";

type SaveItem = { id: string; type: "product" | "look"; title: string; image: string; subtitle: string; href: string; price?: number };
export function MoodboardSaveButton({ item }: { item: SaveItem }) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState(readMoodboards);
  const [newName, setNewName] = useState("");
  useEffect(() => {
    const sync = () => setBoards(readMoodboards());
    window.addEventListener(moodboardsEventName(), sync);
    return () => window.removeEventListener(moodboardsEventName(), sync);
  }, []);
  const alreadySaved = (boardId: string) => boards.find((board) => board.id === boardId)?.items.some((saved) => saved.id === item.id && saved.type === item.type) ?? false;
  function save(boardId: string) {
    if (alreadySaved(boardId)) { toast.info("Already in this moodboard"); return; }
    addMoodboardItem(boardId, item);
    setBoards(readMoodboards());
    toast.success("Added to moodboard");
    setOpen(false);
  }
  function createAndSave() {
    const board = createMoodboard(newName);
    if (!board) { toast.error("Enter a name for your moodboard"); return; }
    addMoodboardItem(board.id, item);
    setBoards(readMoodboards());
    setNewName("");
    toast.success("Moodboard created and item saved");
    setOpen(false);
  }
  return <div className="relative">
    <Button type="button" variant="ghost" size="icon" aria-label="Add to moodboard" title="Add to moodboard" onClick={() => setOpen((value) => !value)}><BookmarkPlus /></Button>
    {open && <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-border bg-background p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Save to moodboard</p><button type="button" className="text-xs text-muted-foreground" onClick={() => setOpen(false)}>Close</button></div>
      <div className="max-h-40 space-y-1 overflow-y-auto">{boards.map((board) => <button key={board.id} type="button" onClick={() => save(board.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"><span className="truncate">{board.name}</span>{alreadySaved(board.id) ? <Check className="size-4 text-primary" /> : <Plus className="size-4" />}</button>)}</div>
      <div className="mt-3 border-t border-border pt-3"><label className="mb-1 block text-xs text-muted-foreground" htmlFor={`moodboard-name-${item.id}`}>Create a new board</label><input id={`moodboard-name-${item.id}`} value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createAndSave(); }} placeholder="e.g. Date night ideas" maxLength={48} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><Button type="button" size="sm" className="mt-2 w-full" onClick={createAndSave}>Create & save</Button></div>
    </div>}
  </div>;
}
