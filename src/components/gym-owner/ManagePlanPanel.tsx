"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CreditCard, Download, MoreVertical, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { BillingStatus, OwnerSubscriptionPlan } from "@/generated/prisma/client";
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
  const [selectedPlan, setSelectedPlan] = useState<OwnerSubscriptionPlan>("TRIAL");
  const [invoiceFilter, setInvoiceFilter] = useState<"ALL" | BillingStatus>("ALL");
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
      toast.error((json as { message?: string }).message ?? "Could not load billing info.");
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
    const orderRes = await fetch(`/api/owner/billing/${invoiceId}/razorpay/order`, {
      method: "POST",
    });
    const orderData = (await orderRes.json()) as {
      message?: string;
      keyId?: string;
      orderId?: string;
      amount?: number;
      currency?: string;
      invoiceId?: string;
    };
    if (!orderRes.ok || !orderData.keyId || !orderData.orderId || !orderData.invoiceId) {
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
    return <p className="text-sm text-muted-foreground">Loading plan and billing details…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Manage plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upgrade or downgrade your gym owner plan. A new invoice is generated on plan change.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Current plan</p>
            <p className="text-sm font-semibold text-foreground">{data.currentPlan}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Trial ends: {data.trialEndsAt ? data.trialEndsAt.slice(0, 10) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Selected plan price</p>
            <p className="text-sm font-semibold text-foreground">
              {formatInrFromDecimalString(selectedPlanPrice)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-[220px]">
            <label htmlFor="ownerPlan" className="mb-1 block text-sm text-muted-foreground">
              Plan
            </label>
            <select
              id="ownerPlan"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as OwnerSubscriptionPlan)}
              className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {OWNER_SUBSCRIPTION_PLAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({formatInrFromDecimalString(data.planPrices[o.value])})
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            disabled={savingPlan || selectedPlan === data.currentPlan}
            onClick={handleChangePlan}
          >
            {savingPlan ? "Updating…" : "Update plan"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="border-b border-border bg-muted/30 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <label htmlFor="invoiceFilter" className="text-xs text-muted-foreground">
              Filter invoices
            </label>
            <select
              id="invoiceFilter"
              value={invoiceFilter}
              onChange={(e) => setInvoiceFilter(e.target.value as "ALL" | BillingStatus)}
              className="min-h-9 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Date</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Plan</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Amount</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Status</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Due</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="bg-card">
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                    {inv.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">{inv.plan}</td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                    {formatInrFromDecimalString(inv.amountInr)}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">{inv.status}</td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">{inv.dueDate}</td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
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
                            "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md",
                            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                          )}
                        >
                          {inv.status === "PENDING" ? (
                            <>
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center justify-center rounded-md p-2 outline-none hover:bg-muted focus:bg-muted data-disabled:pointer-events-none data-disabled:opacity-40"
                                disabled={payingId === inv.id}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  void handlePayNow(inv.id);
                                }}
                                aria-label="Pay now"
                              >
                                <CreditCard className="size-4" />
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center justify-center rounded-md p-2 outline-none hover:bg-destructive/10 focus:bg-destructive/10 data-disabled:pointer-events-none data-disabled:opacity-40"
                                disabled={deletingId === inv.id || payingId === inv.id}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  void handleDeleteInvoice(inv.id);
                                }}
                                aria-label="Delete invoice"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="my-1 h-px bg-border" />
                            </>
                          ) : null}
                          <DropdownMenu.Item asChild>
                            <a
                              href={`/api/owner/billing/${inv.id}/receipt`}
                              download
                              className="flex cursor-pointer items-center justify-center rounded-md p-2 outline-none hover:bg-muted focus:bg-muted"
                              aria-label="Download receipt"
                            >
                              <Download className="size-4" />
                            </a>
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              ))}
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
