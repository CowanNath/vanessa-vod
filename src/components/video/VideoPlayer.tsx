"use client";

import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";

function streamProxy(url: string): string {
  return `/api/stream?url=${encodeURIComponent(url)}`;
}

interface VideoPlayerProps {
  url: string;
  poster?: string;
  onError?: () => void;
}

export function VideoPlayer({ url, poster, onError }: VideoPlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const artInstanceRef = useRef<Artplayer | null>(null);

  useEffect(() => {
    if (!artRef.current || !url) return;

    if (artInstanceRef.current) {
      artInstanceRef.current.destroy(false);
      artInstanceRef.current = null;
    }

    const proxyUrl = streamProxy(url);

    const art = new Artplayer({
      container: artRef.current,
      url: proxyUrl,
      type: "m3u8",
      poster: poster || "",
      volume: 0.7,
      autoplay: false,
      pip: true,
      setting: true,
      playbackRate: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      theme: "#e11d48",
      lang: "zh-cn",
      customType: {
        m3u8: function (video, artUrl, art) {
          if (Hls.isSupported()) {
            const artAny = art as any;
            if (artAny.hls) artAny.hls.destroy();

            const hls = new Hls({
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              startLevel: -1,
              enableWorker: true,
              maxBufferHole: 0.5,
              backBufferLength: 90,
              lowLatencyMode: false,
            });
            hls.loadSource(artUrl);
            hls.attachMedia(video);
            artAny.hls = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
              if (data.levels.length > 1) {
                const levels = data.levels;
                art.controls.add({
                  name: "hlsQuality",
                  position: "right",
                  html: "自动",
                  selector: [
                    { html: "自动", default: true },
                    ...levels.map((level: any) => ({
                      html: `${level.height}p`,
                    })),
                  ],
                  onSelect(item: any) {
                    if (item.html === "自动") {
                      hls.currentLevel = -1;
                    } else {
                      for (let i = 0; i < levels.length; i++) {
                        if (`${levels[i].height}p` === item.html) {
                          hls.currentLevel = i;
                          break;
                        }
                      }
                    }
                  },
                });
              }
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                onError?.();
              }
            });

            art.on("destroy", () => {
              hls.destroy();
            });
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = artUrl;
            video.addEventListener("error", () => onError?.());
          }
        },
      },
    });

    artInstanceRef.current = art;

    art.on("video:play", () => {
      (art as any).promise?.catch(() => {});
    });

    art.on("video:error", () => {
      onError?.();
    });

    return () => {
      if (artInstanceRef.current) {
        try {
          artInstanceRef.current.pause();
        } catch {}
        artInstanceRef.current.destroy(false);
        artInstanceRef.current = null;
      }
    };
  }, [url, poster, onError]);

  return (
    <div
      ref={artRef}
      className="w-full aspect-video bg-black rounded-lg overflow-hidden"
    />
  );
}
