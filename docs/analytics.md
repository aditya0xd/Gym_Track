# Analytics Implementation Documentation

## Overview

The analytics system provides gym owners with comprehensive insights into their membership business, including member statistics, revenue trends, retention metrics, and revenue forecasting. The implementation is designed to be performant using SQL aggregation where possible and complex business logic where necessary.

## Architecture

### File Structure

- **Service Layer**: `src/server/gym-owner/analytics.service.ts` - Core analytics logic
- **API Layer**: `src/app/api/owner/analytics/route.ts` - REST endpoint
- **Client Layer**: 
  - `src/components/gym-owner/OwnerAnalyticsClient.tsx` - Data fetching with React Query
  - `src/components/gym-owner/OwnerAnalyticsDashboard.tsx` - Visualization components

### Data Flow

```
User Request → API Route → Analytics Service → Database Queries → Aggregated Data → JSON Response → Client → Dashboard Visualization
```

## Core Components

### 1. Analytics Service (`analytics.service.ts`)

The service is the heart of the analytics system, responsible for:

- **Summary Statistics**: Member counts, revenue aggregation
- **Retention Analysis**: Renewal rate and churn rate calculation
- **Payment Analytics**: Success, partial, and failure rates
- **Revenue Trends**: 6-month historical data
- **Revenue Forecasting**: 3-month predictive analytics
- **Insights Generation**: Actionable recommendations

#### Type Definitions

```typescript
type OwnerAnalytics = {
  summary: {
    totalMembers: number;
    activeMembers: number;
    pausedMembers: number;
    inactiveMembers: number;
    paidMembers: number;
    unpaidMembers: number;
    partialMembers: number;
    monthlyRevenue: number;
  };
  retention: {
    renewalRate: number;
    churnRate: number;
  };
  payments: {
    successRate: number;
    partialRate: number;
    failureRate: number;
  };
  trends: TrendPoint[];
  revenueForecast: {
    nextMonthCombined: number;
    nextQuarterCombined: number;
    months: RevenueForecastMonth[];
    assumptions: string[];
  };
  insights: string[];
};
```

### 2. Summary Statistics Calculation

Uses raw SQL aggregation for performance:

```sql
SELECT
  COUNT(*) as total_members,
  SUM(CASE WHEN "endDate" >= today AND "membershipStatus" = 'ACTIVE' THEN 1 ELSE 0 END) as active_members,
  SUM(CASE WHEN "membershipStatus" = 'PAUSED' THEN 1 ELSE 0 END) as paused_members,
  SUM(CASE WHEN "endDate" < today THEN 1 ELSE 0 END) as inactive_members,
  SUM(CASE WHEN "paymentStatus" = 'DONE' THEN 1 ELSE 0 END) as paid_members,
  SUM(CASE WHEN "paymentStatus" = 'NOT_DONE' THEN 1 ELSE 0 END) as unpaid_members,
  SUM(CASE WHEN "paymentStatus" = 'PARTIAL' THEN 1 ELSE 0 END) as partial_members,
  COALESCE((SELECT SUM(r."amountPaid")
    FROM "MembershipRenewal" r
    JOIN "Member" rm ON rm."id" = r."memberId"
    WHERE rm."deletedAt" IS NULL
      AND rm."adminUserId" = ?
      AND r."paidAt" >= current_month_start
      AND r."paidAt" < next_month_start), 0) as monthly_revenue
FROM "Member"
WHERE "deletedAt" IS NULL AND "adminUserId" = ?
```

**Key Points:**
- All aggregation done in database for performance
- Monthly revenue calculated from `MembershipRenewal` table (actual payments)
- Uses UTC dates for consistency across timezones

### 3. Revenue Trends (6-Month History)

Two separate queries for different metrics:

#### Revenue Trends
```sql
SELECT
  TO_CHAR(r."paidAt", 'YYYY-MM') as month_key,
  SUM(r."amountPaid") as revenue
FROM "MembershipRenewal" r
JOIN "Member" m ON m."id" = r."memberId"
WHERE m."deletedAt" IS NULL
  AND m."adminUserId" = ?
  AND r."paidAt" >= trend_start
  AND r."paidAt" < trend_end
GROUP BY TO_CHAR(r."paidAt", 'YYYY-MM')
```

