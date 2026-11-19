"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { IMMICH_CACHE_TAG } from "@/lib/immich";
import { getPlaylistInfo, YOUTUBE_CACHE_TAG } from "@/lib/youtube";
import { SETTINGS_CACHE_TAG } from "@/lib/settings";
import { VIDEOS_DB_CACHE_TAG } from "../videos/loadVideos";
import { applyName, applyPersonName } from "@/lib/faces";

export type FormState = { error: string | null; ok: string | null };

function playlistIdFrom(input: string) {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("list");
  } catch {
    return /^[A-Za-z0-9_-]{10,}$/.test(trimmed) ? trimmed : null;
  }
}

export async function addPlaylist(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = playlistIdFrom(String(formData.get("url") ?? ""));
  if (!id) return { error: "זה לא נראה כמו קישור לפלייליסט ביוטיוב.", ok: null };

  const info = await getPlaylistInfo(id);
  if (!info) {
    return { error: "לא מצאנו את הפלייליסט. ודאו שהוא ציבורי או 'לא רשום', לא פרטי.", ok: null };
  }

  const { data: last } = await supabase
    .from("kmedia_playlists")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("kmedia_playlists").insert({
    youtube_playlist_id: id,
    title: info.title,
    sort_order: ((last?.sort_order as number | undefined) ?? 0) + 1,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "הפלייליסט הזה כבר באפליקציה." : "לא הצלחנו להוסיף. נסו שוב.",
      ok: null,
    };
  }
  updateTag(VIDEOS_DB_CACHE_TAG);
  revalidatePath("/admin");
  revalidatePath("/videos");
  revalidatePath("/");
  return { error: null, ok: `"${info.title}" נוסף (${info.count} סרטים).` };
}

export async function removePlaylist(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("kmedia_playlists").delete().eq("id", id);
  updateTag(VIDEOS_DB_CACHE_TAG);
  revalidatePath("/admin");
  revalidatePath("/videos");
  revalidatePath("/");
}

// Drop the saved YouTube and Immich data so the next visit reads fresh content.
export async function refreshFromYouTube(_: FormState): Promise<FormState> {
  await requireAdmin();
  updateTag(YOUTUBE_CACHE_TAG);
  updateTag(IMMICH_CACHE_TAG);
  updateTag(VIDEOS_DB_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/videos");
  revalidatePath("/photos", "layout");
  const time = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  }).format(new Date());
  return { error: null, ok: `עודכן ב-${time}. השינויים מיוטיוב ומשרת התמונות כבר מופיעים באפליקציה.` };
}

const VIDEO_ID = /^[A-Za-z0-9_-]{6,20}$/;

function refreshVideoPages() {
  updateTag(VIDEOS_DB_CACHE_TAG);
  revalidatePath("/videos");
  revalidatePath("/");
}

/** Sets the title shown in the app for one video. Empty or same as YouTube = back to the YouTube title. */
export async function setVideoTitle(videoId: string, youtubeTitle: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!VIDEO_ID.test(videoId)) return { error: "סרט לא תקין.", ok: null };
  const title = String(formData.get("title") ?? "").trim();

  if (!title || title === youtubeTitle.trim()) {
    const { error } = await supabase.from("kmedia_video_titles").delete().eq("video_id", videoId);
    if (error) return { error: "לא הצלחנו לשמור. נסו שוב.", ok: null };
    refreshVideoPages();
    return { error: null, ok: "חזר לשם שביוטיוב." };
  }

  const { error } = await supabase
    .from("kmedia_video_titles")
    .upsert({ video_id: videoId, title, updated_at: new Date().toISOString() });
  if (error) return { error: "לא הצלחנו לשמור. נסו שוב.", ok: null };
  refreshVideoPages();
  return { error: null, ok: "נשמר." };
}

export async function removeVideoTitle(videoId: string) {
  const { supabase } = await requireAdmin();
  if (!VIDEO_ID.test(videoId)) return;
  await supabase.from("kmedia_video_titles").delete().eq("video_id", videoId);
  refreshVideoPages();
}

/** Turns the People (faces) section of the Photos page on or off. */
export async function setShowPeople(show: boolean) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("kmedia_settings")
    .upsert({ key: "show_people", value: show, updated_at: new Date().toISOString() });
  updateTag(SETTINGS_CACHE_TAG);
  revalidatePath("/photos", "layout");
  revalidatePath("/admin");
}

// Face name suggestions from visitors (ported from the family media app).
export async function approveSuggestion(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!name || name.length > 60) return { error: "צריך שם (עד 60 תווים).", ok: null };

  const { data: row } = await supabase
    .from("kmedia_face_suggestions")
    .select("id, asset_id, face_id, person_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.status !== "pending") return { error: "ההצעה הזו כבר טופלה.", ok: null };

  let result: string;
  try {
    result = row.face_id
      ? await applyName(row.asset_id as string, row.face_id as string, name)
      : await applyPersonName(row.person_id as string, name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("IMMICH_TAG_API_KEY")) return { error: "חסר מפתח הכתיבה של Immich (IMMICH_TAG_API_KEY) ב-Vercel.", ok: null };
    if (/: 40[13] /.test(msg)) return { error: "למפתח של Immich אין הרשאה לשנות אנשים. בדקו את ההרשאות שלו.", ok: null };
    return { error: msg.startsWith("Immich") ? "שרת התמונות לא הצליח לשמור. נסו שוב." : msg || "משהו השתבש. נסו שוב.", ok: null };
  }

  await supabase
    .from("kmedia_face_suggestions")
    .update({ status: "approved", name, result, decided_at: new Date().toISOString() })
    .eq("id", id);
  // Other pending suggestions for the same face (or face group) are now settled too.
  const others = supabase
    .from("kmedia_face_suggestions")
    .update({ status: "rejected", result: "הוצע שם אחר שאושר", decided_at: new Date().toISOString() })
    .eq("status", "pending");
  await (row.face_id ? others.eq("face_id", row.face_id as string) : others.eq("person_id", row.person_id as string).is("face_id", null));

  updateTag(IMMICH_CACHE_TAG);
  revalidatePath("/photos", "layout");
  revalidatePath("/admin");
  return { error: null, ok: result };
}

export async function rejectSuggestion(id: string) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("kmedia_face_suggestions")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/admin");
}
