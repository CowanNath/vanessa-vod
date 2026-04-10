"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useSource } from "../../providers/SourceProvider";
import { cn } from "../../lib/utils";

interface SidebarProps {
  selectedTypeId?: number;
  onSelectType: (typeId: number | undefined) => void;
}

export function Sidebar({ selectedTypeId, onSelectType }: SidebarProps) {
  const { categories, isCategoriesLoading } = useSource();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isCategoriesLoading) {
    return (
      <aside className="w-48 shrink-0 border-r border-[var(--color-border)] p-3 hidden md:block overflow-y-auto h-[calc(100vh-3.5rem)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-8 rounded bg-[var(--color-bg-secondary)] mb-2 animate-pulse"
          />
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-48 shrink-0 border-r border-[var(--color-border)] hidden md:block overflow-y-auto h-[calc(100vh-3.5rem)]">
      <div className="p-3">
        <button
          onClick={() => onSelectType(undefined)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1",
            selectedTypeId === undefined
              ? "bg-primary text-white font-medium"
              : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
          )}
        >
          全部
        </button>
        {categories.map((cat) => (
          <div key={cat.type_id}>
            <button
              onClick={() => {
                if (cat.children.length > 0) {
                  toggleExpand(cat.type_id);
                } else {
                  onSelectType(cat.type_id);
                }
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1",
                selectedTypeId === cat.type_id
                  ? "bg-primary text-white font-medium"
                  : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              )}
            >
              {cat.children.length > 0 ? (
                expandedIds.has(cat.type_id) ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                )
              ) : null}
              <span className="truncate">{cat.type_name}</span>
            </button>
            {cat.children.length > 0 && expandedIds.has(cat.type_id) && (
              <div className="ml-4">
                {cat.children.map((child) => (
                  <button
                    key={child.type_id}
                    onClick={() => onSelectType(child.type_id)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                      selectedTypeId === child.type_id
                        ? "bg-primary/10 text-primary font-medium dark:bg-primary/20"
                        : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                    )}
                  >
                    {child.type_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export function MobileSidebar({
  isOpen,
  onClose,
  selectedTypeId,
  onSelectType,
}: SidebarProps & { isOpen: boolean; onClose: () => void }) {
  const { categories, isCategoriesLoading } = useSource();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (typeId: number | undefined) => {
    onSelectType(typeId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-[var(--color-overlay)]"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[var(--color-bg-primary)] border-r border-[var(--color-border)] overflow-y-auto">
        <div className="p-3">
          <button
            onClick={() => handleSelect(undefined)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1",
              selectedTypeId === undefined
                ? "bg-primary text-white font-medium"
                : "hover:bg-[var(--color-bg-secondary)]"
            )}
          >
            全部
          </button>
          {isCategoriesLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 rounded bg-[var(--color-bg-secondary)] mb-2 animate-pulse"
                />
              ))
            : categories.map((cat) => (
                <div key={cat.type_id}>
                  <button
                    onClick={() => {
                      if (cat.children.length > 0) toggleExpand(cat.type_id);
                      else handleSelect(cat.type_id);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1",
                      selectedTypeId === cat.type_id
                        ? "bg-primary text-white font-medium"
                        : "hover:bg-[var(--color-bg-secondary)]"
                    )}
                  >
                    {cat.children.length > 0 ? (
                      expandedIds.has(cat.type_id) ? (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      )
                    ) : null}
                    <span className="truncate">{cat.type_name}</span>
                  </button>
                  {cat.children.length > 0 &&
                    expandedIds.has(cat.type_id) && (
                      <div className="ml-4">
                        {cat.children.map((child) => (
                          <button
                            key={child.type_id}
                            onClick={() => handleSelect(child.type_id)}
                            className={cn(
                              "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                              selectedTypeId === child.type_id
                                ? "bg-primary/10 text-primary font-medium dark:bg-primary/20"
                                : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                            )}
                          >
                            {child.type_name}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
        </div>
      </aside>
    </div>
  );
}
