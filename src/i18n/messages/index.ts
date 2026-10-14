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
import { vault as faVault } from "./fa/vault";
import { docs as faDocs } from "./fa/docs";
import { auth as enAuth } from "./en/auth";
import { common as enCommon } from "./en/common";
import { nav as enNav } from "./en/nav";
import { panel as enPanel } from "./en/panel";
import { site as enSite } from "./en/site";
import { projects as enProjects } from "./en/projects";
import { clients as enClients } from "./en/clients";
import { vault as enVault } from "./en/vault";
import { docs as enDocs } from "./en/docs";

const fa = {
  common: faCommon,
  nav: faNav,
  auth: faAuth,
  panel: faPanel,
  site: faSite,
  projects: faProjects,
  clients: faClients,
  vault: faVault,
  docs: faDocs,
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
  vault: enVault,
  docs: enDocs,
};

export const messages: Record<Locale, Messages> = { fa, en };
