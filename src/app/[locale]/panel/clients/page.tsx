import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/utils";
import { listClients } from "@/server/modules/clients/service";
import { panelContext } from "@/server/page-context";
import { ClientFormDialog } from "./_components/client-form";

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
      <PageHeader title={c.title} description={c.subtitle} actions={newButton} />
      {list.length === 0 ? (
        <EmptyState icon={UsersIcon} title={c.empty} description={c.emptyHint} action={newButton} />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{c.kind}</TableHead>
                <TableHead>{t.common.email}</TableHead>
                <TableHead>{t.common.projects}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((cl) => (
                <TableRow key={cl.id}>
                  <TableCell>
                    <Link
                      href={href(`/panel/clients/${cl.id}`)}
                      className="flex items-center gap-3 font-semibold hover:text-primary"
                    >
                      <Avatar className="size-9 rounded-xl">
                        <AvatarFallback
                          className="rounded-xl text-white"
                          style={{ backgroundColor: cl.color ?? "#078DEE" }}
                        >
                          {initials(cl.name)}
                        </AvatarFallback>
                      </Avatar>
                      {cl.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{c[`kind_${cl.kind}`]}</Badge>
                  </TableCell>
                  <TableCell dir="ltr" className="text-start text-muted-foreground">
                    {cl.email ?? "—"}
                  </TableCell>
                  <TableCell>{formatNumber(cl.projectCount, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
