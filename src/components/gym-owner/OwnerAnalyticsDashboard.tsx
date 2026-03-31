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
    { name: "Inactive", value: data.summary.inactiveMembers },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total members" value={String(data.summary.totalMembers)} />
        <StatCard label="Active members" value={String(data.summary.activeMembers)} />
        <StatCard label="Inactive members" value={String(data.summary.inactiveMembers)} />
        <StatCard
          label="Monthly revenue"
          value={formatInrFromDecimalString(String(data.summary.monthlyRevenue))}
        />
        <StatCard label="Paid members" value={String(data.summary.paidMembers)} />
        <StatCard label="Unpaid members" value={String(data.summary.unpaidMembers)} />
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
        <h3 className="text-sm font-semibold text-foreground">Revenue trend (last 6 months)</h3>
        <div className="mt-3 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="2 2" strokeOpacity={0.25} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue (INR)"
                stroke="#111111"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
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