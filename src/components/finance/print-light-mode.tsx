"use client";

import { useEffect } from "react";

/**
 * Printing in dark mode would print light text on white paper: drop the `dark`
 * class for the duration of the print dialog (also covers Ctrl/⌘+P).
 */
export function PrintLightMode() {
  useEffect(() => {
    const html = document.documentElement;
    let wasDark = false;
    const before = () => {
      wasDark = html.classList.contains("dark");
      if (wasDark) html.classList.remove("dark");
    };
    const after = () => {
      if (wasDark) html.classList.add("dark");
      wasDark = false;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return null;
}
