"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CreditCard, Download, MoreVertical, Trash2, Crown, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  BillingStatus,
  OwnerSubscriptionPlan,
} from "@/generated/prisma/client";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

type ManagePlanData = {
  currentPlan: OwnerSubscriptionPlan;
  trialEndsAt: string | null;
  planPrices: Record<OwnerSubscriptionPlan, string>;
  invoices: {
    id: string;
    plan: OwnerSubscriptionPlan;
    amountInr: string;
    status: BillingStatus;
    dueDate: string;
    paidAt: string | null;
    createdAt: string;
  }[];
};

export function ManagePlanPanel() {
  const [data, setData] = useState<ManagePlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] =
    useState<OwnerSubscriptionPlan>("TRIAL");
  const [invoiceFilter, setInvoiceFilter] = useState<"ALL" | BillingStatus>(
    "ALL",
  );
  const [savingPlan, setSavingPlan] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/owner/manage-plan");
    const json = (await res.json()) as ManagePlanData | { message?: string };
    if (!res.ok) {
      toast.error(
        (json as { message?: string }).message ??
          "Could not load billing info.",
      );
      setLoading(false);
      return;
    }
    const payload = json as ManagePlanData;
    setData(payload);
    setSelectedPlan(payload.currentPlan);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPlanPrice = useMemo(() => {
    if (!data) return "0.00";
    return data.planPrices[selectedPlan];
  }, [data, selectedPlan]);

  const filteredInvoices = useMemo(() => {
    if (!data) return [];
    if (invoiceFilter === "ALL") return data.invoices;
    return data.invoices.filter((inv) => inv.status === invoiceFilter);
  }, [data, invoiceFilter]);

  async function handleChangePlan() {
    if (!data) return;
    if (selectedPlan === data.currentPlan) {
      toast.info("You are already on this plan.");
      return;
    }
    setSavingPlan(true);
    const res = await fetch("/api/owner/manage-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionPlan: selectedPlan }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(json.message ?? "Could not change plan.");
      setSavingPlan(false);
      return;
    }
    toast.success(json.message ?? "Plan updated.");
    setSavingPlan(false);
    await load();
  }

  function handleDeleteInvoice(invoiceId: string) {
    toast.warning("Remove this pending invoice?", {
      description: "This cannot be undone.",
      duration: Infinity,
      action: {
        label: "Remove",
        onClick: () => {
          void executeDeleteInvoice(invoiceId);
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  }

  async function executeDeleteInvoice(invoiceId: string) {
    setDeletingId(invoiceId);
    const res = await fetch(`/api/owner/billing/${invoiceId}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { message?: string };
    setDeletingId(null);
    if (!res.ok) {
      toast.error(json.message ?? "Could not remove invoice.");
      return;
    }
    toast.success(json.message ?? "Invoice removed.");
    await load();
  }

  async function handlePayNow(invoiceId: string) {
    setPayingId(invoiceId);
    const orderRes = await fetch(
      `/api/owner/billing/${invoiceId}/razorpay/order`,
      {
        method: "POST",
      },
    );
    const orderData = (await orderRes.json()) as {
      message?: string;
      keyId?: string;
      orderId?: string;
      amount?: number;
      currency?: string;
      invoiceId?: string;
    };
    if (
      !orderRes.ok ||
      !orderData.keyId ||
      !orderData.orderId ||
      !orderData.invoiceId
    ) {
      toast.error(orderData.message ?? "Could not start payment.");
      setPayingId(null);
      return;
    }

    if (!window.Razorpay) {
      toast.error("Razorpay checkout is not available.");
      setPayingId(null);
      return;
    }

    const instance = new window.Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency ?? "INR",
      name: "Gym Admin Portal",
      description: "Subscription invoice payment",
      order_id: orderData.orderId,
      handler: async (response: {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      }) => {
        const verifyRes = await fetch(
          `/api/owner/billing/${orderData.invoiceId}/razorpay/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          },
        );
        const verifyData = (await verifyRes.json()) as { message?: string };
        if (!verifyRes.ok) {
          toast.error(verifyData.message ?? "Payment verification failed.");
          setPayingId(null);
          return;
        }
        toast.success("Payment successful.");
        setPayingId(null);
        await load();
      },
      modal: {
        ondismiss: () => {
          setPayingId(null);
        },
      },
      theme: { color: "#111111" },
    });

    instance.open();
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading plan and billing details…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Current Plan Card */}
      <div className="rounded-2xl border border-[#d4ff00]/20 bg-gradient-to-br from-[#d4ff00]/5 to-transparent p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4ff00]/20">
            <Crown className="h-4 w-4 text-[#d4ff00]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Current Plan</h2>
            <p className="text-xs text-muted-foreground">Manage your subscription</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/50 backdrop-blur p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan</p>
            <p className="mt-2 text-lg sm:text-xl font-black text-foreground">
              {data.currentPlan}
            </p>
            {data.trialEndsAt && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Trial ends: {data.trialEndsAt.slice(0, 10)}</span>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card/50 backdrop-blur p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Selected Price</p>
            <p className="mt-2 text-lg sm:text-xl font-black text-foreground">
              {formatInrFromDecimalString(selectedPlanPrice)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedPlan === data.currentPlan ? "Current plan" : "New plan"}
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-[240px]">
            <label
              htmlFor="ownerPlan"
              className="mb-2 block text-xs font-semibold text-foreground"
            >
              Select Plan
            </label>
            <select
              id="ownerPlan"
              value={selectedPlan}
              onChange={(e) =>
                setSelectedPlan(e.target.value as OwnerSubscriptionPlan)
              }
              className="min-h-11 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground focus:border-[#d4ff00]/50 focus:ring-2 focus:ring-[#d4ff00]/20 transition-all"
            >
              {OWNER_SUBSCRIPTION_PLAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {formatInrFromDecimalString(data.planPrices[o.value])}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            disabled={savingPlan || selectedPlan === data.currentPlan}
            onClick={handleChangePlan}
            className="w-full sm:w-auto bg-[#d4ff00] text-black hover:bg-[#c2e600] font-semibold"
          >
            {savingPlan ? "Updating…" : "Update Plan"}
          </Button>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground">Invoices</h3>
              <p className="text-xs text-muted-foreground">View and manage your billing history</p>
            </div>
            <select
              id="invoiceFilter"
              value={invoiceFilter}
              onChange={(e) =>
                setInvoiceFilter(e.target.value as "ALL" | BillingStatus)
              }
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
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">
                  Date
                </th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">
                  Plan
                </th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">
                  Amount
                </th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">
                  Status
                </th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3 hidden md:table-cell">Due</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvoices.map((inv) => {
                const statusConfig = {
                  PENDING: {
                    icon: Clock,
                    label: "Pending",
                    className: "border-amber-500/20 bg-amber-500/10 text-amber-500",
                  },
                  PAID: {
                    icon: CheckCircle,
                    label: "Paid",
                    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                  },
                  FAILED: {
                    icon: AlertCircle,
                    label: "Failed",
                    className: "border-red-500/20 bg-red-500/10 text-red-500",
                  },
                };
                const config = statusConfig[inv.status];
                const StatusIcon = config.icon;

                return (
                  <tr key={inv.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      {inv.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">{inv.plan}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold">
                      {formatInrFromDecimalString(inv.amountInr)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${config.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 hidden md:table-cell text-muted-foreground">
                      {inv.dueDate}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            aria-label="Invoice actions"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={4}
                            className={cn(
                              "z-50 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg",
                              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                            )}
                          >
                            {inv.status === "PENDING" ? (
                              <>
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted data-disabled:pointer-events-none data-disabled:opacity-40"
                                  disabled={payingId === inv.id}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    void handlePayNow(inv.id);
                                  }}
                                  aria-label="Pay now"
                                >
                                  <CreditCard className="size-4" />
                                  <span>Pay Now</span>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-destructive/10 focus:bg-destructive/10 data-disabled:pointer-events-none data-disabled:opacity-40"
                                  disabled={
                                    deletingId === inv.id || payingId === inv.id
                                  }
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    void handleDeleteInvoice(inv.id);
                                  }}
                                  aria-label="Delete invoice"
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                  <span className="text-destructive">Remove</span>
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                              </>
                            ) : null}
                            <DropdownMenu.Item asChild>
                              <a
                                href={`/api/owner/billing/${inv.id}/receipt`}
                                download
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
                                aria-label="Download receipt"
                              >
                                <Download className="size-4" />
                                <span>Download Receipt</span>
                              </a>
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-muted-foreground sm:px-4"
                    colSpan={6}
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
