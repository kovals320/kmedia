import { getFaces, isUuid, taggingEnabled } from "@/lib/faces";
import { getPeopleNames } from "@/lib/immich";
import { showPeople } from "@/lib/settings";

// The faces in one photo, for tagging in the viewer, plus every known name
// (offered as suggestions while typing). Off while the People switch is off.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id) || !(await showPeople())) return Response.json({ error: "not found" }, { status: 404 });
  if (!taggingEnabled()) return Response.json({ disabled: true, faces: [], names: [] }, { status: 503 });

  try {
    const [faces, names] = await Promise.all([getFaces(id), getPeopleNames().catch(() => [] as string[])]);
    return Response.json(
      { faces, names },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json({ error: "unavailable", faces: [], names: [] }, { status: 502 });
  }
}
