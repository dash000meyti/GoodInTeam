"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { zId } from "@/lib/zod-helpers";
import {
  milestoneInput,
  projectInput,
  projectUpdateInput,
  updateMilestoneInput,
  updateProjectInput,
} from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;
const STAFF = ["owner", "admin", "member"] as const;

export const createProjectAction = defineAction(
  { input: projectInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.createProject(actor, input);
    refresh();
    return { id: row.id };
  },
);

export const updateProjectAction = defineAction(
  { input: updateProjectInput, roles: [...ADMIN] },
  (input, actor) => {
    svc.updateProject(actor, input);
    refresh();
    return { id: input.id };
  },
);

export const archiveProjectAction = defineAction(
  { input: z.object({ id: zId, archived: z.boolean() }), roles: [...ADMIN] },
  ({ id, archived }, actor) => {
    svc.setProjectArchived(actor, id, archived);
    refresh();
    return null;
  },
);

export const deleteProjectAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deleteProject(actor, id);
    return null;
  },
);

export const shareProjectAction = defineAction(
  { input: z.object({ id: zId, enabled: z.boolean() }), roles: [...ADMIN] },
  ({ id, enabled }, actor) => {
    const token = svc.setProjectShareLink(actor, id, enabled);
    refresh();
    return { token };
  },
);

export const setProjectMembersAction = defineAction(
  { input: z.object({ id: zId, userIds: z.array(zId) }), roles: [...ADMIN] },
  ({ id, userIds }, actor) => {
    svc.setProjectMembers(actor, id, userIds);
    refresh();
    return null;
  },
);

export const addMilestoneAction = defineAction(
  { input: milestoneInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.addMilestone(actor, input);
    refresh();
    return { id: row.id };
  },
);

export const updateMilestoneAction = defineAction(
  { input: updateMilestoneInput, roles: [...ADMIN] },
  (input, actor) => {
    svc.updateMilestone(actor, input);
    refresh();
    return null;
  },
);

export const deleteMilestoneAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deleteMilestone(actor, id);
    refresh();
    return null;
  },
);

export const addProjectUpdateAction = defineAction(
  { input: projectUpdateInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.addProjectUpdate(actor, input);
    refresh();
    return { id: row.id };
  },
);

export const deleteProjectUpdateAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deleteProjectUpdate(actor, id);
    refresh();
    return null;
  },
);
