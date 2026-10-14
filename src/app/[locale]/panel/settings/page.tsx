import { format } from "@/i18n/format-message";
import { formatDate } from "@/lib/format";
import { getAccount } from "@/server/modules/users/service";
import { panelContext } from "@/server/page-context";
import { AccountForm, PasswordForm } from "./_components/account-forms";
import { SettingsHeader } from "./_components/section";

/** Settings → My account (every role). */
export default async function AccountSettingsPage() {
  const { actor, t, fmt } = await panelContext();
  const me = await getAccount(actor);
  const s = t.settings;
  return (
    <div className="space-y-6">
      <SettingsHeader title={s.accountTitle} description={s.accountSubtitle} />
      <AccountForm
        user={{
          name: me.name,
          email: me.email,
          title: me.title,
          avatarUrl: me.avatarUrl,
          locale: me.locale,
        }}
        roleLabel={t.panel[`role_${me.role}`]}
        memberSince={format(s.memberSince, { date: formatDate(me.createdAt, fmt) })}
        portal={me.client ? format(s.portalOf, { client: me.client.name }) : null}
      />
      <PasswordForm email={me.email} />
    </div>
  );
}
