"use client";

import { useState, useEffect, useCallback } from "react";
import type { VodItem } from "../lib/types";
import { useSource } from "../providers/SourceProvider";

interface UseVodApiParams {
  typeId?: number;
  keyword?: string;
}

interface UseVodApiReturn {
  videos: VodItem[];
  totalPages: number;
  currentPage: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  refresh: () => void;
}

export function useVodApi(params: UseVodApiParams = {}): UseVodApiReturn {
  const { apiService, activeSource } = useSource();
  const [videos, setVideos] = useState<VodItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(
    async (page: number, typeId?: number, keyword?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiService.fetchVideoList({
          page,
          typeId,
          keyword,
        });
        setVideos(response.list || []);
        setTotalPages(response.pagecount || 0);
        setTotal(response.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "请求失败");
      } finally {
        setIsLoading(false);
      }
    },
    [apiService]
  );

  // 源切换或筛选条件变化时，重置到第1页重新请求
  useEffect(() => {
    setCurrentPage(1);
    doFetch(1, params.typeId, params.keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiService, params.typeId, params.keyword]);

  const setPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      doFetch(page, params.typeId, params.keyword);
    },
    [doFetch, params.typeId, params.keyword]
  );

  return {
    videos,
    totalPages,
    currentPage,
    total,
    isLoading,
    error,
    setPage,
    refresh: () => doFetch(currentPage, params.typeId, params.keyword),
  };
}
