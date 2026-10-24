import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { getPersonPhotos } from "@/lib/immich";
import { YearView } from "../../[year]/YearView";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> };

async function load(id: string) {
  try {
    return { person: await getPersonPhotos(id), failed: false };
  } catch {
    return { person: null, failed: true };
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { p } = await searchParams;
  const { person } = await load(id);
  if (!person) return { title: "קיבוץ ניר אליהו - מדיה" };
  const title = `${person.name} – קיבוץ ניר אליהו - מדיה`;
  const image = p && /^[0-9a-f-]{36}$/i.test(p) ? `/api/photo/${p}/full` : `/api/person/${person.id}?v=${person.version}`;
  // A shared link shows the photo (or the face) in WhatsApp etc.
  return { title, openGraph: { title: person.name, images: [{ url: image }] } };
}

export default async function PersonPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { p } = await searchParams;
  const { person, failed } = await load(id);

  if (failed) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
        <BackLink href="/photos/people" label="לכל האנשים" />
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          שרת התמונות לא זמין כרגע. נסו שוב בעוד כמה דקות.
        </p>
      </main>
    );
  }
  if (!person) notFound();

  const initialIndex = p ? person.photos.findIndex((x) => x.id === p) : -1;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink href="/photos/people" label="לכל האנשים" />
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-sun/30 ring-2 ring-sun/60 ring-offset-2 ring-offset-paper sm:h-24 sm:w-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/person/${person.id}?v=${person.version}`} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[2.2rem] leading-[1.05] sm:text-5xl">{person.name}</h1>
          <p className="mt-1 text-lg text-muted">
            {person.photos.length === 1 ? "תמונה אחת" : `${person.photos.length.toLocaleString("he-IL")} תמונות`}
          </p>
        </div>
      </div>

      {person.photos.length === 0 ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          אין עדיין תמונות של {person.name} באתר.
        </p>
      ) : (
        <YearView
          year={person.name}
          photos={person.photos}
          initialIndex={initialIndex >= 0 ? initialIndex : null}
          path={`/photos/people/${person.id}`}
          shareTitle={`תמונה של ${person.name}`}
        />
      )}
    </main>
  );
}
