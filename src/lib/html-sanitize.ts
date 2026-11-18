import "server-only";
import { Marked, type Token } from "marked";
import sanitizeHtml, { type IOptions } from "sanitize-html";

/**
 * The safe subset of HTML for published content (server only).
 *
 * Posts are written in Markdown and may contain HTML. They are published on
 * the same origin as the panel, so there is no raw-HTML mode: whatever
 * `renderMarkdown(md, { allowHtml: true })` produces passes through this
 * allow-list, and so does everything else that carries a post's body (the
 * feed, the Markdown mirrors, llms-full.txt).
 *
 * Allowed: text and layout elements, lists, tables, `details`/`summary`,
 * `figure`, images and media from http(s) or site-relative sources, links to
 * http(s)/mailto/tel or site-relative targets, the classes and inline colours
 * the syntax highlighter itself emits on `pre`/`code`/`span`, heading ids, and
 * `iframe` for the one video host the site embeds.
 *
 * Everything else is removed: `script`, `style`, forms, `object`/`embed`,
 * SVG/MathML, event-handler attributes, `style` anywhere else, other classes
 * and ids, `data-*`, and `javascript:`/`data:`/other schemes.
 *
 * The parsing and filtering are done by `sanitize-html` (version pinned in
 * package.json). This module only states the policy. It must never reach a
 * client bundle.
 */

