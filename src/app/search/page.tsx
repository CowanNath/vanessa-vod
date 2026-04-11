"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { Header } from "../../components/layout/Header";
import { VideoGrid } from "../../components/home/VideoGrid";
import { SearchVideoGrid } from "../../components/search/SearchVideoGrid";
import { Pagination } from "../../components/home/Pagination";
import { VideoGridSkeleton } from "../../components/ui/Skeleton";
import { SearchGridSkeleton } from "../../components/search/SearchVideoGrid";
import { useSource } from "../../providers/SourceProvider";
import { VodApiService } from "../../services/vod-api";
import type { VodItem } from "../../lib/types";
import { cn } from "../../lib/utils";

interface SourceSearchResult {
  sourceId: string;
  sourceName: string;
  videos: VodItem[];
  totalPages: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("q") || "";
  const { sources } = useSource();
  const enabledSources = useMemo(
    () => sources.filter((s) => s.enabled),
    [sources]
  );
  const [activeTab, setActiveTab] = useState<string>("");
  const [results, setResults] = useState<Map<string, SourceSearchResult>>(
    new Map()
  );

  // 切换关键词时重置
  useEffect(() => {
    if (!keyword) {
      setResults(new Map());
      setActiveTab("");
      return;
    }
    const initial: Map<string, SourceSearchResult> = new Map();
    enabledSources.forEach((s) => {
      initial.set(s.id, {
        sourceId: s.id,
        sourceName: s.name,
        videos: [],
        totalPages: 0,
        total: 0,
        isLoading: true,
        error: null,
        currentPage: 1,
      });
    });
    setResults(initial);
    if (enabledSources.length > 0) {
      setActiveTab(enabledSources[0].id);
    }
  }, [keyword, enabledSources]);

  // 对所有源同时发起搜索
  useEffect(() => {
    if (!keyword) return;

    enabledSources.forEach((source) => {
      const api = new VodApiService(source.url);
      api
        .fetchVideoList({ page: 1, keyword })
        .then((response) => {
          setResults((prev) => {
            const next = new Map(prev);
            next.set(source.id, {
              sourceId: source.id,
              sourceName: source.name,
              videos: response.list || [],
              totalPages: response.pagecount || 0,
              total: response.total || 0,
              isLoading: false,
              error: null,
              currentPage: 1,
            });
            return next;
          });
        })
        .catch((err) => {
          setResults((prev) => {
            const next = new Map(prev);
            next.set(source.id, {
              sourceId: source.id,
              sourceName: source.name,
              videos: [],
              totalPages: 0,
              total: 0,
              isLoading: false,
              error: err instanceof Error ? err.message : "搜索失败",
              currentPage: 1,
            });
            return next;
          });
        });
    });
  }, [keyword, enabledSources]);

  // 翻页
  const handlePageChange = useCallback(
    (page: number) => {
      if (!keyword) return;
      const source = enabledSources.find((s) => s.id === activeTab);
      if (!source) return;

      setResults((prev) => {
        const next = new Map(prev);
        const current = next.get(activeTab);
        if (current) {
          next.set(activeTab, { ...current, isLoading: true, error: null });
        }
        return next;
      });

      const api = new VodApiService(source.url);
      api
        .fetchVideoList({ page, keyword })
        .then((response) => {
          setResults((prev) => {
            const next = new Map(prev);
            next.set(activeTab, {
              sourceId: source.id,
              sourceName: source.name,
              videos: response.list || [],
              totalPages: response.pagecount || 0,
              total: response.total || 0,
              isLoading: false,
              error: null,
              currentPage: page,
            });
            return next;
          });
        })
        .catch((err) => {
          setResults((prev) => {
            const next = new Map(prev);
            next.set(activeTab, {
              sourceId: source.id,
              sourceName: source.name,
              videos: [],
              totalPages: 0,
              total: 0,
              isLoading: false,
              error: err instanceof Error ? err.message : "搜索失败",
              currentPage: page,
            });
            return next;
          });
        });
    },
    [keyword, enabledSources, activeTab]
  );

  const currentResult = results.get(activeTab);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="p-2 sm:p-4 max-w-7xl mx-auto w-full">
        <h1 className="text-lg font-semibold mb-4">
          {keyword ? (
            <>
              搜索: <span className="text-primary">{keyword}</span>
            </>
          ) : (
            "请输入搜索关键词"
          )}
        </h1>

        {keyword && enabledSources.length > 0 && (
          <>
            {/* Source tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {enabledSources.map((source) => {
                const r = results.get(source.id);
                const count = r?.total ?? 0;
                return (
                  <button
                    key={source.id}
                    onClick={() => setActiveTab(source.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                      activeTab === source.id
                        ? "bg-primary text-white"
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {source.name}
                    {r && !r.isLoading && count > 0 && (
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full",
                          activeTab === source.id
                            ? "bg-white/20"
                            : "bg-[var(--color-border)]"
                        )}
                      >
                        {count}
                      </span>
                    )}
                    {r?.isLoading && (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Results */}
            {currentResult?.error ? (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
                <p className="mb-2">{currentResult.error}</p>
              </div>
            ) : currentResult?.isLoading ? (
              <SearchGridSkeleton />
            ) : (
              <>
                <SearchVideoGrid 
                  videos={currentResult?.videos || []} 
                  sourceId={activeTab}
                />
                <Pagination
                  currentPage={currentResult?.currentPage || 1}
                  totalPages={currentResult?.totalPages || 0}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </>
        )}

        {keyword && enabledSources.length === 0 && (
          <div className="text-center py-20 text-[var(--color-text-secondary)]">
            请先添加视频源
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="p-2 sm:p-4 max-w-7xl mx-auto w-full">
            <VideoGridSkeleton />
          </main>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
