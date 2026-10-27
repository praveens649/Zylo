# Cool GameStore (DoodleBlue 4)

A full-stack game membership and booking platform built with a Next.js frontend and NestJS API. The application supports game discovery, membership plans, subscriptions, bookings, payments, reporting, testimonials, and user management.

## Features

### Customer experience

- Public landing page
- User registration and login
- Authenticated application shell and dashboard
- Game catalog and game browsing
- Membership plan discovery
- Monthly and yearly membership billing options
- Stripe Checkout for membership purchases
- Subscription status and account subscription details
- Checkout-session verification after returning from Stripe
- Booking management
- Calendar-based scheduling and booking views
- Payment history and payment detail views
- User profile and account management
- Toast notifications and responsive interface

### Administration

- User management
- Game catalog management
- Membership plan management
- Subscription management
- Booking management
- Payment history and payment lookup
- Reports and operational insights
- Testimonials management
- Dashboard views
- Role-protected authenticated areas
- Catalog seed support for initial game data
- Super-admin seed support

### Payments and subscriptions

- Stripe payment integration
- Stripe product and recurring price provisioning for membership plans
- Monthly and yearly recurring prices
- Server-side membership-plan and billing-interval resolution
- Stripe Checkout session creation
- Checkout-session verification
- Subscription synchronization between Stripe and the application database
- Subscription status lookup for the current user
- Payment history for customers and administrative users
- Stripe webhook signature verification
- Webhook processing for:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Automatic subscription updates from Stripe webhook events
- Stripe price and product archiving when plans are deactivated or removed
- Stripe CLI forwarding support for local webhook development

> Stripe secret keys and webhook secrets must be configured through environment variables. Never commit live credentials to the repository.

## Technology Stack

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- TanStack Query
- TanStack Table
- React Hook Form
- Zod validation
- Radix UI primitives
- Lucide icons
- Three.js

### Backend

- NestJS 12
- Express
- PostgreSQL
- Prisma 7 with the PostgreSQL driver adapter
- Stripe SDK
- JWT and authenticated route guards
- Redis via `ioredis`
- `bcryptjs` password hashing
- Multer file uploads
- Resend email integration
- Vitest testing
- Oxlint and Prettier

## Repository Structure

```text
.
├── Client/                         # Next.js frontend
│   ├── app/                        # App Router routes and layouts
│   │   ├── landingpage/            # Public landing page
│   │   ├── login/                  # Login flow
│   │   ├── signup/                 # Registration flow
│   │   └── (mainapp)/              # Authenticated application routes
│   │       ├── bookings/           # Booking management
│   │       ├── calendar/           # Calendar and scheduling
│   │       ├── dashboard/          # Dashboard
│   │       ├── games/              # Game catalog
│   │       ├── payments/           # Payment history
│   │       ├── plans/              # Membership plans
│   │       ├── reports/            # Reports
│   │       ├── subscription/       # Subscription management
│   │       ├── testimonials/       # Testimonials
│   │       └── users/              # User management
│   ├── components/                 # Shared UI components
│   ├── hooks/                      # Reusable React hooks
│   ├── lib/                        # Client utilities and API helpers
│   └── public/                     # Static assets
├── Server/                         # NestJS backend
│   ├── prisma/                     # Prisma schema and migrations
│   ├── scripts/                    # Seed scripts
│   └── src/
│       ├── auth/                   # Authentication and guards
│       ├── bookings/               # Booking APIs and services
│       ├── games/                  # Game catalog APIs
│       ├── membership-plans/       # Membership plan APIs
│       ├── payments/               # Payment history APIs
│       ├── reports/                # Reporting APIs
│       ├── stripe/                 # Stripe checkout and webhooks
│       ├── testimonials/           # Testimonial APIs
│       ├── users/                  # User APIs
│       ├── redis/                  # Redis integration
│       ├── mail/                   # Email services
│       └── storage/                # File storage and uploads
├── package.json                    # Workspace-level scripts
├── pnpm-workspace.yaml             # pnpm workspace configuration
└── pnpm-lock.yaml                  # Locked dependency versions
```

