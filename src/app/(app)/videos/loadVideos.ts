import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { sortByTitleYear } from "@/lib/sort";
import { getPlaylistVideos, type Video } from "@/lib/youtube";

// All videos from every playlist as one list (duplicates removed),
// sorted by the year in the title. Shared by the page and its link preview.
// Playlists and display titles change only on the admin page, which clears this cache (tag below).
export const VIDEOS_DB_CACHE_TAG = "kmedia-videos-db";

const readVideoSettings = unstable_cache(
  async () => {
    // Public data: read without the visitor's cookies, so pages can be cached.
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const [{ data, error }, { data: titleRows, error: titlesError }] = await Promise.all([
      supabase.from("kmedia_playlists").select("youtube_playlist_id").order("sort_order"),
      supabase.from("kmedia_video_titles").select("video_id, title"),
    ]);
    if (error) throw new Error(error.message);
    if (titlesError) throw new Error(titlesError.message);
    return { data, titleRows };
  },
  ["kmedia-videos-db-v1"],
  { revalidate: 1800, tags: [VIDEOS_DB_CACHE_TAG] },
);

export const loadVideos = cache(async () => {
  const { data, titleRows } = await readVideoSettings();
  // Display titles set on the admin page (e.g. to add a year), YouTube unchanged.
  const displayTitles = new Map(
    ((titleRows ?? []) as { video_id: string; title: string }[]).map((r) => [r.video_id, r.title]),
  );

  const results = await Promise.all(
    ((data ?? []) as { youtube_playlist_id: string }[]).map(async (p) => {
      try {
        return { videos: await getPlaylistVideos(p.youtube_playlist_id), failed: false };
      } catch {
        return { videos: [] as Video[], failed: true };
      }
    }),
  );

  const seen = new Set<string>();
  const all: Video[] = [];
  for (const r of results) {
    for (const v of r.videos) {
      if (seen.has(v.id)) continue; // same video in two playlists
      seen.add(v.id);
      all.push({ ...v, youtubeTitle: v.title, title: displayTitles.get(v.id) ?? v.title });
    }
  }

  return {
    videos: sortByTitleYear(all, (v) => v.title, (v) => v.publishedAt),
    someFailed: results.some((r) => r.failed),
  };
});
