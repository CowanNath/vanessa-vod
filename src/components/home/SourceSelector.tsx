"use client";

import { useSource } from "../../providers/SourceProvider";
import { cn } from "../../lib/utils";

export function SourceSelector() {
  const { sources, activeSource, setActiveSource } = useSource();

  return (
    <div className="flex items-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="flex gap-1.5">
        {sources.filter((s) => s.enabled).map((source) => (
          <button
            key={source.id}
            onClick={() => setActiveSource(source.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              source.id === activeSource.id
                ? "bg-primary text-white"
                : "bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]"
            )}
          >
            {source.name}
          </button>
        ))}
      </div>
    </div>
  );
}
