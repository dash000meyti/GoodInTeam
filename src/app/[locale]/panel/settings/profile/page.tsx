import { getSiteSettings } from "@/server/modules/settings/service";
import { panelContext } from "@/server/page-context";
import { ProfileForm } from "../_components/profile-form";
import { SettingsHeader } from "../_components/section";

/** Settings → Site profile (owner/admin): what the public website says about you. */
export default async function ProfileSettingsPage() {
  const { actor, t } = await panelContext({ roles: ["owner", "admin"] });
  const { profile } = getSiteSettings(actor);
  return (
    <div className="space-y-6">
      <SettingsHeader title={t.settings.profileTitle} description={t.settings.profileSubtitle} />
      <ProfileForm values={profile} />
    </div>
  );
}
