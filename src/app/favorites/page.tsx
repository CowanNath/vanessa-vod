"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Header } from "../../components/layout/Header";
import { ImageWithFallback } from "../../components/ui/ImageWithFallback";
import { favoriteStorage, type FavoriteItem } from "../../services/favorite-storage";
import { imageProxy } from "../../lib/utils";

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    favoriteStorage.loadFromServer().then(() => {
      setItems(favoriteStorage.getAll());
    });
  }, []);

  const handleRemove = (vodId: number, sourceId: string) => {
    favoriteStorage.remove(vodId, sourceId);
    setItems(favoriteStorage.getAll());
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="p-2 sm:p-4 max-w-7xl mx-auto w-full">
        <h1 className="text-lg font-semibold mb-4">我的收藏</h1>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
            <Heart className="w-12 h-12 mb-3 opacity-30" />
            <p>暂无收藏</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <div key={`${item.vodId}-${item.sourceId}`} className="group relative">
                <Link href={`/video/${item.vodId}`} className="block">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
                    {item.vodPic ? (
                      <ImageWithFallback
                        src={imageProxy(item.vodPic)}
                        alt={item.vodName}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-text-secondary)]">
                        暂无封面
                      </div>
                    )}
                  </div>
                </Link>
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.vodId, item.sourceId)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-red-500 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Heart className="w-3.5 h-3.5 fill-red-500" />
                </button>
                <div className="mt-2 px-0.5">
                  <Link href={`/video/${item.vodId}`}>
                    <h3 className="text-sm font-medium truncate hover:text-primary transition-colors">
                      {item.vodName}
                    </h3>
                  </Link>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                    {item.typeName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
