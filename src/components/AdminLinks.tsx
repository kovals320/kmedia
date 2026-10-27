"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions";

// "ניהול" and "יציאה" for a signed-in admin. Checked in the browser (from the saved sign-in,
// no network call), so the home page itself can be served instantly from Vercel's cache.
// The admin page still checks on the server that the user really is an admin.
export function AdminLinks() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  if (!signedIn) return null;
  return (
    <div className="order-first flex items-center gap-1 self-end text-sm sm:absolute sm:left-0 sm:top-1/2 sm:order-none sm:-translate-y-1/2 sm:text-base">
      <Link href="/admin" className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink">
        ניהול
      </Link>
      <form action={signOut}>
        <button className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink">יציאה</button>
      </form>
    </div>
  );
}
