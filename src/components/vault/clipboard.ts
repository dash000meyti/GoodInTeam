"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";

/**
 * Copy a secret and wipe the clipboard after a countdown (default 30s), with a
 * live countdown toast. A new copy restarts the countdown; locking the vault
 * wipes immediately.
 */
const TOAST_ID = "vault-clipboard";
let timer: ReturnType<typeof setInterval> | null = null;

export interface ClipboardMessages {
  copied: string;
  /** "Clipboard clears in {n} seconds." */
  clearsIn: (n: number) => string;
  cleared: string;
  failed: string;
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function wipe(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText("");
    return true;
  } catch {
    // Browsers only allow clipboard writes while the document is focused.
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      navigator.clipboard.writeText("").catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return false;
  }
}

export async function copySecret(value: string, msgs: ClipboardMessages, seconds = 30) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    toast.error(msgs.failed, { id: TOAST_ID });
    return false;
  }
  stop();
  let left = seconds;
  const show = () =>
    toast.success(msgs.copied, {
      id: TOAST_ID,
      description: msgs.clearsIn(left),
      duration: (left + 3) * 1000,
    });
  show();
  timer = setInterval(() => {
    left -= 1;
    if (left > 0) return show();
    stop();
    void wipe().then((ok) => {
      if (ok) toast.success(msgs.cleared, { id: TOAST_ID, description: undefined, duration: 2500 });
      else toast.dismiss(TOAST_ID); // wiped as soon as the window regains focus
    });
  }, 1000);
  return true;
}

/** Copy non-secret text (usernames, hosts) without the auto-clear countdown. */
export async function copyPlain(value: string, msgs: Pick<ClipboardMessages, "copied" | "failed">) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(msgs.copied, { id: TOAST_ID, description: undefined, duration: 1500 });
    return true;
  } catch {
    toast.error(msgs.failed, { id: TOAST_ID });
    return false;
  }
}

/** Called when the vault locks: wipe a pending secret right away. */
export function clearPendingClipboard() {
  if (!timer) return;
  stop();
  toast.dismiss(TOAST_ID);
  void wipe();
}

/** `copy.secret(v)` (auto-clears) and `copy.plain(v)` with localized toasts. */
export function useVaultCopy() {
  const t = useT();
  const locale = useLocale();
  return useMemo(() => {
    const msgs: ClipboardMessages = {
      copied: t.vault.copied,
      clearsIn: (n) => format(t.vault.clipboardClears, { n: formatNumber(n, locale) }),
      cleared: t.vault.clipboardCleared,
      failed: t.vault.copyFailed,
    };
    return {
      secret: (value: string) => copySecret(value, msgs),
      plain: (value: string) => copyPlain(value, msgs),
    };
  }, [t, locale]);
}
