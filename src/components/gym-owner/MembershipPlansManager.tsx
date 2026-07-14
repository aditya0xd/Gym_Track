"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import {
  durationLabel,
  type MembershipPlanDto,
} from "@/lib/membership-plans/client";
import type { MemberBillingDuration } from "@/generated/prisma/client";

type PlanFormState = {
  name: string;
  category: string;
  description: string;
  benefits: string[];
  prices: Record<MemberBillingDuration, string>;
};

const EMPTY_PRICES = (): Record<MemberBillingDuration, string> => ({
  ONE_MONTH: "",
  THREE_MONTHS: "",
  SIX_MONTHS: "",
  TWELVE_MONTHS: "",
});

function emptyForm(): PlanFormState {
  return {
    name: "",
    category: "",
    description: "",
    benefits: [""],
    prices: EMPTY_PRICES(),
  };
}

function formFromPlan(plan: MembershipPlanDto): PlanFormState {
  const prices = EMPTY_PRICES();
  for (const row of plan.prices) {
    if (row.priceInr) prices[row.duration] = row.priceInr;
  }
  return {
    name: plan.name,
    category: plan.category ?? "",
    description: plan.description ?? "",
    benefits: plan.benefits.length > 0 ? plan.benefits.map((b) => b.label) : [""],
    prices,
  };
}

async function safeJson(res: Response): Promise<{ message?: string; [key: string]: unknown }> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { message?: string; [key: string]: unknown };
  } catch {
    return {};
  }
}

async function fetchPlans(): Promise<{ plans: MembershipPlanDto[] }> {
  const res = await fetch("/api/owner/membership-plans");
  if (!res.ok) {
    throw new Error("Could not load membership plans.");
  }
  return res.json();
}

function buildPayload(form: PlanFormState) {
  const benefits = form.benefits.map((b) => b.trim()).filter(Boolean);
  const prices = MEMBER_BILLING_DURATION_OPTIONS.map(({ value }) => ({
    duration: value,
    priceInr: form.prices[value].trim(),
  })).filter((p) => p.priceInr !== "" && Number(p.priceInr) >= 0);

  return {
    name: form.name.trim(),
    category: form.category.trim() || null,
    description: form.description.trim() || null,
    benefits,
    prices,
  };
}

