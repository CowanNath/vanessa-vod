"use client";

import { useState, useRef, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import type { PlaySourceGroup } from "../../lib/types";

interface DownloadButtonProps {
  videoName: string;
  sources: PlaySourceGroup[];
}

export function DownloadButton({ videoName, sources }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const downloadIdRef = useRef("");

  const downloadEpisode = async (url: string, name: string, signal: AbortSignal): Promise<boolean> => {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, fileName: name, downloadId: downloadIdRef.current }),
      signal,
    });

    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "progress") {
            setProgress(`${data.name}: ${data.percent.toFixed(1)}%`);
          } else if (data.type === "log") {
          } else if (data.type === "done") {
            if (!data.success) {
              throw new Error(data.message);
            }
            return true;
          }
        } catch {}
      }
    }
    return true;
  };

  const handleDownload = async () => {
    if (sources.length === 0) return;

    setIsDownloading(true);
    setProgress("准备中...");
    const abort = new AbortController();
    abortRef.current = abort;
    downloadIdRef.current = `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    try {
      const source = sources[0];
      const total = source.episodes.length;

      if (total === 1) {
        const ep = source.episodes[0];
        await downloadEpisode(ep.url, `${videoName} - ${ep.name}`, abort.signal);
        setProgress("下载完成");
      } else {
        let success = 0;
        for (let i = 0; i < source.episodes.length; i++) {
          const ep = source.episodes[i];
          setProgress(`[${i + 1}/${total}] ${ep.name}: 准备中...`);
          try {
            await downloadEpisode(ep.url, `${videoName} - ${ep.name}`, abort.signal);
            success++;
          } catch (err) {
          }
        }
        setProgress(`下载完成 ${success}/${total} 集`);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setProgress("下载失败");
      }
    } finally {
      setIsDownloading(false);
      abortRef.current = null;
    }
  };

  const handleCancel = useCallback(async () => {
    try {
      await fetch(`/api/download?id=${encodeURIComponent(downloadIdRef.current)}`, { method: "DELETE" });
    } catch {}
    abortRef.current?.abort();
    setIsDownloading(false);
    setProgress("已取消");
  }, []);

  return (
    <div className="flex flex-col items-start gap-1.5 shrink-0">
      <div className="flex items-center gap-2">
        {!isDownloading ? (
          <button
            onClick={handleDownload}
            disabled={sources.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            下载
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            取消
          </button>
        )}
      </div>
      {progress && (
        <span className="text-[11px] text-[var(--color-text-secondary)] max-w-xs break-all">
          {progress}
        </span>
      )}
    </div>
  );
}
