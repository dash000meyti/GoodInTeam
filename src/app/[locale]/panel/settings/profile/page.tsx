import { getSiteSettings } from "@/server/modules/settings/service";
import { panelContext } from "@/server/page-context";
import { ProfileForm } from "../_components/profile-form";

/** Settings → Site profile (owner/admin): what the public website says about you. */
export default async function ProfileSettingsPage() {
  const { actor, t } = await panelContext({ roles: ["owner", "admin"] });
  const { profile } = getSiteSettings(actor);
  return (
    <ProfileForm
      values={profile}
      title={t.settings.profileTitle}
      description={t.settings.profileSubtitle}
    />
  );
}
