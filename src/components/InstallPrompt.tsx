"use client";

import { useEffect, useState } from "react";

// Chrome / Android fire this event when the site can be installed as an app.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "kmedia-install-dismissed";
const DISMISS_DAYS = 14;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * A small banner on phones offering to install the site as an app.
 * Android (Chrome): an "install" button that opens the system prompt.
 * iPhone: Safari has no install button for sites, so it explains Share → Add to Home Screen.
 * Hidden inside the installed app, on computers, and for 14 days after "not now".
 */
export function InstallPrompt() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    if (isStandalone() || recentlyDismissed()) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return; // phones and tablets only

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setMode("android");
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) timer = setTimeout(() => setMode("ios"), 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private mode: just hide for now
    }
    setMode(null);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice.catch(() => null);
    setEvent(null);
    setMode(null);
  }

  if (!mode) return null;

  return (
    <div
      role="dialog"
      aria-label="התקנה כאפליקציה"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-3xl bg-white p-4 shadow-[0_12px_40px_-12px_rgba(35,48,31,0.45)] ring-1 ring-ink/10"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">אפשר להתקין את המדיה של ניר אליהו כאפליקציה</p>
          {mode === "ios" ? (
            <p className="mt-1 leading-snug text-muted">
              הקישו על כפתור השיתוף
              <svg aria-label="שיתוף" viewBox="0 0 24 24" className="mx-1 inline h-5 w-5 -translate-y-0.5 fill-none stroke-lake stroke-2">
                <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ואז על <span className="font-semibold text-ink">״הוספה למסך הבית״</span>.
            </p>
          ) : (
            <p className="mt-1 leading-snug text-muted">אייקון על מסך הבית, נפתח במסך מלא.</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-2xl px-4 py-2.5 font-semibold text-muted transition-colors hover:bg-ink/5"
        >
          {mode === "ios" ? "הבנתי" : "לא עכשיו"}
        </button>
        {mode === "android" && (
          <button
            type="button"
            onClick={install}
            className="rounded-2xl bg-lake px-5 py-2.5 font-semibold text-white transition-colors hover:bg-lake-deep"
          >
            התקנה
          </button>
        )}
      </div>
    </div>
  );
}
