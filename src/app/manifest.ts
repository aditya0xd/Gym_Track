import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymTrack Pro",
    short_name: "GymTrack",
    description: "Gym owner and superadmin portal with reminders and billing.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/pwa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/pwa-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
