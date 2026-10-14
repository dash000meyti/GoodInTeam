"use client";

import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { archiveProjectAction, deleteProjectAction } from "@/server/modules/projects/actions";
import { ProjectFormDialog, type ProjectFormValues } from "./project-form";

export function ProjectActions({
  project,
  clients,
  archived,
}: {
  project: ProjectFormValues;
  clients: { id: string; name: string }[];
  archived: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { exec } = useAction();
  return (
    <>
      <ProjectFormDialog
        project={project}
        clients={clients}
        trigger={
          <Button variant="outline">
            <PencilIcon /> {t.common.edit}
          </Button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label={t.common.actions}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() =>
              exec(archiveProjectAction({ id: project.id, archived: !archived }), t.common.saved)
            }
          >
            {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {archived ? t.projects.unarchive : t.projects.archive}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ConfirmDialog
            description={t.projects.deleteHint}
            onConfirm={() =>
              exec(
                deleteProjectAction({ id: project.id }).then((r) => {
                  if (r.ok) router.push(localePath(locale, "/panel/projects"));
                  return r;
                }),
              )
            }
            trigger={
              <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                <Trash2Icon /> {t.common.delete}
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
