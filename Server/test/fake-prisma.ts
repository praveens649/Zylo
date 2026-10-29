/**
 * Minimal in-memory stand-in for PrismaService, just rich enough for the
 * Set-Top Box flow tests. Supports scalar equality plus { in, lt, lte, gt, gte, not } filters.
 */
type Rec = Record<string, any>;

function matchValue(actual: any, cond: any): boolean {
  if (cond instanceof Date) {
    return actual instanceof Date && actual.getTime() === cond.getTime();
  }
  if (cond !== null && typeof cond === 'object') {
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

/** Expand compound-unique where keys (e.g. simId_cycleDate) to plain fields. */
function flattenWhere(where: Rec = {}): Rec {
  const flat: Rec = {};
  for (const [k, v] of Object.entries(where)) {
    if (
      v !== null &&
      typeof v === 'object' &&
      !(v instanceof Date) &&
      !Object.keys(v).some((op) =>
        ['in', 'notIn', 'lt', 'lte', 'gt', 'gte', 'not'].includes(op),
      )
    ) {
      Object.assign(flat, flattenWhere(v));
    } else {
      flat[k] = v;
    }
  }
  return flat;
}

/** Apply update data, resolving { increment } / { decrement } wrappers. */
function applyData(rec: Rec, data: Rec) {
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
      if ('increment' in v) {
        rec[k] = (rec[k] ?? 0) + v.increment;
        continue;
      }
      if ('decrement' in v) {
        rec[k] = (rec[k] ?? 0) - v.decrement;
        continue;
      }
      if ('set' in v) {
        rec[k] = v.set;
        continue;
      }
    }
    rec[k] = v;
  }
  return rec;
}

function matches(rec: Rec, where: Rec = {}): boolean {
  return Object.entries(flattenWhere(where)).every(([k, v]) =>
    matchValue(rec[k], v),
  );
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
    findMany: async ({ where, orderBy }: any = {}) => {
      let list = rows.filter((r) => matches(r, where));
      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0] as [string, string];
        list = [...list].sort((a, b) => {
          const av = a[field] instanceof Date ? a[field].getTime() : a[field];
          const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
          return dir === 'desc' ? bv - av : av - bv;
        });
      }
      return list.map(decorate);
    },
    count: async ({ where }: any = {}) => rows.filter((r) => matches(r, where)).length,
    create: async ({ data }: any) => {
      const r = { id: `id-${++seq}`, createdAt: ++seq, ...data };
      rows.push(r);
      return r;
    },
    update: async ({ where, data }: any) => {
      const r = find(where);
      if (!r) throw Object.assign(new Error('not found'), { code: 'P2025' });
      return applyData(r, data);
    },
    updateMany: async ({ where, data }: any) => {
      const hit = rows.filter((r) => matches(r, where));
      hit.forEach((r) => applyData(r, data));
      return { count: hit.length };
    },
    upsert: async ({ where, create, update }: any) => {
      const r = find(where);
      if (r) return applyData(r, update);
      const row = { id: `id-${++seq}`, createdAt: ++seq, ...create };
      rows.push(row);
      return row;
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
    // Data Loan + friends
    user: createTable(seed.user),
    sim: createTable(seed.sim),
    plan: createTable(seed.plan),
    planSubscription: createTable(seed.planSubscription),
    dataBankAccount: createTable(seed.dataBankAccount),
    dataBankTransaction: createTable(seed.dataBankTransaction),
    dataLoan: createTable(seed.dataLoan),
    dataLoanTransaction: createTable(seed.dataLoanTransaction),
    dailyDataUsage: createTable(seed.dailyDataUsage),
  };

  // Emulate the DB-level rules the fake can't express declaratively.
  const OPEN = ['ACTIVE', 'PARTIALLY_REPAID', 'DUE'];
  const p2002 = () =>
    Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
  const loanCreate = fake.dataLoan.create;
  fake.dataLoan.create = async (args: any) => {
    const status = args.data.status ?? 'ACTIVE';
    if (
      OPEN.includes(status) &&
      fake.dataLoan.rows.some(
        (r: Rec) => r.simId === args.data.simId && OPEN.includes(r.status),
      )
    ) {
      throw p2002(); // one_open_loan_per_sim partial index
    }
    return loanCreate(args);
  };
  for (const table of [fake.dataLoanTransaction, fake.dataBankTransaction]) {
    const create = table.create;
    table.create = async (args: any) => {
      const ref = args.data.reference;
      if (ref && table.rows.some((r: Rec) => r.reference === ref)) {
        throw p2002(); // reference @unique
      }
      return create(args);
    };
  }

  fake.$transaction = async (cb: (tx: any) => Promise<any>) => cb(fake);
  // FOR UPDATE locks / raw selects are no-ops in the fake.
  fake.$queryRaw = async () => [];
  return fake;
}
