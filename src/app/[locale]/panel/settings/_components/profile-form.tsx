"use client";

import { useState, type FormEvent } from "react";
import { AtSignIcon, EyeIcon, IdCardIcon, MailIcon, PhoneIcon, Share2Icon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SwitchInput } from "@/components/shared/switch-input";
import { useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { cn, initials } from "@/lib/utils";
import { updateProfileAction } from "@/server/modules/settings/actions";
import { BilingualField } from "./bilingual-field";
import { SaveBar } from "./save-bar";
import { SettingsCard } from "./section";
import { socialIcons } from "./social-icons";

type Bi = { fa: string; en: string };
export interface ProfileValues {
  brandName: Bi;
  ownerName: Bi;
  headline: Bi;
  bio: Bi;
  location: Bi;
  avatarUrl: string;
  email: string;
  phone: string;
  socials: Record<keyof typeof socialIcons, string>;
  availableForWork: boolean;
}

const networks = Object.keys(socialIcons) as (keyof typeof socialIcons)[];

/** Snapshot of the form for the live preview. */
function read(form: HTMLFormElement) {
  const fd = new FormData(form);
  const get = (k: string) => String(fd.get(k) ?? "");
  return {
    name: { fa: get("ownerName.fa"), en: get("ownerName.en") },
    brand: { fa: get("brandName.fa"), en: get("brandName.en") },
    headline: { fa: get("headline.fa"), en: get("headline.en") },
    location: { fa: get("location.fa"), en: get("location.en") },
    avatarUrl: get("avatarUrl").trim(),
    available: get("availableForWork") === "true",
    socials: Object.fromEntries(networks.map((n) => [n, get(`socials.${n}`).trim()])) as Record<
      (typeof networks)[number],
      string
    >,
  };
}

/** Settings → Site profile: bilingual identity, contact and social links. */
export function ProfileForm({ values }: { values: ProfileValues }) {
  const t = useT();
  const s = t.settings;
  const [dirty, setDirty] = useState(false);
  const [previewLang, setPreviewLang] = useState<"fa" | "en">("fa");
  const [preview, setPreview] = useState(() => ({
    name: values.ownerName,
    brand: values.brandName,
    headline: values.headline,
    location: values.location,
    avatarUrl: values.avatarUrl,
    available: values.availableForWork,
    socials: values.socials,
  }));
  const form = useActionForm(updateProfileAction, {
    successMessage: t.common.saved,
    onSuccess: () => setDirty(false),
  });
  const onChange = (e: FormEvent<HTMLFormElement>) => {
    setDirty(true);
    setPreview(read(e.currentTarget));
  };
  const e = form.errors;
  const pl = previewLang;
  const displayName = preview.name[pl] || preview.brand[pl];

  return (
    <form action={form.submit} onChange={onChange} className="space-y-6" noValidate>
      {/* Live preview */}
      <div className="overflow-hidden rounded-2xl border border-dashed bg-muted/30">
        <div className="flex items-center justify-between gap-3 border-b border-dashed px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <EyeIcon className="size-4" /> {s.preview}
          </span>
          <div className="flex rounded-lg bg-muted p-0.5" role="tablist" aria-label={s.preview}>
            {(["fa", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={pl === l}
                onClick={() => setPreviewLang(l)}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1 text-xs font-bold text-muted-foreground",
                  pl === l && "bg-background text-foreground shadow-sm dark:bg-card",
                )}
              >
                {s[`lang_${l}`]}
              </button>
            ))}
          </div>
        </div>
        <div
          dir={pl === "fa" ? "rtl" : "ltr"}
          lang={pl}
          className="bg-grid flex flex-wrap items-center gap-4 p-5"
        >
          <Avatar className="size-16 ring-4 ring-background">
            {preview.avatarUrl && (
              <AvatarImage src={preview.avatarUrl} alt="" className="object-cover" />
            )}
            <AvatarFallback className="text-lg">{initials(displayName || "?")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-lg font-extrabold">{displayName || "—"}</p>
              {preview.available && (
                <Badge variant="success">
                  <span className="size-1.5 animate-pulse rounded-full bg-current" />
                  {s.availableBadge}
                </Badge>
              )}
            </div>
            {preview.headline[pl] && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{preview.headline[pl]}</p>
            )}
            {preview.location[pl] && (
              <p className="text-xs text-muted-foreground">{preview.location[pl]}</p>
            )}
          </div>
          <div className="flex gap-1.5">
            {networks
              .filter((n) => preview.socials[n])
              .map((n) => {
                const Icon = socialIcons[n];
                return (
                  <span
                    key={n}
                    title={s[`social_${n}`]}
                    className="flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground shadow-card"
                  >
                    <Icon className="size-4" />
                  </span>
                );
              })}
          </div>
        </div>
      </div>

      <SettingsCard icon={IdCardIcon} title={s.identity} contentClassName="grid gap-5">
        <BilingualField
          name="brandName"
          label={s.brandName}
          values={values.brandName}
          errors={e}
          required
          maxLength={80}
        />
        <BilingualField
          name="ownerName"
          label={s.ownerName}
          values={values.ownerName}
          errors={e}
          maxLength={100}
        />
        <BilingualField
          name="headline"
          label={s.headline}
          hint={s.headlineHint}
          values={values.headline}
          errors={e}
          maxLength={200}
        />
        <BilingualField
          name="bio"
          label={s.bio}
          hint={s.bioHint}
          values={values.bio}
          errors={e}
          multiline
          rows={5}
          maxLength={5000}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label={s.profileAvatar}
            hint={t.settings.avatarUrlHint}
            error={e.avatarUrl?.[0]}
            htmlFor="profile-avatar"
          >
            <Input
              id="profile-avatar"
              name="avatarUrl"
              dir="ltr"
              inputMode="url"
              defaultValue={values.avatarUrl}
              placeholder="https://…"
            />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 self-start rounded-xl border border-dashed p-4 md:mt-7">
            <SwitchInput
              name="availableForWork"
              defaultChecked={values.availableForWork}
              onChange={(v) => {
                setDirty(true);
                setPreview((p) => ({ ...p, available: v }));
              }}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-semibold">{s.availableForWork}</span>
              <span className="block text-xs text-muted-foreground">{s.availableForWorkHint}</span>
            </span>
          </label>
        </div>
      </SettingsCard>

      <SettingsCard icon={MailIcon} title={s.contact} contentClassName="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={s.publicEmail} error={e.email?.[0]} htmlFor="profile-email">
            <div className="relative">
              <AtSignIcon className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
              <Input
                id="profile-email"
                name="email"
                type="email"
                dir="ltr"
                defaultValue={values.email}
                className="ps-9"
              />
            </div>
          </Field>
          <Field label={s.publicPhone} error={e.phone?.[0]} htmlFor="profile-phone">
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
              <Input
                id="profile-phone"
                name="phone"
                type="tel"
                dir="ltr"
                defaultValue={values.phone}
                className="ps-9"
              />
            </div>
          </Field>
        </div>
        <BilingualField
          name="location"
          label={s.location}
          values={values.location}
          errors={e}
          maxLength={100}
        />
      </SettingsCard>

      <SettingsCard icon={Share2Icon} title={s.socials} description={s.socialsHint}>
        <div className="grid gap-4 md:grid-cols-2">
          {networks.map((n) => {
            const Icon = socialIcons[n];
            const key = `socials.${n}`;
            return (
              <Field key={n} label={s[`social_${n}`]} error={e[key]?.[0]} htmlFor={`social-${n}`}>
                <div className="relative" dir="ltr">
                  <Icon className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
                  <Input
                    id={`social-${n}`}
                    name={key}
                    defaultValue={values.socials[n]}
                    placeholder="@handle"
                    className="ps-9"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </div>
              </Field>
            );
          })}
        </div>
      </SettingsCard>

      <SaveBar pending={form.pending} dirty={dirty} />
    </form>
  );
}
