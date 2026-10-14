"use client";

import { useRef, useState, useTransition } from "react";
import { CoinsIcon, Loader2Icon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ProjectSelect,
  TaskSelect,
  type ProjectOption,
  type TaskOption,
} from "@/components/time/project-select";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { startTimerAction } from "@/server/modules/time/actions";

/** The big "what are you working on?" bar. Enter starts a new (parallel) timer. */
export function StartTimerBar({
  projects,
  tasks,
}: {
  projects: ProjectOption[];
  tasks: TaskOption[];
}) {
  const t = useT();
  const tt = t.time;
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [billable, setBillable] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasTasks = tasks.some((x) => (projectId ? x.projectId === projectId : !x.projectId));

  const submit = () =>
    start(async () => {
      const res = await startTimerAction({
        description: description.trim(),
        projectId: projectId || undefined,
        taskId: taskId || undefined,
        billable,
      });
      if (res.ok) {
        toast.success(tt.started);
        setDescription("");
        setTaskId("");
        inputRef.current?.focus();
      } else toast.error(res.error.message);
    });

  return (
    <Card className="gap-3 p-3 sm:p-4">
      <form
        className="flex flex-col gap-3 lg:flex-row lg:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-muted/60 px-4 focus-within:ring-2 focus-within:ring-primary/30">
          <PlayIcon className="size-4 shrink-0 fill-primary text-primary" />
          <input
            ref={inputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tt.whatAreYouWorkingOn}
            aria-label={tt.whatAreYouWorkingOn}
            className="h-12 min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
          <Kbd className="hidden sm:inline-flex" dir="ltr">
            ↵
          </Kbd>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <ProjectSelect
            projects={projects}
            value={projectId}
            onChange={(id) => {
              setProjectId(id);
              setTaskId("");
              const p = projects.find((x) => x.id === id);
              setBillable(!!p && p.billingType !== "internal");
            }}
            noneLabel={t.common.noProject}
            placeholder={tt.selectProject}
            className="h-12 rounded-xl sm:w-52"
          />
          <TaskSelect
            tasks={tasks}
            projectId={projectId || null}
            value={taskId}
            onChange={setTaskId}
            noneLabel={tt.noTask}
            placeholder={tt.selectTask}
            className={cn("h-12 rounded-xl sm:w-48", !hasTasks && "opacity-60")}
          />
        </div>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-pressed={billable}
                aria-label={billable ? tt.billable : tt.nonBillable}
                onClick={() => setBillable((b) => !b)}
                className={cn(
                  "size-12 shrink-0",
                  billable &&
                    "border-success/40 bg-success/12 text-[#118d57] hover:bg-success/20 dark:text-[#77ed8b]",
                )}
              >
                <CoinsIcon className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{billable ? tt.billable : tt.nonBillable}</TooltipContent>
          </Tooltip>
          <Button
            type="submit"
            size="lg"
            className="h-12 flex-1 px-6 lg:flex-none"
            disabled={pending}
          >
            {pending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <PlayIcon className="fill-current" />
            )}
            {tt.start}
          </Button>
        </div>
      </form>
    </Card>
  );
}