/** The video host of the site's own player (components/site/islands.tsx). */
const EMBED_HOST = "www.youtube-nocookie.com";
const EMBED_SRC = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{6,20}(?:\?[\w=&;%.-]*)?$/;
/** The fixed feature list of the site's own player; an author cannot widen it. */
const EMBED_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"];
const TEXT_TAGS = [
  ...HEADINGS,
  ...["p", "br", "hr", "blockquote", "pre", "code", "ul", "ol", "li", "dl", "dt", "dd"],
  ...["a", "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "small", "sub", "sup"],
  ...["kbd", "samp", "var", "abbr", "cite", "q", "dfn", "time", "span", "wbr", "bdi", "bdo"],
  ...["ruby", "rt", "rp"],
];
const LAYOUT_TAGS = [
  ...["div", "section", "article", "aside", "header", "footer", "address"],
  ...["figure", "figcaption", "details", "summary"],
];
const TABLE_TAGS = [
  ...["table", "caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td"],
];
const MEDIA_TAGS = ["img", "picture", "source", "video", "audio", "track", "iframe"];
/** Only as the disabled checkbox of a Markdown task list (see `exclusiveFilter`). */
const TASK_TAGS = ["input"];

/** Every element the policy keeps. */
export const ALLOWED_TAGS: readonly string[] = [
  ...TEXT_TAGS,
  ...LAYOUT_TAGS,
  ...TABLE_TAGS,
  ...MEDIA_TAGS,
  ...TASK_TAGS,
];

/** Elements without an end tag. */
const VOID_TAGS = new Set(["br", "hr", "wbr", "img", "source", "track", "col", "input"]);

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const FONT_STYLE = /^(?:italic|normal)$/;
const FONT_WEIGHT = /^(?:bold|normal|[1-9]00)$/;
const TEXT_DECORATION = /^(?:underline|line-through|none)$/;
/** What Shiki writes for a light + dark theme pair. Nothing else survives in a `style`. */
const HIGHLIGHTER_STYLES = {
  color: [HEX_COLOR],
  "background-color": [HEX_COLOR],
  "font-style": [FONT_STYLE],
  "font-weight": [FONT_WEIGHT],
  "text-decoration": [TEXT_DECORATION],
  "--shiki-dark": [HEX_COLOR],
  "--shiki-dark-bg": [HEX_COLOR],
  "--shiki-light-font-style": [FONT_STYLE],
  "--shiki-light-font-weight": [FONT_WEIGHT],
  "--shiki-light-text-decoration": [TEXT_DECORATION],
  "--shiki-dark-font-style": [FONT_STYLE],
  "--shiki-dark-font-weight": [FONT_WEIGHT],
  "--shiki-dark-text-decoration": [TEXT_DECORATION],
};

/** Link relations an author may state; `opener` is not one of them. */
const REL_TOKENS = new Set([
  ...["nofollow", "sponsored", "ugc", "noopener", "noreferrer", "external"],
  ...["me", "author", "license", "tag", "help", "prev", "next", "bookmark"],
]);

const SIZE = ["width", "height"];
const one = (name: string, values: string[]) => ({ name, multiple: false, values });

const POLICY: IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  disallowedTagsMode: "discard",
  // Dropped together with their content: the library's list plus the two
  // elements whose content a browser does not show as text either.
  nonTextTags: ["script", "style", "textarea", "option", "xmp", "noscript", "template"],
  allowedAttributes: {
    "*": ["dir", "lang", "title", "aria-label", "aria-hidden", "role"],
    a: ["href", "hreflang", "rel", one("target", ["_blank"])],
    ...Object.fromEntries(HEADINGS.map((h) => [h, ["id"]])),
    img: ["src", "srcset", "sizes", "alt", ...SIZE, "loading", "decoding"],
    source: ["src", "srcset", "sizes", "type", "media"],
    video: [
      ...["src", "poster", "controls", "muted", "loop", "playsinline", "autoplay", "preload"],
      ...SIZE,
    ],
    audio: ["src", "controls", "muted", "loop", "preload"],
    track: ["src", "kind", "srclang", "label", "default"],
    iframe: ["src", "allow", "allowfullscreen", "loading", "referrerpolicy", ...SIZE],
    pre: ["style", one("tabindex", ["0"])],
    span: ["style"],
    details: ["open"],
    ol: ["start", "reversed", "type"],
    li: ["value"],
    time: ["datetime"],
    col: ["span"],
    colgroup: ["span"],
    th: ["align", "colspan", "rowspan", "scope"],
    td: ["align", "colspan", "rowspan"],
    input: [one("type", ["checkbox"]), "checked", "disabled"],
  },
  // Classes belong to the page's own stylesheet (layout utilities included),
  // so an author gets none; these are the ones the renderer writes itself.
  allowedClasses: {
    a: ["no-underline"],
    pre: ["shiki", "shiki-themes", "github-light", "github-dark"],
    code: [/^language-[\w-]{1,30}$/],
    span: ["line"],
  },
  allowedStyles: { pre: HIGHLIGHTER_STYLES, span: HIGHLIGHTER_STYLES },
  // The schemes `safeUrl` allows in Markdown links; media is http(s) only.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    img: ["http", "https"],
    source: ["http", "https"],
    video: ["http", "https"],
    audio: ["http", "https"],
    track: ["http", "https"],
    iframe: ["https"],
  },
  allowProtocolRelative: true,
  allowedIframeHostnames: [EMBED_HOST],
  allowIframeRelativeUrls: false,
  selfClosing: [...VOID_TAGS],
  nestingLimit: 100,
  transformTags: {
    a(tagName, attribs) {
      // A link that opens a new tab never hands the new page a reference to this one.
      const rel = new Set(
        (attribs.rel ?? "")
          .toLowerCase()
          .split(/\s+/)
          .filter((token) => REL_TOKENS.has(token)),
      );
      if (attribs.target === "_blank") rel.add("noopener").add("noreferrer");
      if (rel.size) attribs.rel = [...rel].join(" ");
      else delete attribs.rel;
      return { tagName, attribs };
    },
    iframe(tagName, attribs) {
      return {
        tagName,
        attribs: {
          ...attribs,
          allow: EMBED_ALLOW,
          loading: "lazy",
          referrerpolicy: "strict-origin-when-cross-origin",
        },
      };
    },
  },
  exclusiveFilter(frame) {
    // An embed is the video player or nothing; a form control is a task-list box or nothing.
    if (frame.tag === "iframe") return !EMBED_SRC.test(frame.attribs.src ?? "");
    if (frame.tag === "input") {
      return frame.attribs.type !== "checkbox" || !("disabled" in frame.attribs);
    }
    return false;
  },
};

/** Rendered HTML (the output of the Markdown renderer) reduced to the safe subset. */
export function sanitizeContentHtml(html: string) {
  return sanitizeHtml(html, POLICY);
}

// ─── Markdown source (mirrors) ──────────────────────────────────────────────

const ATTRIBUTE = /\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/.source;
const TAG = `</?[A-Za-z][A-Za-z0-9-]*(?:${ATTRIBUTE})*\\s*/?>`;
/** `<https://…>`, `<mailto:…>`, `<tel:…>`, `<a@b.co>`: Markdown autolinks, not HTML. */
const DOMAIN_LABEL = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?";
const AUTOLINK =
  /<(?:https?:\/\/|mailto:|tel:)[^\s<>]*>/.source +
  `|<[A-Za-z0-9.!#$%&'*+/=?^_\`{|}~-]+@${DOMAIN_LABEL}(?:\\.${DOMAIN_LABEL})*>`;
