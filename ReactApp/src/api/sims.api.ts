import { api } from "@/lib/api";

/* Admin SIM overview types — mirrors the server mock payload (and the
   intended real shape: Sim + user + phoneNumber + active plan). */

export type SimCategory = "PERSONAL" | "BUSINESS";
export type SimTechnology = "PHYSICAL" | "ESIM";
export type SimStatus =
  | "PENDING_ACTIVATION"
  | "READY_TO_INSTALL"
  | "ACTIVE"
  | "GRACE_PERIOD"
  | "PARKED"
  | "SUSPENDED"
  | "DEACTIVATED"
  | "CANCELLED";

export interface AdminSim {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  phoneNumber: {
    id: string;
    number: string;
    prefix: string | null;
    type: "STANDARD" | "PREMIUM";
  } | null;
  category: SimCategory;
  technology: SimTechnology;
  status: SimStatus;
  destinationCountry: string | null;
  reference: string | null;
  activatedAt: string | null;
  planExpiredAt: string | null;
  activePlan: {
    id: string;
    name: string;
    type: "PREPAID" | "POSTPAID" | "BUSINESS" | "VALIDITY_ONLY";
    price: string;
    validityDays: number;
    dataAllowanceGb: string | null;
  } | null;
  organization: { id: string; name: string } | null;
  createdAt: string;
}

export const simsApi = {
  /** Admin-only: every purchased SIM with owner + plan details. */
  getSims: () => api.get<{ sims: AdminSim[] }>("/api/v1/sims"),
};
