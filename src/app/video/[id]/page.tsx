"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import DOMPurify from "dompurify";
import { ArrowLeft } from "lucide-react";
import { Header } from "../../../components/layout/Header";
import { VideoPlayer } from "../../../components/video/VideoPlayer";
import { EpisodeList } from "../../../components/video/EpisodeList";
import { VideoMeta } from "../../../components/video/VideoMeta";
import { FavoriteButton } from "../../../components/favorite/FavoriteButton";
import { DownloadButton } from "../../../components/video/DownloadButton";
import { ImageWithFallback } from "../../../components/ui/ImageWithFallback";
import { useSource } from "../../../providers/SourceProvider";
import { parsePlaySources, imageProxy } from "../../../lib/utils";
import { VodApiService } from "../../../services/vod-api";
import type { VodItem } from "../../../lib/types";
import { Skeleton } from "../../../components/ui/Skeleton";

export default function VideoDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const vodId = Number(params.id);
  const sourceId = searchParams.get("source");
  const { apiService, activeSource, sources: apiSources } = useSource();
  const [video, setVideo] = useState<VodItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 自动切换源的逻辑
  const handlePlayerError = () => {
    if (!video || !currentUrl) return;
    const allSources = parsePlaySources(video.vod_play_from, video.vod_play_url);
    
    // 寻找当前剧集的名称
    let currentEpName = "";
    for (const s of allSources) {
      const ep = s.episodes.find(e => e.url === currentUrl);
      if (ep) {
        currentEpName = ep.name;
        break;
      }
    }

    if (!currentEpName) return;

    // 寻找其他线路中同一集的地址
    for (const s of allSources) {
      const nextEp = s.episodes.find(e => e.name === currentEpName && e.url !== currentUrl);
      if (nextEp) {
        console.warn(`[播放纠错] 当前线路失败，自动切至: ${s.sourceName}`);
        setCurrentUrl(nextEp.url);
        return;
      }
    }
  };

  useEffect(() => {
    if (!vodId) return;
    setIsLoading(true);
    setError(null);

    // 确定使用哪个 API 服务
    let targetApiService = apiService;
    if (sourceId) {
      const targetSource = apiSources.find(s => s.id === sourceId);
      if (targetSource) {
        targetApiService = new VodApiService(targetSource.url);
      }
    }

    targetApiService
      .fetchVideoDetail(vodId)
      .then((data) => {
        setVideo(data);
        if (data) {
          const allSources = parsePlaySources(data.vod_play_from, data.vod_play_url);
          if (allSources.length > 0) {
            // 智能首选：lzm3u8 > 360 > liangzi > m3u8
            const priorities = ["lzm3u8", "360", "liangzi", "m3u8"];
            let bestUrl = "";
            for (const p of priorities) {
              const found = allSources.find(s => s.sourceName.toLowerCase().includes(p));
              if (found && found.episodes.length > 0) {
                bestUrl = found.episodes[0].url;
                break;
              }
            }
            if (!bestUrl && allSources[0].episodes.length > 0) {
              bestUrl = allSources[0].episodes[0].url;
            }
            if (bestUrl) setCurrentUrl(bestUrl);
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [vodId, apiService]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="p-2 sm:p-4 max-w-5xl mx-auto w-full">
          <Skeleton className="aspect-video w-full rounded-lg mb-6" />
          <div className="flex gap-6">
            <Skeleton className="w-48 aspect-[2/3] rounded-lg shrink-0 hidden md:block" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex flex-col items-center justify-center py-20">
          <p className="text-[var(--color-text-secondary)] mb-4">
            {error || "视频未找到"}
          </p>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </main>
      </div>
    );
  }

  const sources = parsePlaySources(video.vod_play_from, video.vod_play_url);
  const sanitizedContent = DOMPurify.sanitize(video.vod_content);

  const currentEpisode = (() => {
    for (const s of sources) {
      const idx = s.episodes.findIndex((e) => e.url === currentUrl);
      if (idx !== -1) return { source: s, index: idx };
    }
    return null;
  })();

  const hasNextEpisode = currentEpisode
    ? currentEpisode.index < currentEpisode.source.episodes.length - 1
    : false;

  const handleNextEpisode = () => {
    if (!currentEpisode) return;
    const nextEp = currentEpisode.source.episodes[currentEpisode.index + 1];
    if (nextEp) setCurrentUrl(nextEp.url);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="p-2 sm:p-4 max-w-5xl mx-auto w-full space-y-4 sm:space-y-6">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>

        {/* Title + Favorite */}
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{video.vod_name}</h1>
            {video.vod_remarks && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {video.vod_remarks}
              </span>
            )}
          </div>
          <FavoriteButton
            vodId={video.vod_id}
            vodName={video.vod_name}
            vodPic={video.vod_pic}
            typeName={video.type_name}
            sourceId={activeSource.id}
            sourceUrl={activeSource.url}
            className="bg-[var(--color-bg-secondary)]"
            size={18}
          />
        </div>

        {/* Player */}
        {currentUrl && (
          <VideoPlayer 
            url={currentUrl} 
            poster={imageProxy(video.vod_pic)} 
            onError={handlePlayerError}
            onNextEpisode={handleNextEpisode}
            hasNextEpisode={hasNextEpisode}
          />
        )}

        {/* Episode list */}
        {sources.length > 0 && (
          <EpisodeList
            sources={sources}
            currentUrl={currentUrl}
            onSelectEpisode={setCurrentUrl}
          />
        )}

        {/* Info section */}
        <div className="flex flex-col md:flex-row gap-6">
          {video.vod_pic && (
            <div className="shrink-0 hidden md:block">
              <div className="relative w-48 aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
                <ImageWithFallback
                  src={imageProxy(video.vod_pic)}
                  alt={video.vod_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          )}
          <div className="flex-1 space-y-4">
            <VideoMeta video={video} />
            {video.vod_content && (
              <div>
                <h3 className="text-sm font-medium mb-2">剧情简介</h3>
                <div
                  className="text-sm text-[var(--color-text-secondary)] leading-relaxed prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:underline [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              </div>
            )}

            {/* Download */}
            <DownloadButton
              videoName={video.vod_name}
              sources={sources}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
