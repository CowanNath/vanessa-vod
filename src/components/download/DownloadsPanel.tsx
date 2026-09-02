"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, Download, FileVideo, Loader2, XCircle } from "lucide-react";
import { Modal } from "../ui/Modal";

interface ActiveTask {
  id: string;
  name: string;
  progress: number;
  startedAt: number;
}

interface HistoryEntry {
  name: string;
  fileName: string;
  status: "done" | "failed" | "cancelled";
  finishedAt: string;
}

function formatTime(iso: string): string {
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

const STATUS_META = {
  done: { icon: CheckCircle2, text: "已完成", cls: "text-green-500" },
  failed: { icon: XCircle, text: "失败", cls: "text-red-500" },
  cancelled: { icon: Ban, text: "已取消", cls: "text-[var(--color-text-secondary)]" },
} as const;

export function DownloadsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [active, setActive] = useState<ActiveTask[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // 面板打开期间轮询服务端任务状态（离开页面后的下载也能看到进度）
  useEffect(() => {
    if (!isOpen) return;
    let stopped = false;
    const tick = () => {
      fetch("/api/download")
        .then((r) => r.json())
        .then((d) => {
          if (stopped) return;
          setActive(Array.isArray(d.active) ? d.active : []);
          setHistory(Array.isArray(d.history) ? d.history : []);
        })
        .catch(() => {});
    };
    tick();
    const timer = setInterval(tick, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [isOpen]);

  const cancelTask = async (id: string) => {
    try {
      await fetch(`/api/download?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {}
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="下载任务">
      <div className="space-y-4">
        {/* 进行中 */}
        <section>
          <h3 className="text-sm font-medium mb-2">
            进行中{active.length > 0 && ` (${active.length})`}
          </h3>
          {active.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)] py-2">
              暂无进行中的下载任务
            </p>
          ) : (
            <div className="space-y-3">
              {active.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]"
                >
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{task.name}</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${task.progress.toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
                      {task.progress.toFixed(0)}%
                    </span>
                    <button
                      onClick={() => cancelTask(task.id)}
                      title="取消该任务"
                      className="p-1.5 rounded hover:bg-red-500/10 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 历史 */}
        <section>
          <h3 className="text-sm font-medium mb-2">
            历史{history.length > 0 && ` (${history.length})`}
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)] py-2 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              还没有下载记录，文件保存在 downloads 目录
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {history.map((entry, i) => {
                const meta = STATUS_META[entry.status] ?? STATUS_META.failed;
                const Icon = entry.status === "done" ? FileVideo : meta.icon;
                return (
                  <div
                    key={`${entry.finishedAt}-${i}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-secondary)]"
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${entry.status === "done" ? "text-[var(--color-text-secondary)]" : meta.cls}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{entry.name}</div>
                      <div className="text-[11px] text-[var(--color-text-secondary)] truncate">
                        {entry.status === "done" ? entry.fileName : meta.text} · {formatTime(entry.finishedAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
