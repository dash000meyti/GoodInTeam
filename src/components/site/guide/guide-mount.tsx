import type { Locale } from "@/i18n/config";

/**
 * STUB (foundation) — the assistant track owns this file and replaces it.
 *
 * Contract (spec §10.2–10.4): an async server component rendered by the site
 * layout inside `.os-desktop`, after the footer, as
 * `<Suspense fallback={null}><GuideMount locale={locale} /></Suspense>`.
 * It calls `await connection()` and the cached `getPublicProfile()`, formats
 * both greetings (`guide.greeting`/`greetingCompact`, with the NoName
 * fallbacks) from the server-only `getMessages(locale).guide` namespace, and
 * renders `<div id="gt-guide" class="gt-guide" hidden>` with the sprite
 * button (`PixelAvatarSprite` without `cell`), the bubble, the polite live
 * region and the client `GuideLoader`. Lines live only in `data-guide-say`
 * attributes placed by FrameSection/FrameCell (`guideAttrs`/`spotAttrs`).
 */
export async function GuideMount({ locale }: { locale: Locale }) {
  void locale;
  return null;
}
