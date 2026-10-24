import { fetchPersonImage } from "@/lib/immich";
import { showPeople } from "@/lib/settings";

// A named person's face picture, served through the app so the Immich key stays private.
// Links include ?v=<version>, so a new face chosen in Immich gets a new address.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await showPeople())) return new Response("Not found", { status: 404 });
  const image = await fetchPersonImage(id);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(image.body, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=86400",
      "CDN-Cache-Control": "public, max-age=86400",
      "Vercel-CDN-Cache-Control": "public, max-age=86400",
    },
  });
}
