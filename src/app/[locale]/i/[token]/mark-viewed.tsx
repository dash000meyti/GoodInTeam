"use client";

import { useEffect } from "react";
import { markInvoiceViewedAction } from "@/server/modules/finance/actions";

/** Records the first client view after mount (never during render). Idempotent on the server. */
export function MarkViewed({ token }: { token: string }) {
  useEffect(() => {
    void markInvoiceViewedAction({ token });
  }, [token]);
  return null;
}
