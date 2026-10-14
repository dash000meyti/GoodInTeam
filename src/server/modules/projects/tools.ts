import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import { zId } from "@/lib/zod-helpers";
import {
  listProjectsInput,
  milestoneInput,
  projectInput,
  projectUpdateInput,
  updateMilestoneInput,
  updateProjectInput,
} from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

export const projectsTools = [
  defineTool({
    name: "projects_list",
    title: "List projects",
    description:
      "List projects the caller can access, with client, status, progress (0-100) and tracked time (ms). Filter by status, clientId or free-text q.",
    input: listProjectsInput,
    scope: "read",
    handler: (input, actor) => svc.listProjects(actor, input),
  }),
  defineTool({
    name: "projects_get",
    title: "Get project",
    description:
      "Full project details: milestones, client-visible updates feed, tracked/billable time and (admins) income/expense totals.",
    input: z.object({ id: zId }),
    scope: "read",
    handler: ({ id }, actor) => svc.getProject(actor, id),
  }),
  defineTool({
    name: "projects_create",
    title: "Create project",
    description:
      "Create a project. Money fields (budget, hourlyRate) are in major units of `currency` (IRT = Toman). Dates are 'YYYY-MM-DD' in the app timezone.",
    input: projectInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.createProject(actor, input),
  }),
  defineTool({
    name: "projects_update",
    title: "Update project",
    description:
      "Update any project field (partial). Includes client-portal visibility flags (portalEnabled, shareProgress, shareTime, shareTasks, shareFinance, shareDocs).",
    input: updateProjectInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.updateProject(actor, input),
  }),
  defineTool({
    name: "projects_add_milestone",
    title: "Add milestone",
    description:
      "Add a milestone to a project. Progress is recalculated automatically when progressMode is 'milestones'.",
    input: milestoneInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.addMilestone(actor, input),
  }),
  defineTool({
    name: "projects_update_milestone",
    title: "Update milestone",
    description: "Update a milestone (e.g. set status to 'done').",
    input: updateMilestoneInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.updateMilestone(actor, input),
  }),
  defineTool({
    name: "projects_post_update",
    title: "Post project update",
    description:
      "Post a status update (markdown) to a project's feed. visibleToClient=true shows it in the client portal and public status page.",
    input: projectUpdateInput,
    scope: "write",
    roles: ["owner", "admin", "member"],
    handler: (input, actor) => svc.addProjectUpdate(actor, input),
  }),
];