function PlanFormFields({
  form,
  setForm,
  disabled,
}: {
  form: PlanFormState;
  setForm: (next: PlanFormState) => void;
  disabled?: boolean;
}) {
  const inputClass =
    "flex h-11 w-full rounded-xl border-0 bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff00]";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Plan name</label>
          <input
            value={form.name}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Strength, Couple"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Category (optional)</label>
          <input
            value={form.category}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. Strength, Wellness"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Description (optional)</label>
        <textarea
          value={form.description}
          disabled={disabled}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          placeholder="Short summary for your staff"
          className={`${inputClass} min-h-[72px] resize-none py-2`}
        />
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Benefits</label>
        {form.benefits.map((benefit, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={benefit}
              disabled={disabled}
              onChange={(e) => {
                const next = [...form.benefits];
                next[index] = e.target.value;
                setForm({ ...form, benefits: next });
              }}
              placeholder="e.g. Locker access"
              className={inputClass}
            />
            <button
              type="button"
              disabled={disabled || form.benefits.length <= 1}
              onClick={() =>
                setForm({
                  ...form,
                  benefits: form.benefits.filter((_, i) => i !== index),
                })
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={disabled || form.benefits.length >= 20}
          onClick={() => setForm({ ...form, benefits: [...form.benefits, ""] })}
          className="text-xs font-bold uppercase tracking-wider text-[#d4ff00] hover:underline disabled:opacity-40"
        >
          + Add benefit
        </button>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Duration pricing (INR)</label>
        <div className="grid grid-cols-2 gap-2">
          {MEMBER_BILLING_DURATION_OPTIONS.map(({ value }) => (
            <div key={value} className="space-y-1">
              <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                {durationLabel(value)}
              </span>
              <input
                value={form.prices[value]}
                disabled={disabled}
                inputMode="decimal"
                onChange={(e) =>
                  setForm({
                    ...form,
                    prices: {
                      ...form.prices,
                      [value]: e.target.value.replace(/[^\d.]/g, ""),
                    },
                  })
                }
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <p className="ml-1 text-xs text-muted-foreground">
          Add at least one duration price. Leave blank to skip a duration.
        </p>
      </div>
    </div>
  );
}

export function MembershipPlansManager() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ["membership-plans"],
    queryFn: fetchPlans,
  });

  useEffect(() => {
    if (error) toast.error(error.message || "Failed to load plans.");
  }, [error]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      const isEdit = mode === "edit" && editingPlanId;
      const res = await fetch(
        isEdit
          ? `/api/owner/membership-plans/${editingPlanId}`
          : "/api/owner/membership-plans",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await safeJson(res);
      if (!res.ok) throw new Error(body.message ?? `Server error ${res.status}. Could not save plan.`);
      return body;
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Plan updated." : "Plan created.");
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      setMode(null);
      setEditingPlanId(null);
      setForm(emptyForm());
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/owner/membership-plans/${planId}`, {
        method: "DELETE",
      });
      const body = await safeJson(res);
      if (!res.ok) throw new Error(body.message ?? `Server error ${res.status}. Could not delete plan.`);
    },
    onSuccess: () => {
      toast.success("Plan deleted.");
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const plans = data?.plans ?? [];

  function startCreate() {
    setMode("create");
    setEditingPlanId(null);
    setForm(emptyForm());
  }

  function startEdit(plan: MembershipPlanDto) {
    setMode("edit");
    setEditingPlanId(plan.id);
    setForm(formFromPlan(plan));
  }

  function cancelForm() {
    setMode(null);
    setEditingPlanId(null);
    setForm(emptyForm());
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4ff00]" />
        <p className="text-sm text-muted-foreground">Loading your plans…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">
          {plans.length} active plan{plans.length === 1 ? "" : "s"}
        </p>
        {mode === null ? (
          <button
            type="button"
            onClick={startCreate}
            className="group flex items-center gap-2.5 rounded-full bg-foreground py-1.5 pl-1.5 pr-4 text-xs font-bold text-background transition-all hover:bg-foreground/90 hover:shadow-lg active:scale-95"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d4ff00] text-black transition-transform group-hover:scale-105">
              <Plus className="h-4 w-4 stroke-[3]" />
            </div>
            Create Plan
          </button>
        ) : null}
      </div>

      {mode !== null ? (
        <div className="rounded-2xl border border-[#d4ff00]/30 bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">
                {mode === "edit" ? "Edit plan" : "New plan"}
              </p>
              <h2 className="mt-1 text-lg font-black text-foreground">
                {mode === "edit" ? "Update membership plan" : "Create membership plan"}
              </h2>
            </div>
            <button
              type="button"
              onClick={cancelForm}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <PlanFormFields
            form={form}
            setForm={setForm}
            disabled={saveMutation.isPending}
          />

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#d4ff00] py-2.5 text-[11px] font-black uppercase tracking-widest text-black disabled:opacity-70"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 stroke-[3]" />
              )}
              Save plan
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-xl bg-muted px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {plans.map((plan) => {
        const activePrices = plan.prices.filter(
          (p) => p.priceInr && Number(p.priceInr) > 0,
        );
        const highlight =
          activePrices.find((p) => p.duration === "THREE_MONTHS") ??
          activePrices[0];

        return (
          <div
            key={plan.id}
            className="relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-[#d4ff00]/30"
          >
            {/* Header section: Name, Category, Members */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  {plan.category ? (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {plan.category}
                    </span>
                  ) : null}
                </div>
                {plan.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
                ) : null}
              </div>

              {plan.activeMemberCount > 0 ? (
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Active Members
                  </span>
                  <span className="text-lg font-black text-foreground">
                    {plan.activeMemberCount}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Prices section */}
            {activePrices.length > 0 ? (
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {activePrices.map((p) => (
                  <div
                    key={p.duration}
                    className="rounded-xl border border-border/50 bg-muted/30 p-2.5 text-center"
                  >
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {durationLabel(p.duration)}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatInrFromDecimalString(p.priceInr!)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-xs text-red-400">No prices set yet.</p>
            )}

            {/* Benefits section */}
            {plan.benefits.length > 0 ? (
              <div className="mb-5 flex flex-wrap gap-1.5">
                {plan.benefits.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    <Check className="h-3 w-3 text-[#d4ff00]" />
                    {b.label}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex gap-2 border-t border-border/50 pt-4">
              <button
                type="button"
                onClick={() => startEdit(plan)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-muted/50 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Plan
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (plan.activeMemberCount > 0) {
                    toast.error(
                      `Cannot delete "${plan.name}" while ${plan.activeMemberCount} member(s) are still assigned to it.`,
                    );
                    return;
                  }
                  if (
                    window.confirm(
                      `Delete "${plan.name}"? This cannot be undone for new enrollments.`,
                    )
                  ) {
                    deleteMutation.mutate(plan.id);
                  }
                }}
                className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl transition-colors self-center ${
                  plan.activeMemberCount > 0
                    ? "bg-muted/30 text-muted-foreground/30 hover:text-red-400/50"
                    : "bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                } disabled:opacity-40`}
                title="Delete plan"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {plan.name === "Standard" ? (
              <div className="absolute -top-2.5 left-5 flex items-center gap-1 rounded-full bg-[#d4ff00] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-black shadow-sm">
                <Zap className="h-2.5 w-2.5 fill-black stroke-0" />
                Default
              </div>
            ) : null}
          </div>
        );
      })}

      {plans.length === 0 && mode === null ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No membership plans yet.</p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-3 text-sm font-bold text-[#d4ff00] hover:underline"
          >
            Create your first plan
          </button>
        </div>
      ) : null}
    </div>
  );
}
