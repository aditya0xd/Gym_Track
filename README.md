# GymTrack Pro

GymTrack Pro is a multi-role gym management app built with Next.js, React, Prisma, PostgreSQL, and NextAuth. It gives gym owners a focused operations dashboard for member management, renewals, pricing, reminders, analytics, and billing, while a platform superadmin can manage gym owners and platform pricing from a separate admin area.

The app is designed around two roles:

- `gym_owner`: manages members, pricing, reminders, analytics, and subscription invoices
- `superadmin`: manages gym owners, plan pricing, and subscription lifecycle controls

## Highlights

- Shared login flow for gym owners and superadmin users
- Gym owner signup flow with credential-based authentication
- Member enrollment and member detail management
- Billing duration pricing for 1, 3, 6, and 12 month plans
- Dashboard metrics for active, expiring, and expired members
- Revenue-at-risk and revenue-lost visibility
- Reminder logging and Twilio-based SMS/WhatsApp notifications
- Owner analytics dashboard for retention, churn, payments, and revenue insights
- Subscription plan management with invoice history
- Razorpay checkout for owner subscription payments
- PDF receipt download support for invoices
- PWA manifest and service worker registration for installable app behavior

## Tech Stack

- Next.js `16.2.1`
- React `19`
- TypeScript
- Prisma `7`
- PostgreSQL
- NextAuth with credentials provider
- Tailwind CSS `4`
- shadcn/ui style components
- Twilio for reminders
- Razorpay for subscription payments
- `pdf-lib` for receipt generation
- Recharts for analytics visualizations

## Main Product Areas

### Gym owner portal

- Dashboard with quick metrics and recent members
- Members explorer with status filters: all, active, expiring, expired
- New member enrollment flow
- Custom duration pricing management
- Analytics dashboard
- Subscription plan upgrade or downgrade flow
- Invoice listing, payment, and receipt download

### Superadmin portal

- Gym owner management
- Platform pricing management
- Trial and subscription oversight

## Authentication

Authentication uses NextAuth with a credentials provider.

- Superadmin users are stored in `SuperAdminUser`
- Gym owners are stored in `AdminUser`
- Sessions use JWT strategy
- `remember me` extends session lifetime compared to the default session

## Database Model Overview

Core Prisma models:

- `AdminUser`: gym owner tenant account
- `SuperAdminUser`: platform operator account
- `Member`: gym member linked to a gym owner
- `ReminderLog`: outbound reminder history
- `GymOwnerDurationPrice`: owner-defined plan pricing by duration
- `PlatformPlanPrice`: platform-level pricing for owner subscription plans
- `OwnerBillingInvoice`: owner subscription billing records

Enums cover:

- owner plans: `TRIAL`, `STARTER`, `PRO`
- member billing durations: `ONE_MONTH`, `THREE_MONTHS`, `SIX_MONTHS`, `TWELVE_MONTHS`
- reminder channels: `WHATSAPP`, `SMS`
- payment and invoice statuses

## Project Structure

```text
src/
  app/
    api/                      API routes for auth, members, analytics, pricing, billing
    owner/                    Gym owner pages
    superadmin/               Superadmin pages
    login/                    Shared login and signup entry
    offline/                  Offline fallback page
  components/
    gym-owner/                Owner dashboard and workflow UI
    superadmin/               Superadmin admin panels
    providers/                Session, toaster, PWA registration
    shared/                   Shared layout and page scaffolding
    ui/                       Reusable UI primitives
  lib/
    auth.ts                   NextAuth configuration
    prisma.ts                 Prisma client setup
    billing/                  Billing date helpers
    format/                   INR formatting helpers
  server/
    gym-owner/                Owner business logic services
    superadmin/               Superadmin business logic services
    integrations/             Twilio and Razorpay integrations
prisma/
  schema.prisma               Database schema
  seed.ts                     Seed data and demo users
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values you need.

```powershell
Copy-Item .env.example .env
```

Required or commonly used variables:

### Database

- `DATABASE_URL`: PostgreSQL connection string

### Authentication

- `NEXTAUTH_SECRET`: primary NextAuth secret
- `AUTH_SECRET`: fallback auth secret
- `NEXTAUTH_URL`: app base URL, usually `http://localhost:3000`
- `ACCESS_TOKEN_SECRET`: optional override
- `REFRESH_TOKEN_SECRET`: optional override

### Twilio

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_SMS_FROM`
- `TWILIO_WHATSAPP_FROM`
- `TWILIO_MESSAGING_SERVICE_SID`: optional alternative sender configuration

### Razorpay

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

### App

- `NEXT_PUBLIC_APP_NAME`

If Twilio or Razorpay values are missing, features tied to those providers will fail at runtime when invoked.

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create the environment file

```powershell
Copy-Item .env.example .env
```

Update the database and provider credentials in `.env`.

### 3. Run Prisma migrations

```bash
npx prisma migrate deploy
```

For a brand-new local database, `npx prisma migrate dev` is also a common option during development.

### 4. Seed demo data

```bash
npx prisma db seed
```

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Seeded Demo Accounts

The seed script creates demo users with password `GymPass123!`.

- Superadmin: `superadmin@gym.local`
- Gym owner: `seed-admin@gym.local`
- Gym owner: `demo.manager@gym.local`

These are intended for local development only.

## Available Scripts

- `npm run dev`: start the Next.js development server
- `npm run build`: deploy migrations, run seed, then create the production build
- `npm run start`: start the production server
- `npm run lint`: run ESLint

## Important Build Note

The current `build` script runs:

```bash
prisma migrate deploy && tsx prisma/seed.ts && next build
```

That means every production build also runs the seed script. This may be convenient for demo environments, but it is usually something to review carefully before deploying to production.

## Integrations

### Twilio reminders

The app can send renewal or payment reminders through:

- SMS
- WhatsApp

Reminder delivery status is tracked in `ReminderLog`.

### Razorpay billing

Gym owner subscription invoices can be paid through Razorpay checkout. The app:

- creates a Razorpay order
- opens checkout in the browser
- verifies the signature on completion
- stores payment details against the invoice
- supports receipt download

## Progressive Web App Support

The app includes:

- a web manifest at `src/app/manifest.ts`
- a service worker file at `public/sw.js`
- client-side service worker registration in `src/components/providers/PwaRegister.tsx`

The configured PWA start URL is `/login`.

## API Surface

Key route groups include:

- `src/app/api/auth/*`
- `src/app/api/owner/*`
- `src/app/api/superadmin/*`

These cover signup, authentication, members, analytics, pricing, reminders, billing, receipts, and superadmin management operations.

## Deployment Notes

- Use a PostgreSQL database accessible from the deployed environment
- Set strong auth secrets in production
- Configure valid Twilio and Razorpay credentials before enabling those flows
- Review whether seeding during `npm run build` is appropriate for your deployment target
- Set `NEXTAUTH_URL` to the final deployed base URL

## Repository Notes

- Prisma client output is generated into `src/generated/prisma`
- The app homepage redirects to `/login`
- The project uses App Router under `src/app`

## Status

This README now reflects the current project structure and feature set in the repository as of April 2, 2026.
