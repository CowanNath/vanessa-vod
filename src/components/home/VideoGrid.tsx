"use client";

import type { VodItem } from "../../lib/types";
import { VideoCard } from "./VideoCard";

interface VideoGridProps {
  videos: VodItem[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-secondary)]">
        暂无数据
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 sm:gap-2 md:gap-3">
      {videos.map((video) => (
        <VideoCard key={video.vod_id} video={video} />
      ))}
    </div>
  );
}
