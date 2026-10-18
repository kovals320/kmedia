import type { MetadataRoute } from "next";

// Makes the site installable as an app on phones ("Add to Home Screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "קיבוץ ניר אליהו - מדיה",
    short_name: "מדיה ניר אליהו",
    description: "התמונות והסרטים של קיבוץ ניר אליהו במקום אחד",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4efe3",
    theme_color: "#f4efe3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
