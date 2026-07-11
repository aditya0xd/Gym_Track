"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
} from "lucide-react";

import type { OwnerAnalytics } from "@/server/gym-owner/analytics.service";
import { formatInrFromDecimalString } from "@/lib/format/inr";

function retentionLabel(props: unknown) {
  if (
    typeof props !== "object" ||
    props === null ||
    !("value" in props) ||
    !("name" in props)
  ) {
    return "";
  }

  const value = Number(props.value);
  return value > 0 ? `${String(props.name)}: ${value}` : "";
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  gradient,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  gradient?: string;
}) {
  const gradientStyle =
    gradient ||
    "from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800";

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${gradientStyle} p-5 transition-all hover:shadow-lg hover:scale-[1.02]`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <div
              className={`mt-1 flex items-center gap-1 text-xs ${trendUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span>{trend}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2.5 shadow-sm">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export function OwnerAnalyticsDashboard({ data }: { data: OwnerAnalytics }) {
  const retentionData = [
    { name: "Active", value: data.summary.activeMembers },
    { name: "Paused", value: data.summary.pausedMembers },
    { name: "Inactive", value: data.summary.inactiveMembers },
  ];

  const revenueForecastChart = [
    ...data.trends.map((t) => ({
      month: t.month,
      actual: t.revenue,
      forecast: null as number | null,
    })),
    ...data.revenueForecast.months.map((m) => ({
      month: m.month,
      actual: null as number | null,
      forecast: m.combined,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics - Top Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly Revenue"
          value={formatInrFromDecimalString(
            String(data.summary.monthlyRevenue),
          )}
          icon={IndianRupee}
          gradient="from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30"
        />
        <StatCard
          label="Renewal Rate"
          value={`${data.retention.renewalRate}%`}
          icon={CheckCircle}
          trend="Member retention"
          trendUp={true}
          gradient="from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
        />
        <StatCard
          label="Churn Rate"
          value={`${data.retention.churnRate}%`}
          icon={AlertCircle}
          trend="Member attrition"
          trendUp={false}
          gradient="from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30"
        />
        <StatCard
          label="Payment Success"
          value={`${data.payments.successRate}%`}
          icon={TrendingUp}
          trend="Collection rate"
          trendUp={true}
          gradient="from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30"
        />
      </div>

      {/* Revenue Forecast - Prominent */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Revenue Forecast
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Next month:{" "}
            <span className="font-semibold text-foreground">
              {formatInrFromDecimalString(
                String(data.revenueForecast.nextMonthCombined),
              )}
            </span>{" "}
            • Next 3 months:{" "}
            <span className="font-semibold text-foreground">
              {formatInrFromDecimalString(
                String(data.revenueForecast.nextQuarterCombined),
              )}
            </span>
          </p>
        </div>
        <div className="h-[250px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revenueForecastChart}
              margin={{ top: 10, right: 40, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="forecastGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => {
                  const n = typeof value === "number" ? value : Number(value);
                  return n > 0 ? formatInrFromDecimalString(String(n)) : "—";
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#actualGradient)"
                dot={{ fill: "#10b981", r: 3, strokeWidth: 1 }}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#forecastGradient)"
                dot={{ fill: "#6366f1", r: 3, strokeWidth: 1 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Member Status */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">
            Member Status
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 p-2 sm:p-3 text-center transition-all hover:shadow-md dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-200/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <p className="relative text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-400">
                Active
              </p>
              <p className="relative mt-1 text-base sm:text-lg font-bold text-green-900 dark:text-green-300">
                {data.summary.activeMembers}
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-200 p-2 sm:p-3 text-center transition-all hover:shadow-md dark:from-yellow-950/30 dark:to-amber-950/30 dark:border-yellow-800">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <p className="relative text-[10px] sm:text-xs font-medium text-yellow-700 dark:text-yellow-400">
                Paused
              </p>
              <p className="relative mt-1 text-base sm:text-lg font-bold text-yellow-900 dark:text-yellow-300">
                {data.summary.pausedMembers}
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-rose-100 border border-red-200 p-2 sm:p-3 text-center transition-all hover:shadow-md dark:from-red-950/30 dark:to-rose-950/30 dark:border-red-800">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-200/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <p className="relative text-[10px] sm:text-xs font-medium text-red-700 dark:text-red-400">
                Inactive
              </p>
              <p className="relative mt-1 text-base sm:text-lg font-bold text-red-900 dark:text-red-300">
                {data.summary.inactiveMembers}
              </p>
            </div>
          </div>
          <div className="mt-4 h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={retentionData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={60}
                  innerRadius={35}
                  paddingAngle={2}
                  label={retentionLabel}
                  labelLine={false}
                >
                  <Cell fill="#10b981" stroke="white" strokeWidth={2} />
                  <Cell fill="#f59e0b" stroke="white" strokeWidth={2} />
                  <Cell fill="#ef4444" stroke="white" strokeWidth={2} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Trends */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">
            Payment Trends
          </h3>
          <div className="mt-4 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2 rounded-full bg-green-100 px-2 sm:px-3 py-1 dark:bg-green-950/30">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500" />
              <span className="font-medium text-green-700 dark:text-green-400">
                Paid: {data.payments.successRate}%
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-yellow-100 px-2 sm:px-3 py-1 dark:bg-yellow-950/30">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-yellow-500" />
              <span className="font-medium text-yellow-700 dark:text-yellow-400">
                Partial: {data.payments.partialRate}%
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 sm:px-3 py-1 dark:bg-gray-800">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-gray-500" />
              <span className="font-medium text-gray-700 dark:text-gray-400">
                Unpaid: {data.payments.failureRate}%
              </span>
            </div>
          </div>
          <div className="mt-4 h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.trends}
                margin={{ top: 10, right: 40, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient
                    id="partialGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#ca8a04" />
                  </linearGradient>
                  <linearGradient
                    id="unpaidGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#6b7280" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    `${String(value)} members`,
                    String(name ?? ""),
                  ]}
                />
                <Bar
                  dataKey="paidMembers"
                  fill="url(#paidGradient)"
                  name="Paid"
                  stackId="members"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="partialMembers"
                  fill="url(#partialGradient)"
                  name="Partial"
                  stackId="members"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="unpaidMembers"
                  fill="url(#unpaidGradient)"
                  name="Unpaid"
                  stackId="members"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue Forecast Table - Collapsible Detail */}
      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer p-3 sm:p-4 hover:bg-muted/50">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            Revenue Forecast Details
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Click to view monthly breakdown
          </p>
        </summary>
        <div className="border-t border-border p-3 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-xs sm:text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="pb-2 sm:pb-3 pr-2 sm:pr-4 font-medium">
                    Month
                  </th>
                  <th className="pb-2 sm:pb-3 pr-2 sm:pr-4 font-medium">
                    Trend
                  </th>
                  <th className="pb-2 sm:pb-3 pr-2 sm:pr-4 font-medium">
                    Renewal
                  </th>
                  <th className="pb-2 sm:pb-3 font-medium">Combined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.revenueForecast.months.map((m) => (
                  <tr key={m.monthKey}>
                    <td className="py-2 sm:py-3 pr-2 sm:pr-4 text-foreground">
                      {m.month}
                    </td>
                    <td className="py-2 sm:py-3 pr-2 sm:pr-4 tabular-nums text-muted-foreground">
                      {formatInrFromDecimalString(String(m.trendBased))}
                    </td>
                    <td className="py-2 sm:py-3 pr-2 sm:pr-3 tabular-nums text-muted-foreground">
                      {formatInrFromDecimalString(String(m.renewalPipeline))}
                    </td>
                    <td className="py-2 sm:py-3 font-medium tabular-nums text-foreground">
                      {formatInrFromDecimalString(String(m.combined))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      {/* Insights - Prominent */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-6 dark:from-indigo-950/20 dark:to-purple-950/20">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            Key Insights
          </h3>
        </div>
        <ul className="space-y-2 sm:space-y-3">
          {data.insights.map((insight, i) => (
            <li
              key={i}
              className="flex items-start gap-2 sm:gap-3 rounded-lg border border-indigo-200/50 bg-white/50 p-2 sm:p-3 text-xs sm:text-sm dark:bg-gray-900/50 dark:border-indigo-800/50"
            >
              <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
              <span className="text-foreground">{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
