import { STORAGE_KEYS } from "../lib/constants";

export interface FavoriteItem {
  vodId: number;
  vodName: string;
  vodPic: string;
  typeName: string;
  sourceId: string;
  sourceUrl: string;
  addedAt: string;
}

export const favoriteStorage = {
  getAll(): FavoriteItem[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  },

  save(items: FavoriteItem[]): void {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(items));
  },

  add(item: Omit<FavoriteItem, "addedAt">): void {
    const items = this.getAll();
    if (items.some((f) => f.vodId === item.vodId && f.sourceId === item.sourceId)) return;
    items.unshift({ ...item, addedAt: new Date().toISOString() });
    this.save(items);
    fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }).catch(() => {});
  },

  remove(vodId: number, sourceId: string): void {
    const items = this.getAll().filter(
      (f) => !(f.vodId === vodId && f.sourceId === sourceId)
    );
    this.save(items);
    fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vodId, sourceId }),
    }).catch(() => {});
  },

  isFavorite(vodId: number, sourceId: string): boolean {
    return this.getAll().some(
      (f) => f.vodId === vodId && f.sourceId === sourceId
    );
  },

  toggle(item: Omit<FavoriteItem, "addedAt">): boolean {
    if (this.isFavorite(item.vodId, item.sourceId)) {
      this.remove(item.vodId, item.sourceId);
      return false;
    }
    this.add(item);
    return true;
  },

  async loadFromServer(): Promise<void> {
    try {
      const res = await fetch("/api/favorites");
      if (!res.ok) return;
      const serverItems: FavoriteItem[] = await res.json();
      if (serverItems.length > 0) {
        this.save(serverItems);
      }
    } catch {}
  },
};
