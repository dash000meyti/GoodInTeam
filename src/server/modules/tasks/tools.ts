import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import {
  addSubtaskInput,
  createTaskInput,
  listTasksInput,
  moveTaskInput,
  reopenTaskInput,
  taskIdInput,
  updateTaskInput,
} from "./schemas";
import * as svc from "./service";

const STAFF = ["owner", "admin", "member"] as const;

const FIELDS_HELP =
  "Dates: dueDate 'YYYY-MM-DD' (app timezone) + optional dueTime 'HH:mm' (24h; without it the task is due that whole day); " +
  "remindAt as ISO 8601, or remindDate 'YYYY-MM-DD' + remindTime 'HH:mm'. priority 0 none · 1 low · 2 medium · 3 high · 4 urgent. " +
  "status: inbox, todo, in_progress, waiting, someday, done, canceled. recurrence: RFC 5545 RRULE such as 'FREQ=WEEKLY;BYDAY=SA' " +
  '(completing a recurring task creates the next occurrence). estimateMinutes in minutes. Send "" to clear a field.';

export const tasksTools = [
  defineTool({
    name: "tasks_list",
    title: "List tasks",
    description:
      "List tasks the caller can see. list = inbox | today (due today or overdue) | upcoming (next 14 days) | anytime (no date) | waiting | someday | done (latest 50); " +
      "omit list for every open task. Filters: projectId ('_none' = no project), priority (0-4), tag, q (search title/notes). " +
      "Each task includes project, dueAt (ISO; dueAllDay=true means a calendar day), priority, tags and subtasks {done,total}.",
    input: listTasksInput,
    scope: "read",
    roles: [...STAFF],
    handler: (input, actor) => svc.listTasks(actor, input),
  }),
  defineTool({
    name: "tasks_get",
    title: "Get task",
    description:
      "One task with notes, subtasks, parent, assignee and trackedMs (total time tracked on it, milliseconds).",
    input: taskIdInput,
    scope: "read",
    roles: [...STAFF],
    handler: ({ id }, actor) => svc.getTask(actor, id),
  }),
  defineTool({
    name: "tasks_counts",
    title: "Task list counts",
    description:
      "Number of tasks in each smart list (inbox, today, overdue, upcoming, anytime, waiting, someday, done). Good for a quick overview.",
    input: z.object({}),
    scope: "read",
    roles: [...STAFF],
    handler: (_input, actor) => svc.smartListCounts(actor),
  }),
  defineTool({
    name: "tasks_create",
    title: "Create task",
    description:
      "Create a task or reminder. Either pass title (+ fields) or `text` in quick-add syntax, e.g. " +
      "'Renew domain tomorrow 10:30 #personal +good-team-site !3' — !1..!4 priority, #tag, +project-slug, " +
      "today/tomorrow/امروز/فردا/پس‌فردا or a weekday name (next such day) as due date, HH:mm as due time. Explicit fields override parsed ones. " +
      `parentId makes it a subtask. Default status: todo when it has a project or due date, else inbox. ${FIELDS_HELP}`,
    input: createTaskInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.createTask(actor, input),
  }),
  defineTool({
    name: "tasks_update",
    title: "Update task",
    description: `Patch a task: send only fields that change. Setting status 'done' behaves like tasks_complete. Changing remindAt re-arms the reminder. ${FIELDS_HELP}`,
    input: updateTaskInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.updateTask(actor, input),
  }),
  defineTool({
    name: "tasks_complete",
    title: "Complete task",
    description:
      "Mark a task done. For recurring tasks the next occurrence is created automatically; its id is returned as nextId.",
    input: taskIdInput,
    scope: "write",
    roles: [...STAFF],
    handler: ({ id }, actor) => svc.completeTask(actor, id),
  }),
  defineTool({
    name: "tasks_reopen",
    title: "Reopen task",
    description:
      "Undo completion: set the task back to `status` (default todo). Pass spawnedId (the nextId from tasks_complete) to also remove the auto-created next occurrence.",
    input: reopenTaskInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => {
      svc.reopenTask(actor, input);
      return { reopened: input.id };
    },
  }),
  defineTool({
    name: "tasks_move",
    title: "Move task on board",
    description:
      "Change a task's status column (todo, in_progress, waiting, done…) and optionally place it before another task (beforeId).",
    input: moveTaskInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.moveTask(actor, input),
  }),
  defineTool({
    name: "tasks_add_subtask",
    title: "Add subtask",
    description: "Add a checklist item (subtask) under a task. It inherits the parent's project.",
    input: addSubtaskInput,
    scope: "write",
    roles: [...STAFF],
    handler: (input, actor) => svc.addSubtask(actor, input),
  }),
  defineTool({
    name: "tasks_start_timer",
    title: "Start timer for task",
    description:
      "Start a running time entry linked to the task (description = task title, project = task project). Moves inbox/todo tasks to in_progress.",
    input: taskIdInput,
    scope: "write",
    roles: [...STAFF],
    handler: ({ id }, actor) => svc.startTaskTimer(actor, id),
  }),
  defineTool({
    name: "tasks_delete",
    title: "Delete task",
    description:
      "Permanently delete a task and its subtasks (tracked time stays, unlinked). Confirm with the user first.",
    input: taskIdInput,
    scope: "write",
    roles: [...STAFF],
    destructive: true,
    handler: ({ id }, actor) => {
      svc.deleteTask(actor, id);
      return { deleted: id };
    },
  }),
];