/** `[text](<target with spaces>)`: the bracketed target of a Markdown link. */
const LINK_TARGET = /(?<=\]\()<[^<>\n]*>/.source;
/**
 * Any `<` with the backslashes before it. Group 2: Markdown's own syntax
 * (link target, autolink). Group 3: something shaped like an HTML tag.
 */
const ANGLE = new RegExp(`(\\\\*)(?:(${LINK_TARGET}|${AUTOLINK})|(${TAG})|<)`, "g");
const allowedTags = new Set(ALLOWED_TAGS);
const lexer = new Marked({ gfm: true, breaks: false });

/** Remove complete HTML comments (one pass; an unterminated one is left for `cleanText`). */
function stripComments(text: string) {
  let out = "";
  let from = 0;
  for (;;) {
    const start = text.indexOf("<!--", from);
    const end = start === -1 ? -1 : text.indexOf("-->", start + 4);
    if (end === -1) return out + text.slice(from);
    out += text.slice(from, start);
    from = end + 3;
  }
}

/** A start tag without attributes: `<b>`, `<br/>`. */
const BARE_TAG = /^<[A-Za-z][A-Za-z0-9-]*\s*\/?>$/;
/** Elements that are only kept with the right attributes (see `exclusiveFilter`). */
const NEEDS_ATTRIBUTES = new Set(["iframe", "input"]);
/**
 * Start tags with attributes that one document may send through the
 * sanitiser. Past it a tag keeps its name and loses its attributes, so the
 * work per document is bounded whatever it contains.
 */
const MAX_ATTRIBUTE_TAGS = 2_000;
/** Per call of `sanitizeMarkdownHtml`: results by tag text, and what is left of the budget. */
let cleaned = new Map<string, string>();
let budget = MAX_ATTRIBUTE_TAGS;

/** Something shaped like an HTML tag: kept as a safe tag, or made inert text. */
function cleanTag(match: string) {
  const inert = `&lt;${cleanText(match.slice(1))}`;
  const closing = match.startsWith("</");
  const name = match
    .slice(closing ? 2 : 1)
    .match(/^[A-Za-z][A-Za-z0-9-]*/)![0]
    .toLowerCase();
  if (!allowedTags.has(name)) return inert;
  if (closing) return VOID_TAGS.has(name) ? "" : `</${name}>`;
  const bare = VOID_TAGS.has(name) ? `<${name} />` : `<${name}>`;
  if (NEEDS_ATTRIBUTES.has(name) && BARE_TAG.test(match)) return inert;
  if (BARE_TAG.test(match)) return bare;
  const known = cleaned.get(match);
  if (known !== undefined) return known;
  if (budget <= 0) return NEEDS_ATTRIBUTES.has(name) ? inert : bare;
  budget--;
  // The sanitiser cleans the attributes. It also closes the element, which
  // the source does later (or never, for a void element).
  const clean = sanitizeContentHtml(match);
  const end = `</${name}>`;
  const result = (clean.endsWith(end) ? clean.slice(0, -end.length) : clean) || inert;
  cleaned.set(match, result);
  return result;
}

function cleanText(text: string): string {
  if (!text.includes("<")) return text;
  return stripComments(text).replace(
    ANGLE,
    (whole: string, slashes: string, syntax?: string, tag?: string) => {
      // An odd number of backslashes escapes the `<`: it is text already. It is
      // written as `&lt;` anyway (minus the escaping backslash), which is inert
      // however the reader treats backslashes.
      if (slashes.length % 2 === 1) {
        return `${slashes.slice(1)}&lt;${cleanText(whole.slice(slashes.length + 1))}`;
      }
      if (syntax) return whole;
      return slashes + (tag ? cleanTag(tag) : "&lt;");
    },
  );
}

type Node = Token & { tokens?: unknown; items?: unknown; header?: unknown; rows?: unknown };
const list = (v: unknown) => (Array.isArray(v) ? (v as Node[]) : []);
/** Tokens taken whole: their own syntax can contain a `<` (`<https://…>`, `](<…>)`). */
const WHOLE = new Set(["codespan", "link", "image", "html"]);

