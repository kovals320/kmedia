import Link from "next/link";
import type { PersonSummary } from "@/lib/immich";

/** A round face with the person's name and photo count, linking to their photos. */
export function PersonFace({ person }: { person: PersonSummary }) {
  return (
    <Link href={`/photos/people/${person.id}`} className="group block rounded-2xl text-center">
      <div className="aspect-square overflow-hidden rounded-full bg-sun/30 ring-2 ring-sun/60 ring-offset-2 ring-offset-paper transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/person/${person.id}?v=${person.version}`}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <p className="mt-2 line-clamp-2 font-semibold leading-tight">{person.name}</p>
      <p className="text-sm text-muted">{person.count.toLocaleString("he-IL")}</p>
    </Link>
  );
}
