"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { ApiSource, CategoryItem, CategoryTreeNode } from "../lib/types";
import { sourceStorage } from "../services/source-storage";
import { VodApiService } from "../services/vod-api";
import { DEFAULT_SOURCE, STORAGE_KEYS } from "../lib/constants";

interface SourcesData {
  sources: ApiSource[];
  activeSourceId: string;
}

async function fetchServerSources(): Promise<SourcesData | null> {
  try {
    const res = await fetch("/api/sources");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function syncToServer(sources: ApiSource[], activeSourceId: string) {
  try {
    await fetch("/api/sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources, activeSourceId }),
    });
  } catch {
    // silently fail - localStorage is the fallback
  }
}

interface SourceContextValue {
  sources: ApiSource[];
  activeSource: ApiSource;
  apiService: VodApiService;
  categories: CategoryTreeNode[];
  addSource: (source: Omit<ApiSource, "id" | "addedAt">) => void;
  removeSource: (id: string) => void;
  reorderSource: (fromIndex: number, toIndex: number) => void;
  toggleSource: (id: string) => void;
  setActiveSource: (id: string) => void;
  isCategoriesLoading: boolean;
}

const SourceContext = createContext<SourceContextValue | null>(null);

export function SourceProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<ApiSource[]>([]);
  const [activeSource, setActiveSourceState] = useState<ApiSource>(
    sourceStorage.getActiveSource()
  );
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      // try server first
      const serverData = await fetchServerSources();
      if (serverData && serverData.sources.length > 0) {
        // merge: server wins, update localStorage
        sourceStorage.saveSources(serverData.sources);
        if (serverData.activeSourceId) {
          sourceStorage.setActiveSourceId(serverData.activeSourceId);
        }
      }

      const storedSources = sourceStorage.getSources();
      if (mountedRef.current) setSources(storedSources);
      const activeId = sourceStorage.getActiveSourceId();
      const active = storedSources.find((s) => s.id === activeId);
      if (active && mountedRef.current) setActiveSourceState(active);
    })();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const apiService = useMemo(
    () => new VodApiService(activeSource.url),
    [activeSource.url]
  );

  const buildCategoryTree = (flat: CategoryItem[]): CategoryTreeNode[] => {
    const topCategories = flat.filter((c) => c.type_pid === 0);
    return topCategories.map((parent) => ({
      ...parent,
      children: flat.filter((c) => c.type_pid === parent.type_id),
    }));
  };

  const refreshCategories = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsCategoriesLoading(true);
    try {
      const flat = await apiService.fetchCategories();
      if (mountedRef.current) {
        setCategories(buildCategoryTree(flat));
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      if (mountedRef.current) {
        setIsCategoriesLoading(false);
      }
    }
  }, [apiService]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  const addSource = useCallback(
    (source: Omit<ApiSource, "id" | "addedAt">) => {
      sourceStorage.addSource(source);
      const updated = sourceStorage.getSources();
      setSources(updated);
      syncToServer(updated, sourceStorage.getActiveSourceId());
    },
    []
  );

  const removeSource = useCallback((id: string) => {
    sourceStorage.removeSource(id);
    const updated = sourceStorage.getSources();
    setSources(updated);
    const currentActiveId = sourceStorage.getActiveSourceId();
    if (currentActiveId === id && updated.length > 0) {
      sourceStorage.setActiveSourceId(updated[0].id);
      setActiveSourceState(updated[0]);
    }
    syncToServer(updated, sourceStorage.getActiveSourceId());
  }, []);

  const reorderSource = useCallback((fromIndex: number, toIndex: number) => {
    sourceStorage.reorderSources(fromIndex, toIndex);
    const updated = sourceStorage.getSources();
    setSources(updated);
    syncToServer(updated, sourceStorage.getActiveSourceId());
  }, []);

  const toggleSource = useCallback((id: string) => {
    sourceStorage.toggleSource(id);
    const updated = sourceStorage.getSources();
    setSources(updated);
    const currentActiveId = sourceStorage.getActiveSourceId();
    if (currentActiveId === id) {
      const next = updated.find((s) => s.enabled);
      if (next) {
        sourceStorage.setActiveSourceId(next.id);
        setActiveSourceState(next);
      }
    }
    syncToServer(updated, sourceStorage.getActiveSourceId());
  }, []);

  const setActiveSource = useCallback((id: string) => {
    sourceStorage.setActiveSourceId(id);
    const allSources = sourceStorage.getSources();
    const source = allSources.find((s) => s.id === id);
    if (source) setActiveSourceState(source);
    syncToServer(allSources, id);
  }, []);

  return (
    <SourceContext.Provider
      value={{
        sources,
        activeSource,
        apiService: apiService,
        categories,
        addSource,
        removeSource,
        reorderSource,
        toggleSource,
        setActiveSource,
        isCategoriesLoading,
      }}
    >
      {children}
    </SourceContext.Provider>
  );
}

export function useSource() {
  const ctx = useContext(SourceContext);
  if (!ctx) throw new Error("useSource must be used within SourceProvider");
  return ctx;
}
