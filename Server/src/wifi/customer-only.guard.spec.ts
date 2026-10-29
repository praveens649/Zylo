import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { CustomerOnlyGuard } from './customer-only.guard.js';

const ctx = (role: string) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) }) as unknown as ExecutionContext;

describe('CustomerOnlyGuard', () => {
  const guard = new CustomerOnlyGuard();

  it('lets customers through', () => {
    expect(guard.canActivate(ctx('CUSTOMER'))).toBe(true);
  });

  it('blocks admins from buying or paying', () => {
    expect(() => guard.canActivate(ctx('SUPER_ADMIN'))).toThrowError(/cannot place or pay/);
  });
});
