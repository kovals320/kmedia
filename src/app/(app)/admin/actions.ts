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
type PendingRow = {
  id: string;
  asset_id: string | null;
  face_id: string | null;
  person_id: string | null;
  current_name: string | null;
  name: string;
  status: string;
};
type Supa = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/** Turns an Immich error into a message for the admin; `fatal` = no point trying the other suggestions. */
function explain(e: unknown): { message: string; fatal: boolean } {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("IMMICH_TAG_API_KEY")) return { message: "חסר מפתח הכתיבה של Immich (IMMICH_TAG_API_KEY) ב-Vercel.", fatal: true };
  if (/: 40[13] /.test(msg)) return { message: "למפתח של Immich אין הרשאה לשנות אנשים. בדקו את ההרשאות שלו.", fatal: true };
  if (msg.startsWith("Immich")) return { message: "שרת התמונות לא הצליח לשמור. נסו שוב.", fatal: /: 5\d\d |fetch failed/.test(msg) };
  return { message: msg || "משהו השתבש. נסו שוב.", fatal: false };
}

/** Writes one suggestion into Immich and marks it approved (and other pending ones for the same target rejected). */
async function approveRow(supabase: Supa, row: PendingRow, name: string): Promise<{ ok: string } | { error: string; fatal: boolean }> {
  let result: string;
  try {
    result = row.face_id
      ? await applyName(row.asset_id as string, row.face_id, name)
      : await applyPersonName(row.person_id as string, name);
  } catch (e) {
    const { message, fatal } = explain(e);
    return { error: message, fatal };
  }
  const now = new Date().toISOString();
  await supabase.from("kmedia_face_suggestions").update({ status: "approved", name, result, decided_at: now }).eq("id", row.id);
  // Other pending suggestions for the same face (or face group) are now settled too.
  const others = supabase
    .from("kmedia_face_suggestions")
    .update({ status: "rejected", result: "הוצע שם אחר שאושר", decided_at: now })
    .eq("status", "pending")
    .neq("id", row.id);
  await (row.face_id ? others.eq("face_id", row.face_id) : others.eq("person_id", row.person_id as string).is("face_id", null));
  return { ok: result };
}

function refreshAfterApproval() {
  updateTag(IMMICH_CACHE_TAG);
  revalidatePath("/photos", "layout");
  revalidatePath("/admin");
}

const PENDING_COLS = "id, asset_id, face_id, person_id, current_name, name, status";

export async function approveSuggestion(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!name || name.length > 60) return { error: "צריך שם (עד 60 תווים).", ok: null };

  const { data: row } = await supabase.from("kmedia_face_suggestions").select(PENDING_COLS).eq("id", id).maybeSingle();
  if (!row || row.status !== "pending") return { error: "ההצעה הזו כבר טופלה.", ok: null };

  const res = await approveRow(supabase, row as PendingRow, name);
  if ("error" in res) return { error: res.error, ok: null };
  refreshAfterApproval();
  return { error: null, ok: res.ok };
}

const APPROVE_ALL_LIMIT = 40; // per click, so one request stays well within Vercel's time limit
const APPROVE_ALL_SECONDS = 200;

/**
 * Approves every pending suggestion as suggested, oldest first. Suggestions that disagree
 * (different names for the same face, or for the same unnamed face group) are left for the
 * admin to decide one by one.
 */
export async function approveAllSuggestions(_: FormState): Promise<FormState> {
  const started = Date.now();
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("kmedia_face_suggestions")
    .select(PENDING_COLS)
    .eq("status", "pending")
    .order("created_at");
  const rows = (data ?? []) as PendingRow[];
  if (rows.length === 0) return { error: null, ok: "אין הצעות שמחכות לאישור." };

  // What each suggestion names: a whole unnamed group, or one face that already has a name.
  const target = (r: PendingRow) => (r.face_id && r.current_name ? `f:${r.face_id}` : `p:${r.person_id ?? r.face_id}`);
  const key = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase();
  const namesByTarget = new Map<string, Set<string>>();
  for (const r of rows) {
    const t = target(r);
    if (!namesByTarget.has(t)) namesByTarget.set(t, new Set());
    namesByTarget.get(t)!.add(key(r.name));
  }
  const conflicted = rows.filter((r) => namesByTarget.get(target(r))!.size > 1);
  const clear = rows.filter((r) => namesByTarget.get(target(r))!.size === 1);

  let approved = 0;
  let failed = 0;
  let stopped: string | null = null;
  let lastError: string | null = null;
  const done = new Set<string>(); // rows settled as a side effect of an earlier approval
  for (const r of clear) {
    if (approved + failed >= APPROVE_ALL_LIMIT || (Date.now() - started) / 1000 > APPROVE_ALL_SECONDS) break;
    if (done.has(r.id)) continue;
    const res = await approveRow(supabase, r, r.name.trim().replace(/\s+/g, " "));
    if ("error" in res) {
      if (res.fatal) {
        stopped = res.error;
        break;
      }
      failed++;
      lastError = res.error;
      continue;
    }
    approved++;
    for (const o of clear) if (o.id !== r.id && (r.face_id ? o.face_id === r.face_id : o.person_id === r.person_id && !o.face_id)) done.add(o.id);
  }
  if (approved > 0) refreshAfterApproval();

  const left = clear.length - approved - failed - done.size;
  const parts = [approved === 1 ? "אושרה הצעה אחת." : `אושרו ${approved} הצעות.`];
  if (conflicted.length > 0) parts.push(`${conflicted.length} הצעות לא אושרו כי הוצעו להן שמות שונים. החליטו עליהן אחת-אחת.`);
  if (failed > 0) parts.push(`${failed} לא נשמרו (${lastError}).`);
  if (left > 0 && !stopped) parts.push(`נשארו עוד ${left}. לחצו שוב כדי להמשיך.`);
  if (stopped) return { error: `${approved > 0 ? parts[0] + " " : ""}${stopped}`, ok: null };
  return { error: null, ok: parts.join(" ") };
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
