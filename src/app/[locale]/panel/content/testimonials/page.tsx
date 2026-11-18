import { MessageSquareQuoteIcon, PencilIcon, PlusIcon, StarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameFiller, FrameGrid } from "@/components/shell/frame";
import { packRows } from "@/components/site/frame-plan";
import { clientOptions } from "@/server/modules/clients/service";
import { listTestimonialsAdmin, projectOptions } from "@/server/modules/content/service";
import { panelContext } from "@/server/page-context";
import { ContentNav } from "../_components/content-nav";
import { DeleteTestimonialButton, TestimonialFormDialog } from "../_components/series-form";

/**
 * Testimonials (framed): the page box with the CMS sub-navigation row, then
 * the quotes as cells of ONE framed grid (1 / 2 / 3 columns), the last row
 * completed with dots fillers.
 */
export default async function TestimonialsPage() {
  const { actor, t, href } = await panelContext({ roles: ["owner", "admin"] });
  const list = listTestimonialsAdmin(actor);
  const projects = projectOptions(actor).map((p) => ({ id: p.id, name: p.name }));
  const clients = clientOptions(actor).map((p) => ({ id: p.id, name: p.name }));
  const c = t.content;
  const spans = list.map(() => undefined);
  const newButton = (
    <TestimonialFormDialog
      projects={projects}
      clients={clients}
      trigger={
        <Button>
          <PlusIcon /> {c.newTestimonial}
        </Button>
      }
    />
  );
  return (
    <>
      <PageHeader
        title={c.title}
        description={c.testimonialsSubtitle}
        crumbs={[
          { label: t.nav.dashboard, href: href("/panel") },
          { label: c.title, href: href("/panel/content") },
          { label: c.testimonialsTitle },
        ]}
        actions={newButton}
      >
        <ContentNav active="testimonials" href={href} t={t} />
      </PageHeader>
      {list.length === 0 ? (
        <EmptyState icon={MessageSquareQuoteIcon} title={c.testimonialsEmpty} action={newButton} />
      ) : (
        <FrameBox as="section" density="compact" ariaLabel={c.testimonialsTitle}>
          <FrameGrid cols={3}>
            {list.map((x) => (
              <FrameCell key={x.id} as="article" className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold" dir="auto">
                      {x.author}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" dir="auto">
                      {[x.role, x.company].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <TestimonialFormDialog
                      item={x}
                      projects={projects}
                      clients={clients}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={t.common.edit}>
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <DeleteTestimonialButton id={x.id} />
                  </div>
                </div>
                <blockquote
                  className="line-clamp-4 border-s-2 border-frame-line ps-3 text-sm leading-7 text-foreground/85"
                  dir="auto"
                >
                  “{x.quote}”
                </blockquote>
                <div className="mt-auto flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{c[`locale_${x.locale}`]}</Badge>
                  {x.rating ? (
                    <Badge variant="warning">
                      <StarIcon className="fill-current" /> {x.rating}
                    </Badge>
                  ) : null}
                  {!x.published && <Badge variant="neutral">{c.hidden}</Badge>}
                  {(x.projectName || x.clientName) && (
                    <Badge variant="info">{x.projectName ?? x.clientName}</Badge>
                  )}
                </div>
              </FrameCell>
            ))}
            <FrameFiller
              units={{
                md: packRows(spans, 3, "md").trailing,
                lg: packRows(spans, 3, "lg").trailing,
              }}
            />
          </FrameGrid>
        </FrameBox>
      )}
    </>
  );
}
