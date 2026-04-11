"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings, Menu, Film, Heart } from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { SourceSettingsModal } from "../settings/SourceSettingsModal";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 h-12 sm:h-14">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 sm:p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 sm:gap-2 shrink-0"
          >
            <Film className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <span className="font-bold text-base sm:text-lg hidden sm:inline">Vanessa你看不看</span>
          </button>

          <form onSubmit={handleSearch} className="flex-1 min-w-0 mx-1 sm:mx-auto sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索影片..."
                className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1 sm:py-1.5 rounded-full bg-[var(--color-bg-secondary)] text-xs sm:text-sm placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </form>

          <div className="flex items-center gap-0 sm:gap-1 shrink-0">
            <button
              onClick={() => router.push("/favorites")}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              title="我的收藏"
            >
              <Heart className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>
            <ThemeToggle />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              title="源设置"
            >
              <Settings className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      <SourceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
