"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { History, Trash2 } from "lucide-react";
import { Header } from "../../components/layout/Header";
import { ImageWithFallback } from "../../components/ui/ImageWithFallback";
import { imageProxy } from "../../lib/utils";

interface HistoryItem {
  vodId: number;
  vodName: string;
  vodPic: string;
  typeName: string;
  sourceId: string;
  sourceUrl: string;
  episodeName: string;
  watchedAt: string;
}

function formatWatchedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleRemove = async (vodId: number, sourceId: string) => {
    setItems((prev) => prev.filter((h) => !(h.vodId === vodId && h.sourceId === sourceId)));
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vodId, sourceId }),
      });
    } catch {}
  };

  const handleClearAll = async () => {
    setItems([]);
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {}
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="p-2 sm:p-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">观看历史</h1>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空历史
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
            <History className="w-12 h-12 mb-3 opacity-30" />
            <p>暂无观看记录</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <div key={`${item.vodId}-${item.sourceId}`} className="group relative">
                <Link href={`/video/${item.vodId}?source=${item.sourceId}`} className="block">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
                    {item.vodPic ? (
                      <ImageWithFallback
                        src={imageProxy(item.vodPic)}
                        alt={item.vodName}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-text-secondary)]">
                        暂无封面
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(item.vodId, item.sourceId)}
                  title="删除该记录"
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-[var(--color-text-secondary)] hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="mt-2 px-0.5">
                  <Link href={`/video/${item.vodId}?source=${item.sourceId}`}>
                    <h3 className="text-sm font-medium truncate hover:text-primary transition-colors">
                      {item.vodName}
                    </h3>
                  </Link>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                    {item.episodeName} · {formatWatchedAt(item.watchedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
