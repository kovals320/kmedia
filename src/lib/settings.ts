import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

// Site switches the admin turns on and off (table kmedia_settings).
// Read without the visitor's cookies so pages stay fast; changing a switch clears this cache.
export const SETTINGS_CACHE_TAG = "kmedia-settings";

const readSettings = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.from("kmedia_settings").select("key, value");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value]));
  },
  ["kmedia-settings-v1"],
  { revalidate: 3600, tags: [SETTINGS_CACHE_TAG] },
);

/** Whether the People (faces) section is shown. Off if the setting can't be read. */
export async function showPeople(): Promise<boolean> {
  try {
    return (await readSettings()).show_people === true;
  } catch {
    return false;
  }
}
