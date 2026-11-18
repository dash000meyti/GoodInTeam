import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { format } from "@/i18n/format-message";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/utils";
import { listClients } from "@/server/modules/clients/service";
import { panelContext } from "@/server/page-context";
import { ClientFormDialog } from "./_components/client-form";

/**
 * Clients (framed): the page box, then one box holding the table edge to
 * edge (md+) or hairline rows (phones).
 */
export default async function ClientsPage() {
  const { actor, t, href, locale } = await panelContext({ roles: ["owner", "admin"] });
  const list = listClients(actor);
  const c = t.clients;
  const newButton = (
    <ClientFormDialog
      trigger={
        <Button>
          <PlusIcon /> {c.new}
        </Button>
      }
    />
  );
  return (
    <>
      <PageHeader
        title={c.title}
        description={c.subtitle}
        crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: c.title }]}
        actions={newButton}
      />
      {list.length === 0 ? (
        <EmptyState icon={UsersIcon} title={c.empty} description={c.emptyHint} action={newButton} />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={c.title}>
          <FrameGrid cols={1}>
            <FrameCell pad="none">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.common.name}</TableHead>
                      <TableHead>{c.kind}</TableHead>
                      <TableHead>{t.common.email}</TableHead>
                      <TableHead className="text-end">{t.common.projects}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((cl) => (
                      <TableRow key={cl.id}>
                        <TableCell>
                          <Link
                            href={href(`/panel/clients/${cl.id}`)}
                            className="flex items-center gap-3 font-semibold hover:text-primary-ink"
                          >
                            <ClientAvatar name={cl.name} color={cl.color} />
                            <span dir="auto">{cl.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="neutral">{c[`kind_${cl.kind}`]}</Badge>
                        </TableCell>
                        <TableCell dir="ltr" className="text-start text-muted-foreground">
                          {cl.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatNumber(cl.projectCount, locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y divide-frame-line md:hidden">
                {list.map((cl) => (
                  <li key={cl.id}>
                    <Link
                      href={href(`/panel/clients/${cl.id}`)}
                      className="flex items-center gap-3 px-(--cell-pad) py-3 transition-colors hover:bg-card"
                    >
                      <ClientAvatar name={cl.name} color={cl.color} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          <bdi>{cl.name}</bdi>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                          {cl.email ?? "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-end text-xs text-muted-foreground">
                        <Badge variant="neutral">{c[`kind_${cl.kind}`]}</Badge>
                        <span className="mt-1 block tabular-nums">
                          {format(c.projectsCount, { n: formatNumber(cl.projectCount, locale) })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </FrameCell>
          </FrameGrid>
        </FrameBox>
      )}
    </>
  );
}

/** Square initials tile in the client's colour (frames are square). */
function ClientAvatar({ name, color }: { name: string; color: string | null }) {
  return (
    <Avatar className="size-9 shrink-0 rounded-none">
      <AvatarFallback
        className="rounded-none text-xs text-white"
        style={{ backgroundColor: color ?? "#078DEE" }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
