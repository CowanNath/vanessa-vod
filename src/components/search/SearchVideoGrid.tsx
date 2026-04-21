"use client";

import Link from "next/link";
import { Skeleton } from "../ui/Skeleton";
import { ImageWithFallback } from "../ui/ImageWithFallback";
import { imageProxy } from "../../lib/utils";
import type { VodItem } from "../../lib/types";

export function SearchGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SearchVideoGrid({ videos, sourceId }: { videos: VodItem[]; sourceId?: string }) {
  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-secondary)]">
        暂无数据
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {videos.map((video) => (
        <Link 
          key={video.vod_id} 
          href={`/video/${video.vod_id}${sourceId ? `?source=${sourceId}` : ""}`} 
          className="group block"
        >
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
            {video.vod_pic ? (
              <ImageWithFallback
                src={imageProxy(video.vod_pic)}
                alt={video.vod_name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs">
                暂无封面
              </div>
            )}
            {video.vod_remarks && (
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-[10px] text-white truncate">
                {video.vod_remarks}
              </span>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
          <div className="mt-2 px-0.5">
            <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {video.vod_name}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
              {video.type_name}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
