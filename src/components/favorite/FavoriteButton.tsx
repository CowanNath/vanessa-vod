"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { favoriteStorage } from "../../services/favorite-storage";

interface FavoriteButtonProps {
  vodId: number;
  vodName: string;
  vodPic: string;
  typeName: string;
  sourceId: string;
  sourceUrl: string;
  className?: string;
  size?: number;
}

export function FavoriteButton({
  vodId,
  vodName,
  vodPic,
  typeName,
  sourceId,
  sourceUrl,
  className = "",
  size = 16,
}: FavoriteButtonProps) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    favoriteStorage.loadFromServer().then(() => {
      setIsFav(favoriteStorage.isFavorite(vodId, sourceId));
    });
  }, [vodId, sourceId]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = favoriteStorage.toggle({
      vodId,
      vodName,
      vodPic,
      typeName,
      sourceId,
      sourceUrl,
    });
    setIsFav(nowFav);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={`p-1.5 rounded-full transition-all hover:scale-110 ${className}`}
      style={{ width: size + 12, height: size + 12 }}
    >
      <Heart
        width={size}
        height={size}
        className={
          isFav
            ? "text-red-500 fill-red-500"
            : "text-white/80 hover:text-white drop-shadow-md"
        }
      />
    </button>
  );
}
