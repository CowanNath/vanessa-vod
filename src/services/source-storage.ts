import type { ApiSource } from "../lib/types";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
import { DEFAULT_SOURCE, STORAGE_KEYS } from "../lib/constants";

export const sourceStorage = {
  getSources(): ApiSource[] {
    if (typeof window === "undefined") return [DEFAULT_SOURCE];
    const raw = localStorage.getItem(STORAGE_KEYS.SOURCES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify([DEFAULT_SOURCE]));
      return [DEFAULT_SOURCE];
    }
    return JSON.parse(raw);
  },

  saveSources(sources: ApiSource[]): void {
    localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
  },

  addSource(source: Omit<ApiSource, "id" | "addedAt">): ApiSource {
    const sources = this.getSources();
    const newSource: ApiSource = {
      ...source,
      id: generateId(),
      addedAt: new Date().toISOString(),
    };
    sources.push(newSource);
    this.saveSources(sources);
    return newSource;
  },

  removeSource(id: string): void {
    const sources = this.getSources().filter((s) => s.id !== id);
    this.saveSources(sources);
  },

  toggleSource(id: string): void {
    const sources = this.getSources();
    const source = sources.find((s) => s.id === id);
    if (source) {
      source.enabled = !source.enabled;
      this.saveSources(sources);
    }
  },

  reorderSources(fromIndex: number, toIndex: number): void {
    const sources = this.getSources();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= sources.length || toIndex >= sources.length) return;
    const [moved] = sources.splice(fromIndex, 1);
    sources.splice(toIndex, 0, moved);
    this.saveSources(sources);
  },

  getActiveSourceId(): string {
    if (typeof window === "undefined") return DEFAULT_SOURCE.id;
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SOURCE_ID) || DEFAULT_SOURCE.id;
  },

  setActiveSourceId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SOURCE_ID, id);
  },

  getActiveSource(): ApiSource {
    const sources = this.getSources().filter((s) => s.enabled);
    const activeId = this.getActiveSourceId();
    return sources.find((s) => s.id === activeId) || sources[0] || DEFAULT_SOURCE;
  },
};
