import Link from "next/link";
import { getPeople, getUnnamedPeople, type PersonSummary } from "@/lib/immich";
import { PeopleStrip } from "./PeopleStrip";

// "People" at the top of the Photos page (only while the People switch is on):
// the faces named in Immich with a search box, and a link to the "who is this?" page.
export async function PeopleRow() {
  let people: PersonSummary[] = [];
  let unnamed: string[] = [];
  try {
    [people, unnamed] = await Promise.all([getPeople(), getUnnamedPeople().catch(() => [] as string[])]);
  } catch {
    return null; // e.g. the Immich key has no person.read permission: just leave it out
  }
  if (people.length === 0 && unnamed.length === 0) return null;

  return (
    <>
      {people.length > 0 && <PeopleStrip people={people} />}
      {unnamed.length > 0 && (
        <Link
          href="/photos/who"
          className="group mt-5 flex items-center gap-4 rounded-2xl bg-sun/25 px-4 py-3 transition-colors hover:bg-sun/40"
        >
          <span aria-hidden className="flex shrink-0 -space-x-3 space-x-reverse">
            {unnamed.slice(0, 4).map((id) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={id} src={`/api/person/${id}`} alt="" loading="lazy" className="h-11 w-11 rounded-full bg-sun/40 object-cover ring-2 ring-paper" />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">מכירים את הפנים האלה?</span>
            <span className="block text-sm text-muted">{unnamed.length.toLocaleString("he-IL")} פנים מחכות לשם. עזרו לתייג</span>
          </span>
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-current stroke-2 text-muted transition-transform group-hover:-translate-x-1">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </>
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
