import { revalidateTag } from "next/cache";
import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import { listActivity } from "./activity";
import { activityToolInput, businessPatchInput, profilePatchInput } from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

export const settingsTools = [
  defineTool({
    name: "settings_get",
    title: "Get site & business settings",
    description:
      "Returns the public site profile (bilingual { fa, en } brand name, owner name, headline, bio, location; avatar, contact email/phone, social links, availableForWork) and business settings (baseCurrency, IANA timezone, invoicePrefix, defaultTaxBps + defaultTaxPercent, defaultHourlyRateMinor + defaultHourlyRate in MAJOR units of baseCurrency, bilingual paymentInstructions).",
    input: z.object({}),
    scope: "read",
    roles: [...ADMIN],
    handler: (_input, actor) => svc.getSiteSettings(actor),
  }),
  defineTool({
    name: "settings_update_profile",
    title: "Update site profile",
    description:
      "Partially update the public site profile. Only the fields you pass change; bilingual fields accept { fa?, en? } independently. Social links accept full URLs, bare domains or @handles (converted to links). Returns the full saved profile.",
    input: profilePatchInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => {
      const saved = svc.updateProfile(actor, input);
      revalidateTag("content", "max");
      return saved;
    },
  }),
  defineTool({
    name: "settings_update_business",
    title: "Update business settings",
    description:
      "Partially update business settings: baseCurrency (IRT, IRR, USD, EUR, AED, TRY, GBP, USDT), timezone (IANA, e.g. Asia/Tehran — affects 'today' and all day boundaries), invoicePrefix, defaultTaxPercent (percent), defaultHourlyRate (MAJOR units of the base currency), paymentInstructions { fa?, en? }. Changing the currency does not convert existing amounts.",
    input: businessPatchInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => {
      const saved = svc.updateBusiness(actor, input);
      revalidateTag("content", "max");
      return saved;
    },
  }),
  defineTool({
    name: "activity_list",
    title: "Read the activity log",
    description:
      "Audit log, newest first (who did what, when — including API/MCP calls). Non-admins only see their own entries. Owner/admin can filter by actor (user id), type (entity type), action (exact, e.g. 'project.create'), from/to days (YYYY-MM-DD, app timezone). Paginated: page (1-based), pageSize (≤100).",
    input: activityToolInput,
    scope: "read",
    handler: (input, actor) => listActivity(actor, input),
  }),
];