/** The pieces of a block in document order (inline code, links, raw HTML, text…). */
function leaves(token: Node, out: Token[] = []) {
  const children = [
    ...list(token.tokens),
    ...list(token.items),
    ...list(token.header),
    ...list(token.rows).flatMap(list),
  ];
  if (WHOLE.has(token.type) || !children.length) out.push(token);
  else for (const child of children) leaves(child, out);
  return out;
}

/** What a list or a quote puts in front of a continuation line. */
const isPrefix = (ch: string | undefined) => ch === " " || ch === "\t" || ch === ">";
/** How many places a multi-line piece is tried at (bounds the work on hostile input). */
const MAX_CANDIDATES = 16;
/**
 * A piece starts close to where the previous one ended (between two pieces
 * there is only list, quote or table punctuation), so it is looked for in
 * this many characters. Keeps a piece that is not there from costing a scan
 * of the whole block.
 */
const SEARCH_WINDOW = 1024;

/** `raw.indexOf(piece, from)`, looking no further than the search window. */
function find(raw: string, piece: string, from: number) {
  const at = raw.slice(from, from + SEARCH_WINDOW + piece.length).indexOf(piece);
  return at === -1 ? -1 : from + at;
}

/**
 * Where `piece` (the raw text of a token) sits in `raw` at or after `from`.
 * Inside a list or a quote the lexer strips the indentation and the `>` of
 * continuation lines, so a multi-line piece is also matched line by line
 * behind such a prefix. Returns the span in `raw`, or null.
 */
function locate(raw: string, piece: string, from: number): [number, number] | null {
  const exact = find(raw, piece, from);
  if (exact !== -1) return [exact, exact + piece.length];
  const lines = piece.split("\n");
  if (lines.length < 2) return null;
  let start = find(raw, lines[0]!, from);
  for (let tries = 0; start !== -1 && tries < MAX_CANDIDATES; tries++) {
    let pos = start + lines[0]!.length;
    let ok = true;
    for (let i = 1; i < lines.length && ok; i++) {
      if (raw[pos] !== "\n") ok = false;
      else {
        pos++;
        const want = lines[i]!.trimStart();
        if (want === "" && i === lines.length - 1) break; // the piece ends with its line break
        let end = pos;
        while (isPrefix(raw[end])) end++;
        if (want === "") {
          // An empty line of the piece is a line with nothing but the prefix.
          ok = end === raw.length || raw[end] === "\n";
          pos = end;
        } else {
          // The line starts somewhere inside the run of prefix characters.
          let at = pos;
          while (at <= end && !raw.startsWith(want, at)) at++;
          ok = at <= end;
          pos = at + want.length;
        }
      }
    }
    if (ok) return [start, pos];
    start = find(raw, lines[0]!, start + 1);
  }
  return null;
}

/** Code is text: a code block inside a list or a quote, and inline code. */
const VERBATIM = new Set(["code", "codespan"]);

/** One top-level block: everything is cleaned except the code found in its exact place. */
function cleanBlock(token: Token) {
  const raw = token.raw;
  let out = "";
  let cursor = 0;
  for (const leaf of leaves(token)) {
    if (!leaf.raw) continue;
    const span = locate(raw, leaf.raw, cursor);
    // Once a piece cannot be located, positions after it are no longer
    // certain: the rest of the block is cleaned as text, code included.
    if (!span) break;
    const text = raw.slice(span[0], span[1]);
    out += cleanText(raw.slice(cursor, span[0]));
    out += VERBATIM.has(leaf.type) ? text : cleanText(text);
    cursor = span[1];
  }
  return out + cleanText(raw.slice(cursor));
}

/**
 * Markdown SOURCE with its raw HTML reduced to the same safe subset, for the
 * outputs that publish a post's Markdown (`*.md` mirrors, llms-full.txt).
 *
 * Code blocks and inline code are text and stay as they are. Everywhere else
 * every `<` ends up as one of three things: the start of an allow-listed tag
 * whose attributes went through the sanitiser, part of a Markdown autolink or
 * link target, or the inert `&lt;`. A tag that is not allowed is therefore
 * shown as text instead of being removed, which keeps prose such as
 * `Array<string>` readable; HTML comments are dropped. Markdown without a `<`
 * is returned unchanged.
 */
export function sanitizeMarkdownHtml(md: string) {
  if (!md.includes("<")) return md;
  cleaned = new Map();
  budget = MAX_ATTRIBUTE_TAGS;
  let out = "";
  for (const token of lexer.lexer(md)) {
    out += token.type === "code" || !token.raw.includes("<") ? token.raw : cleanBlock(token);
  }
  return out;
}
