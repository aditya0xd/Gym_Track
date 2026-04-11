"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { OwnerAnalytics } from "@/server/gym-owner/analytics.service";
import { formatInrFromDecimalString } from "@/lib/format/inr";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total members" value={String(data.summary.totalMembers)} />
        <StatCard label="Active members" value={String(data.summary.activeMembers)} />
        <StatCard label="Paused members" value={String(data.summary.pausedMembers)} />
        <StatCard label="Inactive members" value={String(data.summary.inactiveMembers)} />
        <StatCard
          label="Monthly revenue"
          value={formatInrFromDecimalString(String(data.summary.monthlyRevenue))}
        />
        <StatCard label="Paid members" value={String(data.summary.paidMembers)} />
        <StatCard label="Unpaid members" value={String(data.summary.unpaidMembers)} />
        <StatCard
          label="Forecast — next month"
          value={formatInrFromDecimalString(String(data.revenueForecast.nextMonthCombined))}
        />
        <StatCard
          label="Forecast — next 3 months"
          value={formatInrFromDecimalString(String(data.revenueForecast.nextQuarterCombined))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Retention vs churn overview
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Renewal: {data.retention.renewalRate}% | Churn: {data.retention.churnRate}%
          </p>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={retentionData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  innerRadius={45}
                >
                  <Cell fill="#111111" />
                  <Cell fill="#737373" />
                  <Cell fill="#b3b3b3" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Payment success vs failures
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Success: {data.payments.successRate}% | Failures: {data.payments.failureRate}%
          </p>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trends}>
                <CartesianGrid strokeDasharray="2 2" strokeOpacity={0.25} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="paidMembers" fill="#111111" name="Paid" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="unpaidMembers"
                  fill="#9a9a9a"
                  name="Unpaid"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Revenue trend &amp; forecast (next 3 months)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Solid line: paid enrollment revenue by month. Dashed: combined forecast (trend + renewal
          pipeline).
        </p>
        <div className="mt-3 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueForecastChart}>
              <CartesianGrid strokeDasharray="2 2" strokeOpacity={0.25} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={56} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === "number" ? value : Number(value);
                  return n > 0 ? formatInrFromDecimalString(String(n)) : "—";
                }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual revenue"
                stroke="#111111"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="#737373"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Revenue forecast detail</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Combined = average of trend and pipeline when both &gt; 0; otherwise the larger component.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="pb-2 pr-3 font-medium">Month</th>
                <th className="pb-2 pr-3 font-medium">Trend (INR)</th>
                <th className="pb-2 pr-3 font-medium">Renewal pipeline (INR)</th>
                <th className="pb-2 font-medium">Combined (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.revenueForecast.months.map((m) => (
                <tr key={m.monthKey}>
                  <td className="py-2 pr-3 text-foreground">{m.month}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatInrFromDecimalString(String(m.trendBased))}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatInrFromDecimalString(String(m.renewalPipeline))}
                  </td>
                  <td className="py-2 font-medium tabular-nums text-foreground">
                    {formatInrFromDecimalString(String(m.combined))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          {data.revenueForecast.assumptions.map((a) => (
            <li key={a}>• {a}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Insights</h3>
        <ul className="mt-3 space-y-2 text-sm text-foreground">
          {data.insights.map((insight) => (
            <li key={insight} className="rounded-md border border-border bg-background px-3 py-2">
              {insight}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}