"use client";

import { useEffect, useRef, useCallback } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";

function streamProxy(url: string): string {
  return `/api/stream?url=${encodeURIComponent(url)}`;
}

interface VideoPlayerProps {
  url: string;
  poster?: string;
  onError?: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
}

const NEXT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>`;

export function VideoPlayer({ url, poster, onError, onNextEpisode, hasNextEpisode }: VideoPlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const artInstanceRef = useRef<Artplayer | null>(null);
  const onNextRef = useRef(onNextEpisode);

  useEffect(() => {
    onNextRef.current = onNextEpisode;
  }, [onNextEpisode]);

  const isMobile = useCallback(() => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (!artRef.current || !url) return;

    if (artInstanceRef.current) {
      artInstanceRef.current.destroy(false);
      artInstanceRef.current = null;
    }

    const proxyUrl = streamProxy(url);
    const mobile = isMobile();

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
      playsInline: true,
      autoOrientation: mobile,
      lock: mobile,
      gesture: mobile,
      fastForward: mobile,
      autoPlayback: true,
      cssVar: {
        "--art-progress-height": mobile ? "6px" : "5px",
        "--art-control-height": mobile ? "44px" : "36px",
        "--art-control-icon-size": mobile ? "24px" : "20px",
      },
      moreVideoAttr: {
        "webkit-playsinline": true,
        "playsinline": true,
        "x5-playsinline": true,
        "x5-video-player-type": "h5",
      },
      controls: hasNextEpisode && onNextEpisode
        ? [
            {
              name: "next-episode",
              position: "left",
              index: 15,
              html: NEXT_ICON,
              tooltip: "下一集",
              click: function () {
                onNextRef.current?.();
              },
            },
          ]
        : [],
      customType: {
        m3u8: function (video, artUrl, art) {
          if (Hls.isSupported()) {
            const artAny = art as Record<string, unknown>;
            if (artAny.hls) {
              (artAny.hls as Hls).destroy();
            }

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
                    ...levels.map((level: { height: number }) => ({
                      html: `${level.height}p`,
                    })),
                  ],
                  onSelect(item: { html: string }) {
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
      void (art as Record<string, unknown>).promise;
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
  }, [url, poster, onError, hasNextEpisode, onNextEpisode, isMobile]);

  return (
    <div
      ref={artRef}
      className="w-full aspect-video bg-black rounded-lg overflow-hidden"
    />
  );
}
