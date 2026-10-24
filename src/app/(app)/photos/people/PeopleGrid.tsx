"use client";

import { useMemo, useState } from "react";
import type { PersonSummary } from "@/lib/immich";
import { matches, queryWords } from "@/lib/search";
import { PersonFace } from "./PersonFace";

// All named people, with a search box once there are enough to need one.
export function PeopleGrid({ people }: { people: PersonSummary[] }) {
  const [query, setQuery] = useState("");
  const words = useMemo(() => queryWords(query), [query]);
  const shown = useMemo(
    () => (words.length === 0 ? people : people.filter((p) => matches(p.name, words))),
    [people, words],
  );

  return (
    <>
      {people.length > 12 && (
        <div role="search" className="relative mt-6 max-w-xl sm:mt-8">
          <label htmlFor="people-search" className="sr-only">
            חיפוש לפי שם
          </label>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-muted stroke-2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id="people-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="חיפוש לפי שם"
            enterKeyHint="search"
            autoComplete="off"
            className="w-full rounded-2xl border-2 border-ink/10 bg-white py-3 pe-4 ps-12 text-lg outline-none transition-colors placeholder:text-muted focus:border-lake [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-6 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-8 text-center text-lg text-muted">
          לא נמצא אף אחד בשם הזה.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5 lg:grid-cols-7">
          {shown.map((p) => (
            <li key={p.id}>
              <PersonFace person={p} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
