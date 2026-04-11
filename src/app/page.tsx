"use client";

import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { Sidebar, MobileSidebar } from "../components/layout/Sidebar";
import { SourceSelector } from "../components/home/SourceSelector";
import { VideoGrid } from "../components/home/VideoGrid";
import { Pagination } from "../components/home/Pagination";
import { VideoGridSkeleton } from "../components/ui/Skeleton";
import { useVodApi } from "../hooks/useVodApi";
import { useSource } from "../providers/SourceProvider";

export default function HomePage() {
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { activeSource } = useSource();
  const { videos, totalPages, currentPage, isLoading, error, setPage } =
    useVodApi({ typeId: selectedTypeId });

  // 源切换时重置分类选择
  useEffect(() => {
    setSelectedTypeId(undefined);
  }, [activeSource.id]);

  const handleSelectType = (id: number | undefined) => {
    setSelectedTypeId(id);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header onToggleSidebar={() => setIsMobileSidebarOpen((v) => !v)} />
      <SourceSelector />
      <div className="flex flex-1">
        <Sidebar
          selectedTypeId={selectedTypeId}
          onSelectType={handleSelectType}
        />
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          selectedTypeId={selectedTypeId}
          onSelectType={handleSelectType}
        />
        <main className="flex-1 p-2 sm:p-4 overflow-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
              <p className="mb-2">{error}</p>
              <button
                onClick={() => setPage(currentPage)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
              >
                重试
              </button>
            </div>
          ) : isLoading ? (
            <VideoGridSkeleton />
          ) : (
            <>
              <VideoGrid videos={videos} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
