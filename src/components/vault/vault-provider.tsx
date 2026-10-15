"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/client";
import { toSessionKey, unlockWithPassword, type VaultKeyMaterial } from "@/lib/vault-crypto";
import { clearPendingClipboard } from "./clipboard";

/** Lock after this long without interaction with the vault page. */
export const IDLE_LOCK_MS = 10 * 60_000;
/** Lock when the browser tab stays hidden this long. */
export const HIDDEN_LOCK_MS = 5 * 60_000;

export type LockReason = "manual" | "idle" | "hidden";
export type VaultStatus = "setup" | "locked" | "unlocked";

interface VaultContextValue {
  /** Wrapped key material from the server (null → vault not set up). */
  material: VaultKeyMaterial | null;
  status: VaultStatus;
  /** Non-extractable AES-GCM session key; only in memory, never persisted. */
  key: CryptoKey | null;
  /** Derive the KEK from the master password and unwrap the vault key. */
  unlock: (password: string) => Promise<void>;
  /** Start a session with an already-unwrapped vault key (setup / recovery). */
  open: (key: CryptoKey) => Promise<void>;
  /** Wipe the key from memory. `silent` skips the "locked" toast. */
  lock: (reason?: LockReason, silent?: boolean) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

/**
 * Holds the unlocked vault key in React state — memory only (no storage of any
 * kind) — and locks automatically after inactivity or while the tab is hidden.
 *
 * Next.js keeps recently visited pages alive (hidden with <Activity>), so the
 * idle timer is deliberately NOT tied to effect cleanup: leaving the vault page
 * keeps the countdown running and the vault still locks on time.
 */
export function VaultProvider({
  material,
  children,
}: {
  material: VaultKeyMaterial | null;
  children: ReactNode;
}) {
  const t = useT();
  const [key, setKey] = useState<CryptoKey | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const idleTimer = useRef<number | undefined>(undefined);
  const hiddenTimer = useRef<number | undefined>(undefined);
  const lastActivity = useRef(0);
  const hiddenAt = useRef<number | null>(null);
  const pageVisible = useRef(false);

  const lock = useCallback(
    (reason: LockReason = "manual", silent = false) => {
      window.clearTimeout(idleTimer.current);
      window.clearTimeout(hiddenTimer.current);
      clearPendingClipboard();
      if (!keyRef.current) return;
      keyRef.current = null;
      setKey(null);
      if (pageVisible.current && !silent) {
        toast.info(
          reason === "idle"
            ? t.vault.lockedIdle
            : reason === "hidden"
              ? t.vault.lockedHidden
              : t.vault.locked,
        );
      }
    },
    [t],
  );

  const lockRef = useRef(lock);
  useEffect(() => {
    lockRef.current = lock;
  }, [lock]);

  const armIdle = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => lockRef.current("idle"), IDLE_LOCK_MS);
  }, []);

  const open = useCallback(
    async (vaultKey: CryptoKey) => {
      const session = await toSessionKey(vaultKey);
      keyRef.current = session;
      lastActivity.current = Date.now();
      setKey(session);
      armIdle();
    },
    [armIdle],
  );

  const unlock = useCallback(
    async (password: string) => {
      if (!material) throw new Error("Vault is not set up");
      await open(await unlockWithPassword(material, password));
    },
    [material, open],
  );

  // Is the vault page on screen (vs. kept alive but hidden by <Activity>)?
  useLayoutEffect(() => {
    pageVisible.current = true;
    return () => {
      pageVisible.current = false;
    };
  }, []);

  useEffect(() => {
    if (!key) return;
    const onActivity = () => {
      if (!pageVisible.current) return;
      const now = Date.now();
      // Timers can be throttled in background tabs; double-check elapsed time.
      if (now - lastActivity.current > IDLE_LOCK_MS) return lockRef.current("idle");
      if (now - lastActivity.current < 1000) return;
      lastActivity.current = now;
      armIdle();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        window.clearTimeout(hiddenTimer.current);
        hiddenTimer.current = window.setTimeout(() => lockRef.current("hidden"), HIDDEN_LOCK_MS);
        return;
      }
      window.clearTimeout(hiddenTimer.current);
      const since = hiddenAt.current;
      hiddenAt.current = null;
      if (since !== null && Date.now() - since > HIDDEN_LOCK_MS) lockRef.current("hidden");
      else if (Date.now() - lastActivity.current > IDLE_LOCK_MS) lockRef.current("idle");
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"] as const;
    for (const e of events) window.addEventListener(e, onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      for (const e of events) window.removeEventListener(e, onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      // The idle timer keeps running on purpose (see component docs).
    };
  }, [key, armIdle]);

  const value = useMemo<VaultContextValue>(
    () => ({
      material,
      key,
      status: !material ? "setup" : key ? "unlocked" : "locked",
      unlock,
      open,
      lock,
    }),
    [material, key, unlock, open, lock],
  );

  return <VaultContext value={value}>{children}</VaultContext>;
}

export function useVault() {
  const v = use(VaultContext);
  if (!v) throw new Error("useVault must be used inside <VaultProvider>");
  return v;
}

/** The unlocked session key (throws if used while locked — UI guards this). */
export function useVaultKey() {
  const { key } = useVault();
  if (!key) throw new Error("Vault is locked");
  return key;
}
