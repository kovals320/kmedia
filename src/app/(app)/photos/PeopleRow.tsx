import Link from "next/link";
import { getPeople, type PersonSummary } from "@/lib/immich";
import { PersonFace } from "./people/PersonFace";

const ROW_LIMIT = 16;

// "People" strip at the top of the Photos page: the faces named in Immich.
export async function PeopleRow() {
  let people: PersonSummary[];
  try {
    people = await getPeople();
  } catch {
    return null; // e.g. the Immich key has no person.read permission: just leave it out
  }
  if (people.length === 0) return null;
  // The people with the most photos first in this short row.
  const top = [...people].sort((a, b) => b.count - a.count).slice(0, ROW_LIMIT);

  return (
    <section aria-labelledby="people-heading" className="mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="people-heading" className="flex items-baseline gap-3">
          <span className="font-display text-3xl">אנשים</span>
          <span className="text-muted">{people.length.toLocaleString("he-IL")}</span>
        </h2>
        <Link
          href="/photos/people"
          className="shrink-0 rounded-full px-3 py-1.5 font-semibold text-lake-deep transition-colors hover:bg-lake/10"
        >
          לכל האנשים
        </Link>
      </div>
      <ul className="-mx-5 mt-2 flex snap-x gap-4 overflow-x-auto px-6 pb-2 pt-1.5 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {top.map((p) => (
          <li key={p.id} className="w-20 shrink-0 snap-start sm:w-24">
            <PersonFace person={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PeopleRowFallback() {
  return (
    <div aria-hidden className="mt-8">
      <div className="h-9 w-28 rounded-xl bg-ink/5" />
      <div className="mt-3 flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-20 w-20 shrink-0 rounded-full bg-sun/20 sm:h-24 sm:w-24" />
        ))}
      </div>
    </div>
  );
}
