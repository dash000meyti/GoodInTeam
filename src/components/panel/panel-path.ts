import { stripLocale } from "@/i18n/config";
import { matchNav } from "./nav-config";

/**
 * Pure helpers for the panel's frame chrome (the page box's strip path and
 * decor window). Unit-tested in panel-path.test.ts.
 */

/** URL segments that name a route ("invoices", "time-reports"), never an id. */
const WORD = /^[a-z]+(?:-[a-z]+)*$/;

/** `/en/panel/invoices/x1y2` → ["invoices"]; `/panel` → []. Ids, the locale and "panel" are dropped. */
export function panelPathSegments(pathname: string) {
  return stripLocale(pathname)
    .path.split("/")
    .filter((s) => WORD.test(s) && s !== "panel");
}

/** The decor window's name for a route: "INVOICES.APP" (its module), else `${fallback}.APP`. */
export function panelAppName(pathname: string, fallback: string) {
  const item = matchNav(stripLocale(pathname).path);
  return `${(item?.href.split("/").pop() ?? fallback).toUpperCase()}.APP`;
}
