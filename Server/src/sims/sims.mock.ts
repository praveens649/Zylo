/**
 * Temporary mock data for the admin SIM-overview endpoint.
 *
 * Shaped exactly like the response the real implementation should return
 * once Sim / PhoneNumber / PlanSubscription records exist in the DB:
 *   Sim + user + phoneNumber + active plan subscription + plan
 */
export interface MockSimRecord {
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
    type: 'STANDARD' | 'PREMIUM';
  };
  category: 'PERSONAL' | 'BUSINESS';
  technology: 'PHYSICAL' | 'ESIM';
  status:
    | 'PENDING_ACTIVATION'
    | 'ACTIVE'
    | 'GRACE_PERIOD'
    | 'SUSPENDED'
    | 'DEACTIVATED'
    | 'CANCELLED';
  activatedAt: string | null;
  planExpiredAt: string | null;
  activePlan: {
    id: string;
    name: string;
    type: 'PREPAID' | 'POSTPAID' | 'BUSINESS' | 'VALIDITY_ONLY';
    price: string;
    validityDays: number;
    dataAllowanceGb: string | null;
  } | null;
  organization: { id: string; name: string } | null;
  createdAt: string;
}

export const MOCK_SIMS: MockSimRecord[] = [
  {
    id: 'sim-0001-a1b2-c3d4-e5f6-000000000001',
    user: {
      id: 'usr-1a2b3c4d-0001',
      name: 'Rishigowtham A C',
      email: '2316126@saec.ac.in',
    },
    phoneNumber: {
      id: 'phn-0001',
      number: '+91 98410 23456',
      prefix: '9841',
      type: 'STANDARD',
    },
    category: 'PERSONAL',
    technology: 'ESIM',
    status: 'ACTIVE',
    activatedAt: '2026-09-14T09:20:00.000Z',
    planExpiredAt: '2026-11-08T09:20:00.000Z',
    activePlan: {
      id: 'pln-basic-28',
      name: 'Zylo Basic 28',
      type: 'PREPAID',
      price: '199.00',
      validityDays: 28,
      dataAllowanceGb: '1.50',
    },
    organization: null,
    createdAt: '2026-09-10T11:05:00.000Z',
  },
  {
    id: 'sim-0002-a1b2-c3d4-e5f6-000000000002',
    user: {
      id: 'usr-1a2b3c4d-0002',
      name: 'Priya Sharma',
      email: 'priya.sharma@gmail.com',
    },
    phoneNumber: {
      id: 'phn-0002',
      number: '+91 90030 11234',
      prefix: '9003',
      type: 'STANDARD',
    },
    category: 'PERSONAL',
    technology: 'PHYSICAL',
    status: 'ACTIVE',
    activatedAt: '2026-10-02T15:40:00.000Z',
    planExpiredAt: '2026-10-30T15:40:00.000Z',
    activePlan: {
      id: 'pln-plus-28',
      name: 'Zylo Plus 28',
      type: 'PREPAID',
      price: '299.00',
      validityDays: 28,
      dataAllowanceGb: '2.00',
    },
    organization: null,
    createdAt: '2026-09-28T10:12:00.000Z',
  },
  {
    id: 'sim-0003-a1b2-c3d4-e5f6-000000000003',
    user: {
      id: 'usr-1a2b3c4d-0003',
      name: 'Arun Kumar S',
      email: 'arun.kumar@techcorp.in',
    },
    phoneNumber: {
      id: 'phn-0003',
      number: '+91 70102 44556',
      prefix: '7010',
      type: 'PREMIUM',
    },
    category: 'BUSINESS',
    technology: 'ESIM',
    status: 'ACTIVE',
    activatedAt: '2026-08-21T08:00:00.000Z',
    planExpiredAt: '2026-11-19T08:00:00.000Z',
    activePlan: {
      id: 'pln-biz-56',
      name: 'Zylo Business 56',
      type: 'BUSINESS',
      price: '899.00',
      validityDays: 56,
      dataAllowanceGb: '100.00',
    },
    organization: { id: 'org-0001', name: 'TechCorp Solutions' },
    createdAt: '2026-08-18T09:30:00.000Z',
  },
  {
    id: 'sim-0004-a1b2-c3d4-e5f6-000000000004',
    user: {
      id: 'usr-1a2b3c4d-0004',
      name: 'Divya R',
      email: 'divya.r@outlook.com',
    },
    phoneNumber: {
      id: 'phn-0004',
      number: '+91 63820 77890',
      prefix: '6382',
      type: 'STANDARD',
    },
    category: 'PERSONAL',
    technology: 'PHYSICAL',
    status: 'PENDING_ACTIVATION',
    activatedAt: null,
    planExpiredAt: null,
    activePlan: null,
    organization: null,
    createdAt: '2026-10-25T14:22:00.000Z',
  },
  {
    id: 'sim-0005-a1b2-c3d4-e5f6-000000000005',
    user: {
      id: 'usr-1a2b3c4d-0005',
      name: 'Mohammed Faisal',
      email: 'm.faisal@techcorp.in',
    },
    phoneNumber: {
      id: 'phn-0005',
      number: '+91 95001 66554',
      prefix: '9500',
      type: 'STANDARD',
    },
    category: 'BUSINESS',
    technology: 'ESIM',
    status: 'GRACE_PERIOD',
    activatedAt: '2026-07-30T06:45:00.000Z',
    planExpiredAt: '2026-10-24T06:45:00.000Z',
    activePlan: {
      id: 'pln-biz-56',
      name: 'Zylo Business 56',
      type: 'BUSINESS',
      price: '899.00',
      validityDays: 56,
      dataAllowanceGb: '100.00',
    },
    organization: { id: 'org-0001', name: 'TechCorp Solutions' },
    createdAt: '2026-07-27T16:50:00.000Z',
  },
  {
    id: 'sim-0006-a1b2-c3d4-e5f6-000000000006',
    user: {
      id: 'usr-1a2b3c4d-0006',
      name: 'Sneha Patel',
      email: 'sneha.p@gmail.com',
    },
    phoneNumber: {
      id: 'phn-0006',
      number: '+91 82209 34567',
      prefix: '8220',
      type: 'PREMIUM',
    },
    category: 'PERSONAL',
    technology: 'PHYSICAL',
    status: 'SUSPENDED',
    activatedAt: '2026-06-11T13:15:00.000Z',
    planExpiredAt: '2026-09-09T13:15:00.000Z',
    activePlan: {
      id: 'pln-basic-28',
      name: 'Zylo Basic 28',
      type: 'PREPAID',
      price: '199.00',
      validityDays: 28,
      dataAllowanceGb: '1.50',
    },
    organization: null,
    createdAt: '2026-06-08T12:00:00.000Z',
  },
];
