import { supabase } from "@/integrations/supabase/client";
import type { Look } from "@/lib/offfeed-data";

const SAVED_KEY = "offfeed-saved-looks-v1";
const LIKED_KEY = "offfeed-liked-looks-v1";
const LIKED_PRODUCTS_KEY = "offfeed-liked-products-v1";
export type WishlistItemType = "look" | "product";

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(window.localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; }
}
function writeIds(key: string, ids: string[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
    window.dispatchEvent(new Event("offfeed-wishlist-updated"));
  }
}
function localKey(type: WishlistItemType) { return type === "look" ? LIKED_KEY : LIKED_PRODUCTS_KEY; }

export function readSavedLookIds() { return readIds(SAVED_KEY); }
export function readLikedLookIds() { return readIds(LIKED_KEY); }
export function readLikedProductIds() { return readIds(LIKED_PRODUCTS_KEY); }
export function toggleSavedLook(look: Look) { const ids = readIds(SAVED_KEY); writeIds(SAVED_KEY, ids.includes(look.id) ? ids.filter(id => id !== look.id) : [...ids, look.id]); }

export async function setWishlistItem(type: WishlistItemType, itemId: string, liked: boolean) {
  const key = localKey(type);
  const ids = readIds(key);
  writeIds(key, liked ? [...ids, itemId] : ids.filter((id) => id !== itemId));
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const client = supabase as any;
    if (liked) {
      const { error } = await client.from("customer_wishlist_items").upsert(
        { user_id: user.id, item_type: type, item_id: itemId },
        { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    } else {
      const { error } = await client.from("customer_wishlist_items").delete()
        .eq("user_id", user.id).eq("item_type", type).eq("item_id", itemId);
      if (error) throw error;
    }
  } catch (error) {
    console.error("Could not sync OFFFEED wishlist:", error);
  }
}

export async function syncWishlistWithAccount() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { signedIn: false, lookIds: readLikedLookIds(), productIds: readLikedProductIds() };
  const client = supabase as any;
  const { data, error } = await client.from("customer_wishlist_items")
    .select("item_type,item_id").eq("user_id", user.id);
  if (error) throw error;
  const remoteLooks = (data ?? []).filter((item: {item_type:string;item_id:string}) => item.item_type === "look").map((item: {item_id:string}) => item.item_id);
  const remoteProducts = (data ?? []).filter((item: {item_type:string;item_id:string}) => item.item_type === "product").map((item: {item_id:string}) => item.item_id);
  const localLooks = readLikedLookIds();
  const localProducts = readLikedProductIds();
  const allLooks = [...new Set([...remoteLooks, ...localLooks])];
  const allProducts = [...new Set([...remoteProducts, ...localProducts])];
  for (const itemId of allLooks) {
    const { error: writeError } = await client.from("customer_wishlist_items").upsert(
      { user_id: user.id, item_type: "look", item_id: itemId },
      { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
    );
    if (writeError) throw writeError;
  }
  for (const itemId of allProducts) {
    const { error: writeError } = await client.from("customer_wishlist_items").upsert(
      { user_id: user.id, item_type: "product", item_id: itemId },
      { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
    );
    if (writeError) throw writeError;
  }
  writeIds(LIKED_KEY, allLooks);
  writeIds(LIKED_PRODUCTS_KEY, allProducts);
  return { signedIn: true, lookIds: allLooks, productIds: allProducts };
}

export function toggleLikedLook(look: Look) {
  const ids = readIds(LIKED_KEY);
  void setWishlistItem("look", look.id, !ids.includes(look.id));
}
