import {
  BotIcon,
  BrainCircuitIcon,
  CodeIcon,
  CompassIcon,
  GaugeIcon,
  GlobeIcon,
  LayoutTemplateIcon,
  MegaphoneIcon,
  PaletteIcon,
  RocketIcon,
  SearchIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  SparklesIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";

/** Icons selectable for services in the CMS (`posts.meta.icon`). */
export const serviceIcons: Record<string, LucideIcon> = {
  globe: GlobeIcon,
  smartphone: SmartphoneIcon,
  bot: BotIcon,
  compass: CompassIcon,
  code: CodeIcon,
  palette: PaletteIcon,
  rocket: RocketIcon,
  workflow: WorkflowIcon,
  brain: BrainCircuitIcon,
  server: ServerIcon,
  shield: ShieldCheckIcon,
  gauge: GaugeIcon,
  search: SearchIcon,
  shop: ShoppingBagIcon,
  layout: LayoutTemplateIcon,
  megaphone: MegaphoneIcon,
  sparkles: SparklesIcon,
};

export const serviceIconNames = Object.keys(serviceIcons);

export function ServiceIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && serviceIcons[name]) || SparklesIcon;
  return <Icon className={className} aria-hidden />;
}
