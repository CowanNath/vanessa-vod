"use client";

import { useState } from "react";
import Image from "next/image";
import { Film } from "lucide-react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  unoptimized?: boolean;
  style?: React.CSSProperties;
  priority?: boolean;
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    if (props.fill) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--color-bg-secondary)] gap-1 text-[var(--color-text-secondary)]">
          <Film className="w-8 h-8 opacity-30" />
          <span className="text-[10px]">加载失败</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--color-bg-secondary)] gap-1 text-[var(--color-text-secondary)]">
        <Film className="w-8 h-8 opacity-30" />
        <span className="text-[10px]">加载失败</span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      onError={() => setFailed(true)}
    />
  );
}
