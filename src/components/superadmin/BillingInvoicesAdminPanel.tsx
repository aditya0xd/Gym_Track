"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BillingStatus, OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { toast } from "sonner";
import { CheckCircle, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatInrFromDecimalString } from "@/lib/format/inr";

type InvoiceRow = {
  id: string;
  adminUserId: string;
  ownerName: string;
  ownerEmail: string;
  plan: OwnerSubscriptionPlan;
  amountInr: string;
  status: BillingStatus;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
};

export function BillingInvoicesAdminPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | BillingStatus>("ALL");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["superadmin-billing-invoices"],
    queryFn: async () => {
    const res = await fetch("/api/superadmin/billing");
    if (!res.ok) {
      throw new Error("Could not load billing invoices.");
    }
    const data = (await res.json()) as { invoices: InvoiceRow[] };
    return data.invoices ?? [];
    },
  });

  async function approveInvoice(invoiceId: string) {
    const res = await fetch(`/api/superadmin/billing/${invoiceId}/approve`, {
      method: "POST",
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(data.message ?? "Approval failed.");
      return;
    }
    toast.success("Invoice approved and plan updated.");
    await queryClient.invalidateQueries({ queryKey: ["superadmin-billing-invoices"] });
  }

  const filteredRows = filter === "ALL" ? rows : rows.filter((r) => r.status === filter);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading billing invoices…</p>;
  }

  const statusConfig = {
    PENDING: {
      label: "Pending",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    },
    PAID: {
      label: "Paid",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    },
    FAILED: {
      label: "Failed",
      className: "border-red-500/20 bg-red-500/10 text-red-500",
    },
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground">Billing Invoices</h3>
              <p className="text-xs text-muted-foreground">Approve pending payments to update subscription plans</p>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "ALL" | BillingStatus)}
              className="min-h-9 w-full sm:w-auto rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-[#d4ff00]/50 focus:ring-2 focus:ring-[#d4ff00]/20 transition-all"
            >
              <option value="ALL">All Invoices</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-xs sm:text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Date</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Gym Owner</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Plan</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Amount</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Status</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3 hidden md:table-cell">Due</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((row) => {
                const config = statusConfig[row.status];
                return (
                  <tr key={row.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      {row.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <div className="font-medium text-foreground">{row.ownerName}</div>
                      <div className="text-xs text-muted-foreground">{row.ownerEmail}</div>
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">{row.plan}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold">
                      {formatInrFromDecimalString(row.amountInr)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${config.className}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 hidden md:table-cell text-muted-foreground">
                      {row.dueDate}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status === "PENDING" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            className="bg-[#d4ff00] text-black hover:bg-[#c2e600]"
                            onClick={() => approveInvoice(row.id)}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                        <a
                          href={`/api/owner/billing/${row.id}/receipt`}
                          download
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/5 px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                          title="Download Receipt"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-muted-foreground sm:px-4"
                    colSpan={7}
                  >
                    No invoices for selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
