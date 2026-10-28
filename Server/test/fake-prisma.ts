/**
 * Minimal in-memory stand-in for PrismaService, just rich enough for the
 * Set-Top Box flow tests. Supports scalar equality plus { in, lt, lte, gt, gte, not } filters.
 */
type Rec = Record<string, any>;

function matchValue(actual: any, cond: any): boolean {
  if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, v]) => {
      switch (op) {
        case 'in': return (v as any[]).includes(actual);
        case 'notIn': return !(v as any[]).includes(actual);
        case 'lt': return actual != null && actual < (v as any);
        case 'lte': return actual != null && actual <= (v as any);
        case 'gt': return actual != null && actual > (v as any);
        case 'gte': return actual != null && actual >= (v as any);
        case 'not': return actual !== v;
        default: return true;
      }
    });
  }
  return actual === cond;
}

function matches(rec: Rec, where: Rec = {}): boolean {
  return Object.entries(where).every(([k, v]) => matchValue(rec[k], v));
}

let seq = 0;

export function createTable(rows: Rec[] = [], decorate: (r: Rec) => Rec = (r) => r) {
  const find = (where: Rec) => rows.find((r) => matches(r, where));
  return {
    rows,
    findUnique: async ({ where }: any) => { const r = find(where); return r ? decorate(r) : null; },
    findFirst: async ({ where, orderBy }: any = {}) => {
      let list = rows.filter((r) => matches(r, where));
      if (orderBy?.createdAt === 'asc') list = [...list].sort((a, b) => a.createdAt - b.createdAt);
      const r = list[0];
      return r ? decorate(r) : null;
    },
    findMany: async ({ where }: any = {}) => rows.filter((r) => matches(r, where)).map(decorate),
    count: async ({ where }: any = {}) => rows.filter((r) => matches(r, where)).length,
    create: async ({ data }: any) => {
      const r = { id: `id-${++seq}`, createdAt: ++seq, ...data };
      rows.push(r);
      return r;
    },
    update: async ({ where, data }: any) => {
      const r = find(where);
      if (!r) throw Object.assign(new Error('not found'), { code: 'P2025' });
      Object.assign(r, data);
      return r;
    },
    updateMany: async ({ where, data }: any) => {
      const hit = rows.filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    },
  };
}

export function createFakePrisma(seed: Partial<Record<string, Rec[]>> = {}) {
  const plans = seed.tvPlan ?? [];
  const tvSubscription = createTable(seed.tvSubscription ?? [], (s) => ({
    ...s,
    tvPlan: plans.find((p) => p.id === s.tvPlanId),
  }));
  const fake: any = {
    order: createTable(seed.order),
    tvPlan: createTable(plans),
    tvSubscription,
    setTopBoxConnection: createTable(seed.setTopBoxConnection, (c) => ({
      ...c,
      model: { id: c.modelId },
      unit: null,
      subscriptions: tvSubscription.rows
        .filter((s) => s.connectionId === c.id)
        .map((s) => ({ ...s, tvPlan: plans.find((p) => p.id === s.tvPlanId) })),
      installations: [],
    })),
    setTopBoxUnit: createTable(seed.setTopBoxUnit),
    installationRequest: createTable(seed.installationRequest),
    notification: createTable(seed.notification),
  };
  fake.$transaction = async (cb: (tx: any) => Promise<any>) => cb(fake);
  return fake;
}
