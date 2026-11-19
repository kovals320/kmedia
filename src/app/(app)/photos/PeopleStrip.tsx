"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { PersonSummary } from "@/lib/immich";
import { matches, queryWords } from "@/lib/search";
import { PersonFace } from "./people/PersonFace";

const ROW_LIMIT = 16;

/** The row of faces, with a search box over everyone named (Hebrew-tolerant, like the Films search). */
export function PeopleStrip({ people }: { people: PersonSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const words = useMemo(() => queryWords(query), [query]);
  const searching = words.length > 0;
  // Without a search: the people with the most photos first. With one: everyone who matches.
  const top = useMemo(() => [...people].sort((a, b) => b.count - a.count).slice(0, ROW_LIMIT), [people]);
  const shown = searching ? people.filter((p) => matches(p.name, words)) : top;

  return (
    <section aria-labelledby="people-heading" className="mt-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="people-heading" className="flex items-baseline gap-3">
          <span className="font-display text-3xl">אנשים</span>
          <span className="text-muted">{people.length.toLocaleString("he-IL")}</span>
        </h2>
        <form
          role="search"
          className="relative order-last w-full basis-full sm:order-none sm:w-auto sm:max-w-xs sm:flex-1 sm:basis-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (shown.length === 1) router.push(`/photos/people/${shown[0].id}`);
          }}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted stroke-2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="חיפוש לפי שם"
            aria-label="חיפוש אדם לפי שם"
            enterKeyHint="search"
            autoComplete="off"
            className="w-full rounded-xl border-2 border-ink/10 bg-white py-2 pe-10 ps-10 outline-none transition-colors focus:border-lake [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="ניקוי החיפוש"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-ink/5 hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </form>
        <Link
          href="/photos/people"
          className="ms-auto shrink-0 rounded-full px-3 py-1.5 font-semibold text-lake-deep transition-colors hover:bg-lake/10"
        >
          לכל האנשים
        </Link>
      </div>
      {searching && shown.length === 0 ? (
        <p role="status" className="py-6 text-muted">לא נמצא אף אחד בשם הזה</p>
      ) : (
        <ul className="-mx-5 mt-2 flex snap-x gap-4 overflow-x-auto px-6 pb-2 pt-1.5 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
          {shown.map((p) => (
            <li key={p.id} className="w-20 shrink-0 snap-start sm:w-24">
              <PersonFace person={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
