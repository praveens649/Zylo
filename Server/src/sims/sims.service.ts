import { Injectable } from '@nestjs/common';

import { MOCK_SIMS, type MockSimRecord } from './sims.mock.js';

@Injectable()
export class SimsService {
  /**
   * SIM overview for the admin console.
   *
   * Currently returns mock data shaped like the real query — once SIM
   * purchases exist, replace this with a Prisma query on `sim` including
   * `user`, `phoneNumber`, `organization`, and the ACTIVE plan
   * subscription's `plan`.
   */
  async listSims(): Promise<MockSimRecord[]> {
    return MOCK_SIMS;
  }
}
