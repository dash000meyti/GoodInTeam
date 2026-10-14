"use server";

import { z } from "zod";
import { defineAction } from "@/server/action";
import { renderMarkdown } from "@/lib/markdown";

/** Server-side markdown preview for editors (Shiki highlighting, HTML escaped). */
export const renderMarkdownAction = defineAction(
  { input: z.object({ md: z.string().max(500_000) }), write: false },
  async ({ md }) => (await renderMarkdown(md)).html,
);
