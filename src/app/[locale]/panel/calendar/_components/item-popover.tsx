"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BellIcon,
  CheckIcon,
  CopyPlusIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FolderKanbanIcon,
  HandshakeIcon,
  MapPinIcon,
  PencilIcon,
  RepeatIcon,
  Trash2Icon,
  UsersIcon,
  VideoIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorDot } from "@/components/shared/color-dot";
import { useAction } from "@/components/shared/use-action-form";
import { dayKeyOf } from "@/components/calendar/grid";
import { dateLabel, rruleSummary } from "@/components/calendar/format";
import { ItemIcon } from "@/components/calendar/kinds";
import type { CalendarItem } from "@/components/calendar/types";
import { localePath } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { formatRelative } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { duplicateEventAction, setCommitmentStatusAction } from "@/server/modules/calendar/actions";
import { useCalendar } from "./calendar-context";
import { reminderLabel, statusLabel } from "./labels";
import { itemTitle, itemTypeLabel, itemWhenLabel } from "./item-style";

/** Wraps a trigger element; clicking it opens the item's details popover. */
export function ItemPopover({
  item,
  children,
  side,
}: {
  item: CalendarItem;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align="start"
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <ItemDetails item={item} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

export function ItemDetails({ item, onClose }: { item: CalendarItem; onClose?: () => void }) {
  const t = useT();
  const c = t.calendar;
  const cal = useCalendar();
  const { exec, pending } = useAction();
  const ev = item.event;
  const fmt = { locale: cal.locale, timeZone: cal.tz };
  const isCommitment = ev?.kind === "commitment";
  const canEdit = !!ev?.canEdit;
  const pendingCommitment = isCommitment && (ev.status === "confirmed" || ev.status === "tentative");
  const href = (p: string) => localePath(cal.locale, p);

  const setStatus = (status: "kept" | "missed") =>
    exec(
      setCommitmentStatusAction({ id: ev!.id, status }).then((r) => {
        if (r.ok) onClose?.();
        return r;
      }),
      status === "kept" ? c.markedKept : c.markedMissed,
    );

  return (
    <div className="text-sm">
      <div className="flex items-start gap-3 p-4 pb-3">
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in oklab, ${item.color} 16%, transparent)`,
            color: item.color,
          }}
        >
          <ItemIcon item={item} className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-base leading-snug font-bold break-words",
              (item.done || item.status === "canceled") && "line-through decoration-2 opacity-70",
            )}
          >
            {itemTitle(item, c)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{itemWhenLabel(item, cal, c)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4">
        <Badge variant="neutral">{itemTypeLabel(item, c)}</Badge>
        {ev && (isCommitment || ev.status !== "confirmed") && (
          <Badge
            variant={
              ev.status === "done"
                ? "success"
                : ev.status === "missed"
                  ? "destructive"
                  : ev.status === "canceled"
                    ? "neutral"
                    : isCommitment
                      ? "warning"
                      : "info"
            }
          >
            {statusLabel(ev.kind, ev.status, c)}
          </Badge>
        )}
        {!ev && item.done && (
          <Badge variant="success">
            <CheckIcon />
          </Badge>
        )}
      </div>

      <ul className="space-y-2.5 px-4 pt-3 pb-1 text-[13px]">
        {ev?.recurrence && (
          <Row icon={RepeatIcon}>{rruleSummary(ev.recurrence, c, cal.locale, cal.tz)}</Row>
        )}
        {ev?.location && <Row icon={MapPinIcon}>{ev.location}</Row>}
        {item.project && (
          <Row icon={FolderKanbanIcon}>
            <Link
              href={href(`/panel/projects/${item.project.id}`)}
              className="inline-flex items-center gap-1.5 font-semibold hover:text-primary hover:underline"
            >
              <ColorDot color={item.project.color} />
              {item.project.name}
            </Link>
          </Row>
        )}
        {item.client && (
          <Row icon={UsersIcon}>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <ColorDot color={item.client.color} />
              {item.client.name}
            </span>
          </Row>
        )}
        {isCommitment && ev.promisedAt && (
          <Row icon={HandshakeIcon}>
            {format(c.promisedOn, { when: formatRelative(ev.promisedAt, fmt, cal.now) })}
            <span className="text-muted-foreground">
              {" · "}
              {dateLabel(dayKeyOf(ev.promisedAt, cal.tz), cal.locale, { weekday: false })}
            </span>
          </Row>
        )}
        {ev?.remindMinutesBefore != null && (
          <Row icon={BellIcon}>
            {format(c.remindsAt, { when: reminderLabel(ev.remindMinutesBefore, c, cal.locale) })}
          </Row>
        )}
        {item.amount && (
          <Row icon={WalletIcon}>
            {c.amountDue}:{" "}
            <b>{formatMoney(item.amount.minor, item.amount.currency, cal.locale)}</b>
          </Row>
        )}
        {ev && ev.attendees.length > 0 && (
          <Row icon={UsersIcon}>
            <span className="flex flex-wrap gap-1">
              {ev.attendees.map((a, i) => (
                <span
                  key={i}
                  title={a.email}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium"
                >
                  {a.name}
                </span>
              ))}
            </span>
          </Row>
        )}
      </ul>

      {ev?.descriptionText && (
        <p className="mx-4 mt-2 line-clamp-6 rounded-lg bg-muted/60 p-2.5 text-[13px] leading-6 whitespace-pre-line text-muted-foreground">
          {ev.descriptionText}
        </p>
      )}

      {ev?.meetingUrl && (
        <div className="px-4 pt-3">
          <Button asChild className="w-full">
            <a href={ev.meetingUrl} target="_blank" rel="noopener noreferrer">
              <VideoIcon /> {c.join}
            </a>
          </Button>
        </div>
      )}

      {pendingCommitment && canEdit && (
        <div className="grid grid-cols-2 gap-2 px-4 pt-3">
          <Button variant="soft" disabled={pending} onClick={() => setStatus("kept")}>
            <CheckIcon /> {c.markKept}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setStatus("missed")}
            className="text-destructive"
          >
            <XIcon /> {c.markMissed}
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-dashed p-2">
        {ev ? (
          <>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose?.();
                  cal.openEdit(ev);
                }}
              >
                <PencilIcon /> {t.common.edit}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                exec(
                  duplicateEventAction({ id: ev.id }).then((r) => {
                    if (r.ok) onClose?.();
                    return r;
                  }),
                  c.duplicated,
                )
              }
            >
              <CopyPlusIcon /> {c.duplicate}
            </Button>
            <Button variant="ghost" size="icon-sm" asChild>
              <a href={`/api/calendar/events/${ev.id}`} download aria-label={c.downloadIcs} title={c.downloadIcs}>
                <DownloadIcon />
              </a>
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="ms-auto text-destructive"
                aria-label={t.common.delete}
                title={t.common.delete}
                onClick={() => {
                  onClose?.();
                  cal.requestDelete(ev);
                }}
              >
                <Trash2Icon />
              </Button>
            )}
          </>
        ) : (
          <>
            {item.href && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={href(item.href)}>
                  <ExternalLinkIcon />
                  {item.type === "task"
                    ? c.openTask
                    : item.type === "invoice"
                      ? c.openInvoice
                      : c.openProject}
                </Link>
              </Button>
            )}
            <span className="ms-auto px-2 text-[11px] text-muted-foreground">{c.readOnly}</span>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: typeof MapPinIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </li>
  );
}
