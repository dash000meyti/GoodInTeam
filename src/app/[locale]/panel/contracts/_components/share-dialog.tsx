"use client";

import { useMemo, useState } from "react";
import { CheckCircle2Icon, ExternalLinkIcon, MessageSquareTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CopyButton } from "@/components/shared/copy-button";
import { format } from "@/i18n/format-message";
import { useT } from "@/i18n/client";

export type MessageLang = "fa" | "en";

/** Message parts for one language (resolved on the server from both dictionaries). */
export interface ShareMessageParts {
  greeting: string;
  greetingNoName: string;
  sign: string;
  approve: string;
  remind: string;
  actionSign: string;
  actionApprove: string;
  expiry: string;
  thanks: string;
  kind: string;
  sender: string;
  expiryDate: string | null;
}

export function composeShareMessage(
  m: ShareMessageParts,
  o: {
    mode: "sign" | "remind";
    title: string;
    url: string;
    signerName: string | null;
    requireSignature: boolean;
  },
) {
  const lines = [
    o.signerName ? format(m.greeting, { name: o.signerName }) : m.greetingNoName,
    "",
    o.mode === "remind"
      ? format(m.remind, {
          kind: m.kind,
          title: o.title,
          action: o.requireSignature ? m.actionSign : m.actionApprove,
        })
      : format(o.requireSignature ? m.sign : m.approve, { kind: m.kind, title: o.title }),
    "",
    o.url,
  ];
  if (m.expiryDate) lines.push("", format(m.expiry, { date: m.expiryDate }));
  lines.push("", m.thanks, m.sender);
  return lines.join("\n");
}

/** Shows the signing link + a ready-to-paste message (fa/en) for messengers/email. */
export function ShareDialog({
  open,
  onOpenChange,
  mode,
  url,
  title,
  signerName,
  requireSignature,
  messages,
  defaultLang,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "sign" | "remind";
  url: string;
  title: string;
  signerName: string | null;
  requireSignature: boolean;
  messages: Record<MessageLang, ShareMessageParts>;
  defaultLang: MessageLang;
}) {
  const t = useT();
  const c = t.contracts;
  const [lang, setLang] = useState<MessageLang>(defaultLang);
  const text = useMemo(
    () => composeShareMessage(messages[lang], { mode, title, url, signerName, requireSignature }),
    [messages, lang, mode, title, url, signerName, requireSignature],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-success" />
            {mode === "remind" ? c.remindTitle : c.linkTitle}
          </DialogTitle>
          <DialogDescription>{mode === "remind" ? c.remindHint : c.linkHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="sign-url">{c.signLink}</Label>
          <div className="flex gap-2">
            <Input
              id="sign-url"
              readOnly
              value={url}
              dir="ltr"
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <CopyButton value={url} size="icon-sm" />
            <Button asChild variant="outline" size="icon-sm" aria-label={c.openSignPage}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
              </a>
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="share-msg" className="flex items-center gap-2">
              <MessageSquareTextIcon className="size-4 text-muted-foreground" />
              {c.readyMessage}
            </Label>
            <ToggleGroup
              type="single"
              value={lang}
              onValueChange={(v) => v && setLang(v as MessageLang)}
              className="p-0.5"
            >
              <ToggleGroupItem value="fa" aria-label="فارسی" className="h-7 text-xs">
                فا
              </ToggleGroupItem>
              <ToggleGroupItem value="en" aria-label="English" className="h-7 text-xs">
                EN
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Textarea
            id="share-msg"
            readOnly
            value={text}
            dir={lang === "fa" ? "rtl" : "ltr"}
            className="max-h-72 min-h-48 text-sm leading-7"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
          <CopyButton value={text} label={c.copyMessage} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
