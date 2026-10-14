import { panelContext } from "@/server/page-context";
import { AppearanceSettings } from "../_components/appearance-settings";
import { SettingsHeader } from "../_components/section";

/** Settings → Appearance (every role; stored per browser). */
export default async function AppearanceSettingsPage() {
  const { t } = await panelContext();
  return (
    <div className="space-y-6">
      <SettingsHeader
        title={t.settings.appearanceTitle}
        description={t.settings.appearanceSubtitle}
      />
      <AppearanceSettings />
    </div>
  );
}
