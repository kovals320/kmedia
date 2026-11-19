import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase client without the visitor's cookies, for public reads and anonymous inserts
// (e.g. face name suggestions), so pages that use it can still be cached.
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
