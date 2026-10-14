"use client";

import { useEffect, useRef } from "react";
import { recordContractViewAction } from "@/server/modules/contracts/public-actions";

/**
 * Records "viewed" once per mount via a server action — the page itself never
 * mutates during render. The server dedupes per IP/hour and ignores staff.
 */
export function ViewTracker({ token }: { token: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordContractViewAction({ token }).catch(() => {});
  }, [token]);
  return null;
}
