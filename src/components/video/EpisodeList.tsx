"use client";

import type { PlaySourceGroup } from "../../lib/types";
import { cn } from "../../lib/utils";
import { useState } from "react";

interface EpisodeListProps {
  sources: PlaySourceGroup[];
  currentUrl: string;
  onSelectEpisode: (url: string) => void;
}

export function EpisodeList({
  sources,
  currentUrl,
  onSelectEpisode,
}: EpisodeListProps) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);

  if (sources.length === 0) return null;

  const currentSource = sources[activeSourceIndex] || sources[0];

  return (
    <div className="space-y-3">
      {sources.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[var(--color-text-secondary)]">
            播放源:
          </span>
          {sources.map((source, index) => (
            <button
              key={source.sourceName}
              onClick={() => setActiveSourceIndex(index)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                index === activeSourceIndex
                  ? "bg-primary text-white"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {source.sourceName}
            </button>
          ))}
        </div>
      )}

      {currentSource.episodes.length > 0 && (
        <div>
          <span className="text-sm text-[var(--color-text-secondary)] mb-2 block">
            选集 ({currentSource.episodes.length}集):
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {currentSource.episodes.map((ep) => (
              <button
                key={ep.index}
                onClick={() => onSelectEpisode(ep.url)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs transition-colors",
                  currentUrl === ep.url
                    ? "bg-primary text-white font-medium"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
                )}
              >
                {ep.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
