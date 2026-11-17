/**
 * Active-path matching for docks and menus (pure, unit-tested). `path` is the
 * unprefixed pathname (`stripLocale(usePathname()).path`); `section` is the
 * entry's unprefixed section. No section → never active (brand tiles).
 * `exact` (and the home section "/") match only the same path; otherwise the
 * section and everything below it are active.
 */
export function isActivePath(path: string, section?: string, exact?: boolean): boolean {
  if (!section) return false;
  const p = trim(path);
  const s = trim(section);
  if (exact || s === "/") return p === s;
  return p === s || p.startsWith(`${s}/`);
}

function trim(p: string) {
  const clean = (p.split(/[?#]/)[0] || "/").replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}
