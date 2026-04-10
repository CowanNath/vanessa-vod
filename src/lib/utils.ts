import type { Episode, PlaySourceGroup } from "./types";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function parsePlaySources(
  playFrom: string,
  playUrl: string
): PlaySourceGroup[] {
  const sourceNames = playFrom.split("$$$");
  const sourceUrls = playUrl.split("$$$");

  return sourceNames.map((name, index) => ({
    sourceName: name.trim(),
    episodes: parseEpisodes(sourceUrls[index] || ""),
  }));
}

function parseEpisodes(playUrl: string): Episode[] {
  if (!playUrl.trim()) return [];

  return playUrl
    .split("#")
    .filter(Boolean)
    .map((item, index) => {
      const sepIndex = item.indexOf("$");
      if (sepIndex === -1) {
        return { name: `第${index + 1}集`, url: item.trim(), index };
      }
      return {
        name: item.substring(0, sepIndex).trim(),
        url: item.substring(sepIndex + 1).trim(),
        index,
      };
    });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
