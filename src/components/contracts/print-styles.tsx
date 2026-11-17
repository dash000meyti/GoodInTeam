/**
 * Print rules for contract pages (scoped: only active on pages that render
 * it). Forces light colors (and the light pixel-logo tones) even in dark mode,
 * A4 margins, hides the panel/site chrome — old header/aside and the OS menu
 * bar, dock, window title bar and guides — when a `[data-contract-print]`
 * sheet is on the page, and anything marked `data-print-hide` (spec §9 "Print").
 */
const css = `
@page { size: A4; margin: 14mm 14mm 16mm; }
@media print {
  :root, :root.dark {
    color-scheme: light;
    --background: #ffffff; --foreground: #1c252e; --card: #ffffff; --card-foreground: #1c252e;
    --muted: #f4f6f8; --muted-foreground: #454f5b; --border: rgb(106 106 108 / 0.4);
    --shadow-card: none;
    --brand-yellow: #ffc50d; --brand-ink: #6a6a6c; --brand-frame: #b3b5b9; --brand-soft: #caccce; --brand-paper: #ffffff;
  }
  html, body { background: #ffffff !important; }
  body:has([data-contract-print]) aside:not([data-contract-print] *),
  body:has([data-contract-print]) header:not([data-contract-print] *) { display: none !important; }
  body:has([data-contract-print]) #main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .os-menubar, .os-dock, .os-dock-zone, .os-titlebar, .gt-guide, #panel-guide { display: none !important; }
  .panel-shell, .os-desktop { background: #fff !important; min-block-size: 0 !important; }
  .os-window { margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; }
  .os-window-body { padding: 0 !important; }
  [data-print-hide], [data-sonner-toaster] { display: none !important; }
  [data-print-avoid-break] { break-inside: avoid; }
  .prose-gt h1, .prose-gt h2, .prose-gt h3 { break-after: avoid; }
  .prose-gt p, .prose-gt li { orphans: 3; widows: 3; }
  .prose-gt a { color: inherit !important; text-decoration: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export function ContractPrintStyles() {
  return <style>{css}</style>;
}
