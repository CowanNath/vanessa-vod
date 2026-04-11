"use client";

import type { VodItem } from "../../lib/types";

interface VideoMetaProps {
  video: VodItem;
}

export function VideoMeta({ video }: VideoMetaProps) {
  const items = [
    { label: "年份", value: video.vod_year },
    { label: "地区", value: video.vod_area },
    { label: "语言", value: video.vod_lang },
    {
      label: "评分",
      value:
        parseFloat(video.vod_douban_score) > 0
          ? video.vod_douban_score
          : parseFloat(video.vod_score) > 0
            ? video.vod_score
            : "",
    },
    { label: "导演", value: video.vod_director },
    { label: "演员", value: video.vod_actor },
  ].filter((item) => item.value);

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <span className="text-[var(--color-text-secondary)] shrink-0">
            {item.label}:
          </span>
          <span className="text-[var(--color-text-primary)] break-all leading-relaxed">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
