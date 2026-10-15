import "server-only";
import { Marked, type Tokens } from "marked";
import type { HighlighterGeneric, BundledLanguage, BundledTheme } from "shiki";
import { slugify } from "./utils";

/**
 * Markdown → HTML (server only). Used for blog posts, docs, contracts and
 * project updates. Code blocks are highlighted with Shiki (light + dark).
 *
 * Raw HTML inside markdown is ESCAPED unless `allowHtml` is true (only for
 * trusted, owner-authored public content).
 */
let highlighterPromise: Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> | null = null;
const LANGS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "bash",
  "sh",
  "css",
  "html",
  "md",
  "sql",
  "python",
  "go",
  "rust",
  "yaml",
  "dockerfile",
  "diff",
  "php",
  "java",
  "kotlin",
  "swift",
  "c",
  "cpp",
  "csharp",
  "toml",
  "ini",
] as const;

async function highlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(({ createHighlighter }) =>
      createHighlighter({ themes: ["github-light", "github-dark"], langs: [...LANGS] }),
    );
  }
  return highlighterPromise;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/**
 * Link/image targets allowed in rendered Markdown: http(s), mailto, tel,
 * relative paths, queries and fragments. Anything else (`javascript:`,
 * `data:`, `vbscript:`…) returns null. Control characters and whitespace are
 * ignored when detecting the scheme, as browsers do (`java\tscript:`).
 */
export function safeUrl(href: string | null | undefined, { images = false } = {}) {
  const raw = (href ?? "").trim();
  const compact = raw.replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (!compact) return null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase();
  if (!scheme) return raw;
  if (images) return scheme === "http" || scheme === "https" ? raw : null;
  return SAFE_SCHEMES.has(scheme) ? raw : null;
}

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export async function renderMarkdown(md: string, opts: { allowHtml?: boolean } = {}) {
  const hl = await highlighter();
  const headings: Heading[] = [];
  const used = new Map<string, number>();

  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const text = this.parser.parseInline(tokens);
        const plain = text.replace(/<[^>]+>/g, "");
        let id = slugify(plain) || `h-${headings.length + 1}`;
        const n = used.get(id) ?? 0;
        used.set(id, n + 1);
        if (n) id = `${id}-${n}`;
        headings.push({ depth, text: plain, id });
        return `<h${depth} id="${id}"><a href="#${id}" class="no-underline">${text}</a></h${depth}>\n`;
      },
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? "").split(/\s/)[0]?.toLowerCase() || "text";
        const loaded = hl.getLoadedLanguages().includes(language as BundledLanguage);
        return hl.codeToHtml(text, {
          lang: loaded ? language : "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
      },
      link({ href: rawHref, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const href = safeUrl(rawHref);
        if (href == null) return text;
        const external = /^https?:\/\//.test(href);
        const t = title ? ` title="${escapeHtml(title)}"` : "";
        return `<a href="${escapeHtml(href)}"${t}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
      },
      image({ href: rawHref, title, text }: Tokens.Image) {
        const href = safeUrl(rawHref, { images: true });
        if (href == null) return escapeHtml(text);
        const t = title ? ` title="${escapeHtml(title)}"` : "";
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${t} loading="lazy" decoding="async" />`;
      },
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return opts.allowHtml ? text : escapeHtml(text);
      },
    },
  });

  const html = await marked.parse(md ?? "");
  return { html, headings };
}

/** Plain-text excerpt from markdown (for meta descriptions / previews). */
export function markdownToText(md: string, max = 300) {
  const text = (md ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Estimated reading time in minutes (≈ 200 wpm, works for fa + en). */
export function readingMinutes(md: string) {
  const words = markdownToText(md, 1_000_000).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
