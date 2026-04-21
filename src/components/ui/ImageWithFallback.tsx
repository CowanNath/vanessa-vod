"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Film, RefreshCw } from "lucide-react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  unoptimized?: boolean;
}

const MAX_RETRY = 2;

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const handleError = useCallback(() => {
    if (retryCount < MAX_RETRY) {
      setRetryCount((c) => c + 1);
    } else {
      setFailed(true);
    }
  }, [retryCount]);

  const handleRetry = useCallback(() => {
    setFailed(false);
    setRetryCount(0);
    setLoaded(false);
  }, []);

  if (failed) {
    if (props.fill) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--color-bg-secondary)] gap-1 text-[var(--color-text-secondary)]">
          <Film className="w-8 h-8 opacity-30" />
          <span className="text-[10px]">加载失败</span>
          <button
            onClick={handleRetry}
            className="mt-1 p-1 rounded-full hover:bg-[var(--color-bg-card)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--color-bg-secondary)] gap-1 text-[var(--color-text-secondary)]">
        <Film className="w-8 h-8 opacity-30" />
        <span className="text-[10px]">加载失败</span>
        <button
          onClick={handleRetry}
          className="mt-1 p-1 rounded-full hover:bg-[var(--color-bg-card)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <Image
      key={retryCount}
      {...props}
      alt={props.alt}
      className={`${props.className || ""} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      onError={handleError}
      onLoad={() => setLoaded(true)}
    />
  );
}
