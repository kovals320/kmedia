import type { NextConfig } from "next";

// 2026-10-31: the kibbutz media app moved into the kibbutz app as a section (app.kneapps.fyi/media).
// Every address of this site forwards there (shared photo and video links keep their ?p= / ?v=),
// so old links and home-screen shortcuts keep working.
const NEW = "https://app.kneapps.fyi/media";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: NEW, permanent: true },
      { source: "/photos/:path*", destination: `${NEW}/photos/:path*`, permanent: true },
      { source: "/videos", destination: `${NEW}/videos`, permanent: true },
      { source: "/admin", destination: `${NEW}/admin`, permanent: true },
      { source: "/api/photo/:id/:size", destination: "https://app.kneapps.fyi/api/media/photo/:id/:size", permanent: true },
      { source: "/api/person/:id", destination: "https://app.kneapps.fyi/api/media/person/:id", permanent: true },
      { source: "/:path*", destination: NEW, permanent: true },
    ];
  },
};

export default nextConfig;
