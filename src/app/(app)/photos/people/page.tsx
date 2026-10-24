import { BackLink } from "@/components/BackLink";
import { getPeople, type PersonSummary } from "@/lib/immich";
import { PeopleGrid } from "./PeopleGrid";
import { notFound } from "next/navigation";
import { showPeople } from "@/lib/settings";

export const metadata = { title: "אנשים – קיבוץ ניר אליהו - מדיה" };

export default async function PeoplePage() {
  if (!(await showPeople())) notFound(); // turned off on the admin page
  let people: PersonSummary[] | null;
  try {
    people = await getPeople();
  } catch {
    people = null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink href="/photos" label="לתמונות" />
      <div className="flex flex-wrap items-baseline gap-x-4">
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">אנשים</h1>
        {people && people.length > 0 && <span className="text-lg text-muted">{people.length.toLocaleString("he-IL")}</span>}
      </div>

      {people === null ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          שרת התמונות לא זמין כרגע. נסו שוב בעוד כמה דקות.
        </p>
      ) : people.length === 0 ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          עוד לא סומנו כאן אנשים.
        </p>
      ) : (
        <PeopleGrid people={people} />
      )}
    </main>
  );
}