## Prerequisites

- Node.js
- pnpm
- PostgreSQL
- Redis, if required by the configured application services
- Stripe account and Stripe CLI for local webhook testing

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Sankar-web-dev/doodleblue4.git
cd doodleblue4
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure the backend

Create a local environment file:

```bash
cp Server/.env.example Server/.env
```

Configure the database, application URLs, authentication settings, and seed credentials in `Server/.env`.

For Stripe, configure the variables used by the backend, including:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLAN_CURRENCY=usd
```

Use Stripe test-mode keys for local development. The exact environment variable names should match the server Stripe configuration.

### 4. Initialize the database

```bash
pnpm --filter ./Server prisma db push
pnpm --filter ./Server seed
pnpm --filter ./Server seed:catalog
```

The seed commands create the initial super-admin account and catalog data where applicable.

### 5. Start the development servers

Run the frontend and backend in separate terminals:

```bash
# Terminal 1
pnpm client

# Terminal 2
pnpm server
```

The default local URLs are:

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

The frontend proxies API requests to the backend through its Next.js rewrite configuration.

## Stripe Local Development

Install and authenticate the [Stripe CLI](https://docs.stripe.com/stripe-cli), then forward Stripe events to the backend webhook endpoint:

```bash
pnpm stripe
```

For the standard forwarding mode:

```bash
pnpm og-stripe
```

The webhook endpoint is:

```text
POST /api/v1/stripe/webhook
```

The webhook handler validates the `stripe-signature` header against the raw request body before processing events. Use the webhook signing secret printed by the Stripe CLI as `STRIPE_WEBHOOK_SECRET`.

## Important API Routes

### Authentication

- `POST /api/v1/auth/login` — authenticate a user
- `POST /api/v1/auth/logout` — terminate the current session
- `GET /api/v1/auth/me` — retrieve the current user

### Memberships and Stripe

- `GET /api/v1/subscriptions/plans` — list public membership plans
- `POST /api/v1/subscriptions/checkout` — create a Stripe membership checkout session
- `GET /api/v1/subscriptions/me` — retrieve the current user's subscription
- `POST /api/v1/subscriptions/verify?session_id=<id>` — verify a completed checkout session
- `POST /api/v1/stripe/webhook` — receive and process Stripe events

### Payments

- `GET /api/v1/payments` — list payments according to the authenticated user's permissions
- `GET /api/v1/payments/:id` — retrieve a payment by ID

Additional routes are provided by the bookings, games, membership-plans, reports, testimonials, users, and storage modules.

## Available Scripts

Run these commands from the repository root:

| Command | Description |
| --- | --- |
| `pnpm install` | Install all workspace dependencies |
| `pnpm client` | Start the Next.js development server |
| `pnpm server` | Start the NestJS development server |
| `pnpm stripe` | Forward Stripe snapshot events to the webhook endpoint |
| `pnpm og-stripe` | Forward Stripe events to the webhook endpoint |
| `pnpm lint` | Lint the client and server packages |

Client commands:

```bash
pnpm --filter ./Client dev
pnpm --filter ./Client build
pnpm --filter ./Client start
pnpm --filter ./Client lint
```

Server commands:

```bash
pnpm --filter ./Server start:dev
pnpm --filter ./Server build
pnpm --filter ./Server test
pnpm --filter ./Server test:watch
pnpm --filter ./Server lint
pnpm --filter ./Server format
pnpm --filter ./Server seed
pnpm --filter ./Server seed:catalog
```

## Security Notes

- Keep `Server/.env` out of version control.
- Use Stripe test keys during development.
- Do not expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the frontend.
- Always validate Stripe webhook signatures.
- Use HTTPS and secure cookie settings in production.
- Rotate compromised API keys immediately.

## Testing

Run the backend test suite with:

```bash
pnpm --filter ./Server test
```

Run linting across the workspace with:

```bash
pnpm lint
```

## License

The repository currently does not declare a public open-source license. Contact the repository owner before redistributing or using the code outside the project.