#### Cohort Trends (Payment Status)
```sql
SELECT
  TO_CHAR(r."periodStart", 'YYYY-MM') as month_key,
  SUM(CASE WHEN r."paymentStatus" = 'DONE' THEN 1 ELSE 0 END) as count,
  SUM(CASE WHEN r."paymentStatus" = 'NOT_DONE' THEN 1 ELSE 0 END) as unpaid_count,
  SUM(CASE WHEN r."paymentStatus" = 'PARTIAL' THEN 1 ELSE 0 END) as partial_count
FROM "MembershipRenewal" r
JOIN "Member" m ON m."id" = r."memberId"
WHERE m."deletedAt" IS NULL
  AND m."adminUserId" = ?
  AND r."periodStart" >= trend_start
  AND r."periodStart" < trend_end
GROUP BY TO_CHAR(r."periodStart", 'YYYY-MM')
```

**Key Points:**
- Revenue trends use `paidAt` (when payment was received)
- Cohort trends use `periodStart` (when membership period begins)
- Data merged in application code to create unified trend points

### 4. Retention Analysis

The most complex part of the analytics system. It tracks member renewals across two methods:

#### Renewal Methods

1. **Inline Renewals** (New Method): Members extend their membership via `MembershipRenewal` records without creating new Member rows
2. **New Member Rows** (Legacy Method): Members create entirely new Member records when renewing

#### Renewal Tracking Logic (Fixed)

The current implementation uses a unified timeline model to avoid double-counting and ensure accurate renewal rate calculation:

```typescript
// Compute effective end dates and plan prices for all members (done once for DRY)
const effectiveEndDates = new Map<string, Date>();
const effectivePlanPrices = new Map<string, number>();

for (const member of members) {
  const paidRenewals = member.renewals.filter(r => r.paidAt && r.paymentStatus === "DONE");
  const latestRenewal = paidRenewals.length > 0
    ? paidRenewals.sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime())[0]
    : null;
  const effectiveEndDate = latestRenewal
    ? new Date(Math.max(member.endDate.getTime(), latestRenewal.periodEnd.getTime()))
    : member.endDate;
  const effectivePlanPrice = latestRenewal
    ? Number(latestRenewal.planPrice)
    : Number(member.planPrice);
  
  effectiveEndDates.set(member.id, effectiveEndDate);
  effectivePlanPrices.set(member.id, effectivePlanPrice);
}

// Build timeline of membership periods for each phone number
// This unifies inline renewals and legacy new-row renewals into one opportunity model
const periodsByPhone = new Map<string, Array<{ start: Date; end: Date; isRenewal: boolean; status: string }>>();

for (const member of members) {
  const key = member.phone.trim();
  const periods = periodsByPhone.get(key) ?? [];
  
  // Add the original member enrollment period (use member.endDate, not effective end date)
  periods.push({
    start: member.startDate,
    end: member.endDate,
    isRenewal: false,
    status: member.membershipStatus,
  });

  // Add all inline renewals as separate periods (only fully paid renewals)
  for (const renewal of member.renewals) {
    if (renewal.paidAt && renewal.paymentStatus === "DONE" && renewal.periodStart.getTime() !== member.startDate.getTime()) {
      periods.push({
        start: renewal.periodStart,
        end: renewal.periodEnd,
        isRenewal: true,
        status: member.membershipStatus,
      });
    }
  }

  periodsByPhone.set(key, periods);
}

// Sort periods by start date for each phone number
for (const periods of periodsByPhone.values()) {
  periods.sort((a, b) => a.start.getTime() - b.start.getTime());
}

let opportunities = 0;
let renewed = 0;

for (const periods of periodsByPhone.values()) {
  for (let i = 0; i < periods.length; i += 1) {
    const current = periods[i]!;
    const next = periods[i + 1];

    // Skip paused members - their clock is frozen, not a churn opportunity
    if (current.status === "PAUSED") {
      continue;
    }

    // A renewal opportunity exists when a period ends
    // (unless it's the current active period)
    if (current.end > today) {
      continue; // Still active, no churn opportunity yet
    }

    opportunities += 1;

    // Check if they renewed: look for a next period starting within 30 days
    if (next && next.start <= addDays(current.end, 30)) {
      renewed += 1;
    }
  }
}
const churned = Math.max(0, opportunities - renewed);
```

