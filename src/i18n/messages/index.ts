/**
 * Message catalogue. One namespace per file, per locale.
 * - `fa` is the source of truth for keys; `en` is type-checked against it.
 * - Add a namespace: create fa/<ns>.ts + en/<ns>.ts and register both below.
 * - Interpolate with `format(t.common.minutesRead, { n: 5 })`.
 */
import type { Locale } from "../config";
import { auth as faAuth } from "./fa/auth";
import { common as faCommon } from "./fa/common";
import { nav as faNav } from "./fa/nav";
import { panel as faPanel } from "./fa/panel";
import { site as faSite } from "./fa/site";
import { projects as faProjects } from "./fa/projects";
import { clients as faClients } from "./fa/clients";
import { contracts as faContracts } from "./fa/contracts";
import { time as faTime } from "./fa/time";
import { tasks as faTasks } from "./fa/tasks";
import { notifications as faNotifications } from "./fa/notifications";
import { settings as faSettings } from "./fa/settings";
import { designSystem as faDesignSystem } from "./fa/designSystem";
import { finance as faFinance } from "./fa/finance";
import { calendar as faCalendar } from "./fa/calendar";
import { auth as enAuth } from "./en/auth";
import { common as enCommon } from "./en/common";
import { nav as enNav } from "./en/nav";
import { panel as enPanel } from "./en/panel";
import { site as enSite } from "./en/site";
import { projects as enProjects } from "./en/projects";
import { clients as enClients } from "./en/clients";
import { contracts as enContracts } from "./en/contracts";
import { time as enTime } from "./en/time";
import { tasks as enTasks } from "./en/tasks";
import { notifications as enNotifications } from "./en/notifications";
import { settings as enSettings } from "./en/settings";
import { designSystem as enDesignSystem } from "./en/designSystem";
import { finance as enFinance } from "./en/finance";
import { calendar as enCalendar } from "./en/calendar";

const fa = {
  common: faCommon,
  nav: faNav,
  auth: faAuth,
  panel: faPanel,
  site: faSite,
  projects: faProjects,
  clients: faClients,
  contracts: faContracts,
  time: faTime,
  tasks: faTasks,
  notifications: faNotifications,
  settings: faSettings,
  designSystem: faDesignSystem,
  finance: faFinance,
  calendar: faCalendar,
};

type Source = typeof fa;
export type Messages = { [N in keyof Source]: Record<keyof Source[N], string> };
export type Namespace = keyof Messages;

const en: Messages = {
  common: enCommon,
  nav: enNav,
  auth: enAuth,
  panel: enPanel,
  site: enSite,
  projects: enProjects,
  clients: enClients,
  contracts: enContracts,
  time: enTime,
  tasks: enTasks,
  notifications: enNotifications,
  settings: enSettings,
  designSystem: enDesignSystem,
  finance: enFinance,
  calendar: enCalendar,
};

export const messages: Record<Locale, Messages> = { fa, en };
