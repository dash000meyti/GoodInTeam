import {
  BanknoteIcon,
  BitcoinIcon,
  CircleDollarSignIcon,
  CreditCardIcon,
  LandmarkIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import type { accountKinds } from "@/server/db/schema/finance";

/** Icon per account kind (shared by server and client components). */
export const accountKindIcons: Record<(typeof accountKinds)[number], LucideIcon> = {
  bank: LandmarkIcon,
  cash: BanknoteIcon,
  card: CreditCardIcon,
  crypto: BitcoinIcon,
  wallet: WalletIcon,
  other: CircleDollarSignIcon,
};
