/**
 * Minimal Arabic/Persian text shaping + bidi run splitting for environments
 * that cannot shape text themselves (Satori / `next/og` OG images).
 *
 * - `shapeArabic(word)` converts letters to their contextual Presentation
 *   Forms (isolated / final / initial / medial), including Persian letters
 *   (پ چ ژ گ ک ی) and lam-alef ligatures. ZWNJ (U+200C) breaks joining.
 * - `bidiRuns(text)` splits a line into visual runs for a simple RTL/LTR
 *   paragraph: consecutive LTR words (e.g. "React Native") stay together.
 *
 * Pure functions, no dependencies — covered by arabic-shaping.test.ts.
 */

type Forms = [isol: number, fina: number, init?: number, medi?: number];

/** Joining type per letter: D = dual-joining, R = right-joining only. */
const FORMS: Record<number, Forms> = {
  0x0622: [0xfe81, 0xfe82],
  0x0623: [0xfe83, 0xfe84],
  0x0624: [0xfe85, 0xfe86],
  0x0625: [0xfe87, 0xfe88],
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  0x0627: [0xfe8d, 0xfe8e],
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  0x0629: [0xfe93, 0xfe94],
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  0x062f: [0xfea9, 0xfeaa],
  0x0630: [0xfeab, 0xfeac],
  0x0631: [0xfead, 0xfeae],
  0x0632: [0xfeaf, 0xfeb0],
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0],
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0],
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  0x0648: [0xfeed, 0xfeee],
  0x0649: [0xfeef, 0xfef0],
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4],
  // Persian
  0x067e: [0xfb56, 0xfb57, 0xfb58, 0xfb59], // پ
  0x0686: [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d], // چ
  0x0698: [0xfb8a, 0xfb8b], // ژ
  0x06a9: [0xfb8e, 0xfb8f, 0xfb90, 0xfb91], // ک
  0x06af: [0xfb92, 0xfb93, 0xfb94, 0xfb95], // گ
  0x06cc: [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff], // ی
  0x06c0: [0xfba4, 0xfba5], // ۀ
};

/** lam + alef variants → [isolated, final] ligature. */
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6],
  0x0623: [0xfef7, 0xfef8],
  0x0625: [0xfef9, 0xfefa],
  0x0627: [0xfefb, 0xfefc],
};

const TATWEEL = 0x0640;
const LAM = 0x0644;

/** Harakat & other combining marks: transparent for joining. */
function isTransparent(cp: number) {
  return (
    (cp >= 0x064b && cp <= 0x065f) ||
    cp === 0x0670 ||
    (cp >= 0x06d6 && cp <= 0x06ed) ||
    (cp >= 0x08d3 && cp <= 0x08ff)
  );
}

const canJoinNext = (cp: number | undefined) =>
  cp !== undefined && (cp === TATWEEL || FORMS[cp]?.[2] !== undefined);
const canJoinPrev = (cp: number | undefined) =>
  cp !== undefined && (cp === TATWEEL || FORMS[cp] !== undefined);

/** Convert Arabic-script letters to contextual presentation forms (logical order kept). */
export function shapeArabic(input: string): string {
  const cps = Array.from(input, (c) => c.codePointAt(0)!);
  const out: number[] = [];
  // Index of the previous / next non-transparent code point.
  const prevBase = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (!isTransparent(cps[j]!)) return cps[j];
    return undefined;
  };
  const nextBase = (i: number) => {
    for (let j = i + 1; j < cps.length; j++) if (!isTransparent(cps[j]!)) return j;
    return -1;
  };

  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!;
    const forms = FORMS[cp];
    if (!forms) {
      out.push(cp);
      continue;
    }
    const prev = prevBase(i);
    const joinsPrev = canJoinNext(prev);
    const ni = nextBase(i);
    const next = ni >= 0 ? cps[ni] : undefined;

    // lam-alef ligature
    if (cp === LAM && next !== undefined && LAM_ALEF[next]) {
      const lig = LAM_ALEF[next]!;
      out.push(joinsPrev ? lig[1] : lig[0]);
      // keep marks between lam and alef, skip the alef itself
      for (let j = i + 1; j < ni; j++) out.push(cps[j]!);
      i = ni;
      continue;
    }

    const joinsNext = forms[2] !== undefined && canJoinPrev(next);
    let shaped: number;
    if (joinsPrev && joinsNext) shaped = forms[3]!;
    else if (joinsPrev) shaped = forms[1];
    else if (joinsNext) shaped = forms[2]!;
    else shaped = forms[0];
    out.push(shaped);
  }
  return String.fromCodePoint(...out);
}

const DIGIT = /[0-9\u{660}-\u{669}\u{6F0}-\u{6F9}]/u;
const MIRROR: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "«": "»",
  "»": "«",
  "<": ">",
  ">": "<",
};

/**
 * Shape an RTL word and return it in VISUAL (left-to-right drawing) order:
 * letters reversed, digit sequences kept in reading order, brackets mirrored.
 * For renderers without bidi support (Satori draws glyphs left to right).
 */
export function visualRtl(word: string): string {
  const chars = Array.from(shapeArabic(word));
  const out: string[] = [];
  let i = chars.length - 1;
  while (i >= 0) {
    if (DIGIT.test(chars[i]!)) {
      // collect the whole number (digits + inner separators) and keep its order
      let j = i;
      while (j > 0 && (DIGIT.test(chars[j - 1]!) || /[.,٫٬/:]/.test(chars[j - 1]!))) j--;
      while (j < i && !DIGIT.test(chars[j]!)) j++;
      out.push(...chars.slice(j, i + 1));
      i = j - 1;
      continue;
    }
    const c = chars[i]!;
    out.push(MIRROR[c] ?? c);
    i--;
  }
  return out.join("");
}

const RTL_CHAR = /[\u{590}-\u{8FF}\u{FB1D}-\u{FDFF}\u{FE70}-\u{FEFE}]/u;

export function hasRtl(text: string) {
  return RTL_CHAR.test(text);
}

export interface BidiRun {
  text: string;
  rtl: boolean;
}

/**
 * Split text into word runs for visual layout. Consecutive LTR words merge
 * into one run (so "React Native" keeps its order inside an RTL line).
 * Lay the runs out with `flex-direction: row-reverse` for RTL paragraphs.
 */
export function bidiRuns(text: string): BidiRun[] {
  const words = text.split(/\s+/).filter(Boolean);
  const runs: BidiRun[] = [];
  for (const w of words) {
    const rtl = hasRtl(w);
    const last = runs[runs.length - 1];
    if (!rtl && last && !last.rtl) last.text += ` ${w}`;
    else runs.push({ text: w, rtl });
  }
  return runs;
}
