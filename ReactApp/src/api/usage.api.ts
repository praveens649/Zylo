import { api } from "@/lib/api";

/* Data usage simulation — mirrors the server payload from
   POST/GET /api/v1/sims/:simId/usage */

export interface UsageStatus {
  allowanceMb: number;
  usedMb: number;
  /** MB from today's unused pool already moved into the Data Bank. */
  bankedMb: number;
  /** MB redeemed from the Data Bank back into today's usable pool. */
  redeemedMb: number;
  remainingMb: number;
  running: boolean;
  sessionStartedAt: string | null;
  simulatedRateMbPerSecond: number;
}

export interface UsageStartResult extends UsageStatus {
  sessionId: string;
}

export interface UsageStopResult extends Omit<UsageStatus, "sessionStartedAt"> {
  consumedThisSession: number;
  exhausted: boolean;
}

export const usageApi = {
  /** Current-day usage snapshot + live running-session status. */
  getStatus: (simId: string) =>
    api.get<UsageStatus>(`/api/v1/sims/${simId}/usage`),

  /** Start a simulated consumption session (100 MB/s demo rate). */
  start: (simId: string) =>
    api.post<UsageStartResult>(`/api/v1/sims/${simId}/usage/start`),

  /** Stop the running session and persist consumed data. */
  stop: (simId: string) =>
    api.post<UsageStopResult>(`/api/v1/sims/${simId}/usage/stop`),
};

export const usageStatusKey = (simId: string) =>
  ["usage", "status", simId] as const;
