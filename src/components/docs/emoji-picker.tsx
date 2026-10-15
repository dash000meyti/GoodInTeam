"use client";

import { useState } from "react";
import { FileTextIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** A small curated set that covers docs, dev work, business and moods. */
export const DOC_EMOJIS: readonly string[] = `
📘 📗 📙 📕 📓 📒 📄 📑
🗂️ 📁 🗃️ 📝 ✏️ 📌 🔖 🏷️
💡 🧠 🎯 ✅ ☑️ ⚠️ ❓ ❗
🚀 🛠️ 🔧 ⚙️ 🧪 🐞 🧩 📦
💻 🖥️ 📱 🌐 ☁️ 🐳 🔒 🔑
🗄️ 📊 📈 🧾 💰 💳 🤝 👥
📅 ⏱️ 📣 💬 🎨 🖌️ 🎓 📚
🌿 🌱 🔥 ⭐ ✨ 🎉 🧭 🗺️
`
  .trim()
  .split(/\s+/);

/** Emoji icon chooser for doc pages (popover grid + "no icon"). */
export function EmojiPicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (emoji: string | null) => void;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t.docs.chooseIcon}
          title={t.docs.chooseIcon}
          className={cn(
            "flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-dashed text-3xl transition-colors hover:border-primary hover:bg-primary/5",
            className,
          )}
        >
          {value ?? <FileTextIcon className="size-6 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-3">
        <div className="grid grid-cols-8 gap-1" role="listbox" aria-label={t.docs.icon}>
          {DOC_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="option"
              aria-selected={value === e}
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-lg text-xl transition-colors hover:bg-accent",
                value === e && "bg-primary/12 ring-2 ring-primary",
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-muted-foreground"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
        >
          <XIcon /> {t.docs.removeIcon}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