**Key Points:**
- Computes effective end dates once at the beginning (DRY principle)
- Groups members by phone number to track individuals
- Builds unified timeline of all periods (original + inline renewals)
- Original periods use `member.endDate` (not effective end date)
- Inline renewals added as separate periods with their own dates
- Effective end dates used for insights and revenue forecasting
- Only counts fully paid renewals (`paymentStatus === "DONE"`)
- Skips PAUSED members (their clock is frozen)
- 30-day grace period for renewals
- Active memberships don't count as churn opportunities yet
- Unifies both inline renewals and legacy new-row renewals into one model

**Bug Fixes Applied:**

1. **Bug #1 - Double-counting**: Fixed by using unified timeline model instead of separate counting for inline vs legacy renewals. Each renewal opportunity corresponds to an actual period ending, not to the renewal itself.

2. **Bug #2 - Member.endDate not updated**: Fixed by computing effective end dates from the latest renewal's `periodEnd` once at the beginning. These effective end dates are used for insights and revenue forecasting, while the timeline uses `member.endDate` for original periods to correctly identify renewal opportunities.

3. **Bug #3 - PAUSED members counted**: Fixed by skipping periods where `status === "PAUSED"`. Paused members have their clock frozen and should not count as churn opportunities.

4. **Bug #4 - PARTIAL payments counted**: Fixed by only counting renewals with `paymentStatus === "DONE"`. Partial payments are not considered completed renewals.

5. **Bug #5 - Revenue pipeline uses Member.endDate directly**: Fixed by computing effective end dates map and using it in `renewalPipelineForMonth` function. This ensures the renewal pipeline correctly identifies members whose memberships end in future months, accounting for inline renewals.

6. **Bug #6 - Insights use Member.endDate directly**: Fixed by using effective end dates map for stale member and expiring soon calculations. This ensures insights correctly identify members based on their actual renewal status.

7. **Bug #7 - Revenue pipeline uses member.planPrice**: Fixed by computing effective plan prices map from latest renewal's planPrice. This ensures the renewal pipeline uses the correct pricing for members who renewed at different prices.

8. **Refactoring - DRY Principle**: Moved effective end dates and plan prices computation to the beginning of the function, eliminating duplicate code and ensuring consistency across retention analysis, insights, and revenue forecasting.

#### Metrics Calculation

```typescript
const renewalRate = (renewed / opportunities) * 100;
const churnRate = ((opportunities - renewed) / opportunities) * 100;
```

### 5. Revenue Forecasting

Uses a dual-approach forecasting model:

#### 1. Trend-Based Forecasting

Applies linear regression to the last 6 months of revenue:

```typescript
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}
```

#### 2. Renewal Pipeline Forecasting

Calculates expected revenue from members whose memberships end in future months:

```typescript
function renewalPipelineForMonth(members, monthStart, nextMonthStart, renewalProbability) {
  return members
    .filter(
      (m) =>
        m.membershipStatus === "ACTIVE" &&
        m.endDate >= monthStart &&
        m.endDate < nextMonthStart,
    )
    .reduce((s, m) => s + Number(m.planPrice) * renewalProbability, 0);
}
```

#### 3. Combined Forecast

Averages both approaches when both have data, otherwise uses the available one:

```typescript
const combined =
  trendBased > 0 && renewalPipeline > 0
    ? (trendBased + renewalPipeline) / 2
    : Math.max(trendBased, renewalPipeline);
```

**Assumptions Documented:**
- Renewal probability uses observed renewal rate (or 50% placeholder if no history)
- Trend line is linear fit on last 6 months of revenue
- Pipeline uses active members ending in each month × renewal probability × plan price

### 6. Insights Generation

Automatically generates actionable insights:

```typescript
const insights: string[] = [];

// Stale members (no activity in 10+ days)
const staleActiveCount = members.filter(
  (m) =>
    m.endDate >= today &&
    m.membershipStatus === "ACTIVE" &&
    m.updatedAt < staleThreshold,
).length;

// Expiring soon (next 7 days)
const expiringSoonCount = members.filter(
  (m) =>
    m.endDate >= today &&
    m.endDate <= addDays(today, 7) &&
    m.membershipStatus === "ACTIVE",
).length;

// Unpaid members
if (unpaidMembers > 0) {
  insights.push(`${unpaidMembers} members are marked unpaid. Follow up for payment confirmation.`);
}
```

