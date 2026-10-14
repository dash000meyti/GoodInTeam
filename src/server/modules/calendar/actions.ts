"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import * as feeds from "./feeds";
import {
  commitmentInput,
  commitmentStatusInput,
  eventInput,
  idInput,
  rescheduleCommitmentInput,
  updateEventInput,
} from "./schemas";
import * as svc from "./service";

const STAFF = ["owner", "admin", "member"] as const;

export const createEventAction = defineAction(
  { input: eventInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.createEvent(actor, input);
    refresh();
    return { id: row.id };
  },
);

export const updateEventAction = defineAction(
  { input: updateEventInput, roles: [...STAFF] },
  (input, actor) => {
    svc.updateEvent(actor, input);
    refresh();
    return { id: input.id };
  },
);

export const deleteEventAction = defineAction(
  { input: idInput, roles: [...STAFF] },
  ({ id }, actor) => {
    svc.deleteEvent(actor, id);
    refresh();
    return null;
  },
);

export const duplicateEventAction = defineAction(
  { input: idInput, roles: [...STAFF] },
  ({ id }, actor) => {
    const row = svc.duplicateEvent(actor, id);
    refresh();
    return { id: row.id };
  },
);

export const createCommitmentAction = defineAction(
  { input: commitmentInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.createCommitment(actor, input);
    refresh();
    return { id: row.id };
  },
);

export const setCommitmentStatusAction = defineAction(
  { input: commitmentStatusInput, roles: [...STAFF] },
  (input, actor) => {
    svc.setCommitmentStatus(actor, input);
    refresh();
    return null;
  },
);

export const rescheduleCommitmentAction = defineAction(
  { input: rescheduleCommitmentInput, roles: [...STAFF] },
  (input, actor) => {
    svc.rescheduleCommitment(actor, input);
    refresh();
    return null;
  },
);

/** Returns the feed URL, creating the feed on first use. */
export const ensureFeedAction = defineAction(
  { input: z.object({}), roles: [...STAFF] },
  (_input, actor) => feeds.ensureFeed(actor),
);

export const regenerateFeedAction = defineAction(
  { input: z.object({}), roles: [...STAFF] },
  (_input, actor) => feeds.regenerateFeed(actor),
);
