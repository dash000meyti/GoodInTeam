import type { MetadataRoute } from "next";
import { messages } from "@/i18n/messages";

/** Web app manifest (static; Persian is the default locale). */
export default function manifest(): MetadataRoute.Manifest {
  const fa = messages.fa;
  return {
    name: fa.site.metaTitle,
    short_name: fa.common.appName,
    description: fa.site.metaDescription,
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F3F3F3",
    theme_color: "#F3F3F3",
    categories: ["business", "productivity", "education"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: fa.nav.work, url: "/work" },
      { name: fa.nav.blog, url: "/blog" },
      { name: fa.nav.contact, url: "/contact" },
      { name: fa.nav.panel, url: "/panel" },
    ],
  };
}