**Insight Types:**
- Stale member warnings (10+ days without updates)
- Expiring membership alerts (next 7 days)
- Unpaid member follow-ups
- Revenue forecast summary
- Stability message when no issues detected

### 7. Payment Analytics

Calculates payment success rates:

```typescript
const successRate = (paidMembers / totalMembers) * 100;
const partialRate = (partialMembers / totalMembers) * 100;
const failureRate = 100 - successRate - partialRate;
```

## Client Implementation

### Data Fetching

Uses React Query with 5-minute stale time:

```typescript
const { data, isLoading, error, refetch, isFetching } = useQuery<OwnerAnalytics, Error>({
  queryKey: ["owner-analytics"],
  queryFn: fetchAnalytics,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Key Features:**
- Automatic background refetching
- Manual refresh button
- Loading and error states
- Cache invalidation on membership changes

### Visualization Components

Uses Recharts for data visualization:

- **Stat Cards**: Summary metrics with trend indicators
- **Area Chart**: Revenue trends over 6 months
- **Bar Chart**: Payment status distribution
- **Pie Chart**: Member status breakdown
- **Forecast Cards**: 3-month revenue forecast

## API Endpoint

### GET /api/owner/analytics

**Authentication:** Requires gym owner session with ANALYTICS feature enabled

**Response:** `OwnerAnalytics` object

**Error Handling:**
- 401: Unauthorized (no session)
- 403: Forbidden (analytics feature not enabled)
- 500: Server error

## Performance Considerations

### Database Optimization

1. **SQL Aggregation**: Summary stats calculated in database, not application code
2. **Indexed Queries**: Uses existing indexes on `adminUserId`, `deletedAt`, `paidAt`
3. **Raw SQL**: Uses `$queryRaw` for complex aggregations that would be inefficient with Prisma ORM

### Application Optimization

1. **Selective Data Fetching**: Only fetches necessary fields from Member table for retention analysis
2. **Map-Based Grouping**: Uses Map for O(1) lookups when grouping by phone number
3. **Client Caching**: 5-minute stale time reduces unnecessary API calls

## Date Handling

All dates use UTC to ensure consistency across timezones:

```typescript
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const currentMonthStart = monthStartFromNow(0);
```

Helper functions:
- `monthKey(date)`: Returns "YYYY-MM" format
- `monthLabel(date)`: Returns localized month label (e.g., "Jan '24")
- `monthStartFromNow(offset)`: Returns first day of month at offset
- `addDays(date, days)`: Adds days to UTC date

## Feature Gate

Analytics is gated by the `ANALYTICS` platform plan feature:

```typescript
export const GET = withGymOwnerFeature("ANALYTICS", GETHandler);
```

Only gym owners with a subscription plan that includes the ANALYTICS feature can access this endpoint.

## Future Enhancements

Potential improvements:

1. **Custom Date Ranges**: Allow users to select custom date ranges for trends
2. **Member Segmentation**: Analytics by membership duration, plan type, etc.
3. **Churn Prediction**: ML-based churn risk scoring
4. **Revenue Attribution**: Track revenue by acquisition channel
5. **Real-time Updates**: WebSocket-based real-time analytics
6. **Export Functionality**: CSV/PDF export of analytics reports
7. **Benchmarking**: Compare against industry averages
8. **Goal Tracking**: Set and track revenue/member goals

## Troubleshooting

### Renewal Rate Shows 0%

**Cause:** Renewals may not have `paidAt` date set.

**Solution:** Ensure renewals are marked as paid with a `paidAt` timestamp in the `MembershipRenewal` table.

### Monthly Revenue Incorrect

**Cause:** Revenue calculated from `MembershipRenewal.paidAt` within current month.

**Solution:** Verify that renewals have correct `paidAt` dates and amounts.

### Trends Not Updating

**Cause:** Client has 5-minute cache.

**Solution:** Click manual refresh button or wait for cache to expire.

### Insights Not Showing

**Cause:** No members meet insight criteria.

**Solution:** This is normal if membership health is stable. Insights only appear when action is needed.
