# Gym Owner Onboarding Implementation Plan

Introduce a multi-step onboarding flow for new gym owners. This forces new sign-ups to complete basic setup (Gym Name, First Membership Plan) before accessing the application dashboard, ensuring data integrity and a smooth first experience.

## User Review Required

> [!IMPORTANT]
> **Data Collection Scope:** The onboarding currently collects `gymName` and sets up the first Membership Plan pricing. We are intentionally deferring the collection of `gymAddress` or `gymPhone` to a future settings page to keep the onboarding smooth.
> 
> **Existing Users:** When deployed, existing owners will have `onboardingComplete` defaulted to `false`, forcing them to quickly fill out the onboarding once. Since there are no real users yet, this is fine.

## Open Questions

> [!WARNING]
> **Plan Name in Step 2:** The UI design for Step 2 does not ask the user for a "Plan Name" (e.g. "Standard"). Should we auto-generate the first plan name as "Standard Plan" under the hood?

## Proposed Changes

### Database & Authentication

#### [MODIFY] prisma/schema.prisma
- Add `gymName String?` and `onboardingComplete Boolean @default(false)` to the `AdminUser` model.

#### [MODIFY] src/lib/auth-cache.ts
- Update `CachedOwner` interface to include `onboardingComplete` and `gymName`.

#### [MODIFY] src/lib/auth.ts
- Fetch `onboardingComplete` and `gymName` on token generation.
- Inject these fields into the JWT token and `session.user` so they are immediately available to the frontend without extra DB calls.

#### [MODIFY] src/types/next-auth.d.ts
- Update the NextAuth types to include the new fields on the User/Session objects.

---

### Routing & Protection

#### [MODIFY] src/app/owner/(protected)/layout.tsx
- Check `session.user.onboardingComplete`. If `false`, redirect the user to `/owner/onboarding`.

#### [NEW] src/app/owner/onboarding/layout.tsx
- Create a new barebones layout without the sidebars/navbars.
- Check `session.user.onboardingComplete`. If `true`, redirect the user to `/owner/dashboard`.

---

### Onboarding UI & API

#### [NEW] src/app/owner/onboarding/page.tsx
- A client-side, multi-step wizard component featuring:
  - **Animation & calm/trust vibe:**
    - Transitions between steps: horizontal slide (translateX, ~300ms, ease-out).
    - Progress indicator: a thin top bar 2-dot indicator that fills smoothly.
    - Field focus states: soft, gentle border-color transition (200ms) and subtle shadow lift.
    - Submit/loading state: simple pulsing dot or soft spinner (minimum 400-600ms).
    - Success state: single checkmark that draws in via SVG stroke animation (~500ms).
  - **Step 1: Gym Name**
    - Store icon in a circle.
    - Title: "What should we call your gym?"
    - Subtitle: "This is how members and staff will see it across GymTrack."
    - Input: Label "Gym name", Placeholder "e.g. Iron Pulse Fitness"
    - Button: "Let's go"
  - **Step 2: Pricing**
    - Rupee icon in a circle.
    - Title: "Set your membership pricing"
    - Subtitle: "Set a monthly price to start. You can add other durations any time from settings."
    - Input: "Monthly price" with Rupee symbol prefix.
    - Expandable section ("Add more durations v") revealing optional inputs for "3 months", "6 months", and "12 months".
    - Button: "Set up my gym"

#### [NEW] src/app/api/owner/onboarding/route.ts
- POST endpoint that accepts the gym name and plan pricing details.
- Executes a Prisma transaction:
  1. Updates the `AdminUser` to set `gymName` and `onboardingComplete = true`.
  2. Creates the initial `GymMembershipPlan` and `GymMembershipPlanDurationPrice` records.
- Calls `invalidateCachedOwner` so the session immediately updates on the next page load.

## Verification Plan

### Automated Tests
- Run `tsc` to verify type checking ensures the updated `session.user` types are sound.
- Run `prisma format` and `prisma generate` to verify schema changes.

### Manual Verification
- **New User Flow:** Create a brand new account and verify we are forced into the onboarding screen. Complete the flow and verify redirection to the dashboard.
- **Protection Check:** Try navigating to `/owner/dashboard` while onboarding is incomplete (should redirect to onboarding). Try navigating to `/owner/onboarding` when onboarding is complete (should redirect to dashboard).
- **Data Verification:** Ensure the `gymName` and initial plan appear correctly on the dashboard and pricing pages after onboarding.
