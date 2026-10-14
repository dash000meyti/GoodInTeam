"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileUpIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatDate } from "@/lib/format";
import { formatMoneySigned } from "@/components/finance/money";
import { cn } from "@/lib/utils";
import { importTransactionsAction, previewImportAction } from "@/server/modules/finance/actions";

type Preview = Extract<Awaited<ReturnType<typeof previewImportAction>>, { ok: true }>["data"];

const SAMPLE = `date,time,kind,amount,account,category,description,counterparty
1405/07/20,10:30,income,12000000,بانک ملت,درآمد پروژه,پرداخت مرحله دوم,آکادمی آکمه
2026-10-12,,expense,-2900000,بانک ملت,سرور و هاست,سرور مجازی,
2026-10-13,09:00,expense,40,Wise (USD),نرم‌افزار و اشتراک,Figma,
`;

export function ImportDialog({ trigger }: { trigger: ReactNode }) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"check" | "import" | null>(null);

  const check = (text: string) =>
    start(async () => {
      setBusy("check");
      const res = await previewImportAction({ csv: text });
      if (res.ok) setPreview(res.data);
      else toast.error(res.error.message);
    });

  const commit = () =>
    start(async () => {
      setBusy("import");
      const res = await importTransactionsAction({ csv });
      if (res.ok) {
        toast.success(format(f.importDone, { n: res.data.imported }));
        setOpen(false);
      } else toast.error(res.error.message);
    });

  const downloadSample = () => {
    const bom = String.fromCharCode(0xfeff); // so Excel opens the UTF-8 file correctly
    const blob = new Blob([bom, SAMPLE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transactions-sample.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setCsv("");
          setPreview(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{f.importTitle}</DialogTitle>
          <DialogDescription className="leading-6">{f.importHint}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="soft" size="sm">
            <label className="cursor-pointer">
              <FileUpIcon /> {f.chooseFile}
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  setCsv(text);
                  check(text);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadSample}>
            <DownloadIcon /> {f.downloadSample}
          </Button>
        </div>
        <Textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setPreview(null);
          }}
          placeholder={f.orPaste}
          rows={5}
          dir="ltr"
          className="font-mono text-xs"
        />

        {preview && (
          <div className="space-y-3">
            {preview.missingColumns.length > 0 ? (
              <p className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <XCircleIcon className="size-4" />
                {format(f.missingColumns, { cols: preview.missingColumns.join(", ") })}
              </p>
            ) : (
              <p className="text-sm font-semibold">
                {format(f.validRows, { valid: preview.valid, total: preview.total })}
              </p>
            )}
            {preview.rows.length > 0 && (
              <div className="max-h-72 scrollbar-thin overflow-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted text-muted-foreground">
                    <tr>
                      <th className="p-2 text-start">{f.line}</th>
                      <th className="p-2 text-start">{t.common.date}</th>
                      <th className="p-2 text-start">{f.account}</th>
                      <th className="p-2 text-end">{f.amount}</th>
                      <th className="p-2 text-start">{t.common.description}</th>
                      <th className="p-2 text-start">{t.common.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr
                        key={r.line}
                        className={cn("border-t border-dashed", !r.ok && "bg-destructive/5")}
                      >
                        <td className="p-2 tabular-nums">{r.line}</td>
                        <td className="p-2 whitespace-nowrap">
                          {r.occurredAt ? formatDate(r.occurredAt, { locale }) : r.raw.date}
                        </td>
                        <td className="p-2">{r.raw.account}</td>
                        <td className="p-2 text-end whitespace-nowrap">
                          {r.amountMinor != null && r.currency ? (
                            <span
                              className={
                                r.kind === "income"
                                  ? "text-[#118d57] dark:text-[#77ed8b]"
                                  : "text-[#b71d18] dark:text-[#ffac82]"
                              }
                            >
                              {formatMoneySigned(
                                r.kind === "income" ? r.amountMinor : -r.amountMinor,
                                r.currency,
                                locale,
                                { signed: true },
                              )}
                            </span>
                          ) : (
                            <span dir="ltr">{r.raw.amount}</span>
                          )}
                        </td>
                        <td className="max-w-48 truncate p-2">{r.raw.description}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {r.ok && r.warnings.length === 0 && (
                              <CheckCircle2Icon className="size-4 text-success" />
                            )}
                            {r.errors.map((e) => (
                              <Badge key={e} variant="destructive">
                                {f[`import_err_${e}`]}
                              </Badge>
                            ))}
                            {r.warnings.map((w) => (
                              <Badge key={w} variant="warning">
                                <AlertTriangleIcon /> {f[`import_warn_${w}`]}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {preview.total > preview.rows.length && (
              <p className="text-xs text-muted-foreground">{f.importMore}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => check(csv)} disabled={!csv.trim() || pending}>
            {pending && busy === "check" ? <Loader2Icon className="animate-spin" /> : null}
            {f.previewImport}
          </Button>
          <Button onClick={commit} disabled={!preview?.valid || pending}>
            {pending && busy === "import" ? <Loader2Icon className="animate-spin" /> : null}
            {format(f.importN, { n: preview?.valid ?? 0 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
