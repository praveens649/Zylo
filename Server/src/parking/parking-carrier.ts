import { Injectable, Logger } from '@nestjs/common';

export interface CarrierEligibilityResult {
  eligible: boolean;
  reason?: string;
  /**
   * True when no carrier API is configured and the verdict came from local
   * database checks only — the caller can surface this as a demo boundary.
   */
  simulated: boolean;
}

/**
 * Telecom/carrier integration point for number parking.
 *
 * Configuration needed for a real integration:
 *   ZYLO_CARRIER_API_URL — base URL of the carrier eligibility service
 *   ZYLO_CARRIER_API_KEY — optional bearer token
 *
 * Expected contract: POST {url}/parking/eligibility { number } →
 * { eligible: boolean, reason?: string }.
 *
 * When the URL is not configured this client performs no network call and
 * reports `simulated: true` — parking decisions then rest entirely on the
 * local ownership/status checks, which is the documented demo boundary.
 */
@Injectable()
export class ParkingCarrierClient {
  private readonly logger = new Logger(ParkingCarrierClient.name);

  get isConfigured(): boolean {
    return Boolean(process.env.ZYLO_CARRIER_API_URL);
  }

  async checkParkable(number: string): Promise<CarrierEligibilityResult> {
    const base = process.env.ZYLO_CARRIER_API_URL?.replace(/\/+$/, '');
    if (!base) {
      return { eligible: true, simulated: true };
    }

    try {
      const res = await fetch(`${base}/parking/eligibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.ZYLO_CARRIER_API_KEY
            ? { Authorization: `Bearer ${process.env.ZYLO_CARRIER_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({ number }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        this.logger.warn(
          `Carrier eligibility check failed for ${number}: HTTP ${res.status}`,
        );
        return {
          eligible: false,
          reason: 'Eligibility check is unavailable — please try again later',
          simulated: false,
        };
      }

      const body = (await res.json()) as {
        eligible?: boolean;
        reason?: string;
      };
      return {
        eligible: Boolean(body.eligible),
        reason: body.reason,
        simulated: false,
      };
    } catch (err) {
      this.logger.warn(
        `Carrier eligibility check error for ${number}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        eligible: false,
        reason: 'Eligibility check is unavailable — please try again later',
        simulated: false,
      };
    }
  }
}
