import { getSiteSettings } from "@/server/modules/settings/service";
import { panelContext } from "@/server/page-context";
import { BusinessForm } from "../_components/business-form";
import { SettingsHeader } from "../_components/section";

/** Settings → Business (owner/admin). */
export default async function BusinessSettingsPage() {
  const { actor, t } = await panelContext({ roles: ["owner", "admin"] });
  const { business } = getSiteSettings(actor);
  return (
    <div className="space-y-6">
      <SettingsHeader title={t.settings.businessTitle} description={t.settings.businessSubtitle} />
      <BusinessForm
        values={{
          baseCurrency: business.baseCurrency,
          timezone: business.timezone,
          invoicePrefix: business.invoicePrefix,
          defaultTaxPercent: business.defaultTaxPercent,
          defaultHourlyRate: business.defaultHourlyRate,
          paymentInstructions: business.paymentInstructions,
        }}
      />
    </div>
  );
}
