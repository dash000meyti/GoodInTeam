import type { ContentType } from "@/lib/content";

/** Serializable editor state passed from the server page to <PostEditor>. */
export interface EditorPost {
  id?: string;
  type: ContentType;
  locale: "fa" | "en";
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  coverUrl: string;
  coverAlt: string;
  videoUrl: string;
  status: "draft" | "scheduled" | "published" | "archived";
  publishedDate: string;
  publishedTime: string;
  featured: boolean;
  seriesId: string;
  seriesOrder: string;
  projectId: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  sort: string;
  meta: {
    client: string;
    year: string;
    role: string;
    stack: string[];
    liveUrl: string;
    repoUrl: string;
    gallery: string[];
    metrics: { label: string; value: string }[];
    icon: string;
    faq: { q: string; a: string }[];
  };
  readingMinutes: number | null;
  views: number;
  /** Public URL path (locale-prefixed) when published, for "view on site". */
  publicPath: string | null;
}

export interface EditorContext {
  siteUrl: string;
  /** Server time when the editor was rendered (render must stay pure). */
  now: number;
  series: { id: string; title: string; locale: "fa" | "en" }[];
  projects: { id: string; name: string }[];
  serviceIcons: string[];
  translations: { id: string; locale: "fa" | "en"; title: string; status: EditorPost["status"] }[];
  syndications: {
    id: string;
    network: string;
    status: "pending" | "posted" | "failed" | "skipped";
    externalUrl: string | null;
  }[];
}
