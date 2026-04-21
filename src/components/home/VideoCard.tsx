"use client";

import Link from "next/link";
import { FavoriteButton } from "../favorite/FavoriteButton";
import { ImageWithFallback } from "../ui/ImageWithFallback";
import { useSource } from "../../providers/SourceProvider";
import { imageProxy } from "../../lib/utils";
import type { VodItem } from "../../lib/types";

interface VideoCardProps {
  video: VodItem;
  priority?: boolean;
}

export function VideoCard({ video, priority }: VideoCardProps) {
  const { activeSource } = useSource();

  return (
    <div className="group relative">
      <Link href={`/video/${video.vod_id}`} className="block">
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
          {video.vod_pic ? (
            <ImageWithFallback
              src={imageProxy(video.vod_pic)}
              alt={video.vod_name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 20vw, 14vw"
              priority={priority}
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
      <div className="absolute top-1.5 right-1.5 z-10">
        <FavoriteButton
          vodId={video.vod_id}
          vodName={video.vod_name}
          vodPic={video.vod_pic}
          typeName={video.type_name}
          sourceId={activeSource.id}
          sourceUrl={activeSource.url}
          className="bg-black/30 backdrop-blur-sm"
          size={14}
        />
      </div>
    </div>
  );
}
