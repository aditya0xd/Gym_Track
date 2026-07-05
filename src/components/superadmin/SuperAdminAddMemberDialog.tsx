"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

const DURATION_OPTIONS = [
  { value: "ONE_MONTH", label: "1 Month" },
  { value: "THREE_MONTHS", label: "3 Months" },
  { value: "SIX_MONTHS", label: "6 Months" },
  { value: "TWELVE_MONTHS", label: "12 Months" },
];

export function SuperAdminAddMemberDialog({
  ownerId,
  ownerName,
}: {
  ownerId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    billingDuration: "ONE_MONTH",
    planPrice: "",
    startDate: "",
    endDate: "",
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.planPrice || !form.startDate || !form.endDate) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/gym-owners/${ownerId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to add member");
        return;
      }
      toast.success("Member added successfully!");
      setIsOpen(false);
      setForm({ fullName: "", phone: "", email: "", billingDuration: "ONE_MONTH", planPrice: "", startDate: "", endDate: "" });
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white placeholder-zinc-500 focus:border-[#d4ff00] focus:outline-none focus:ring-1 focus:ring-[#d4ff00]";
  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-widest text-zinc-400";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-10 items-center gap-2 rounded-xl bg-[#d4ff00] px-4 text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        + Add Member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[1.5rem] bg-[#16161a] p-6 text-white shadow-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">Super Admin</p>
              <h2 className="mt-0.5 text-xl font-bold">Add Member</h2>
              <p className="mt-0.5 text-sm text-zinc-400">Adding to <span className="text-white font-medium">{ownerName}</span>&rsquo;s gym</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input className={inputClass} value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} placeholder="Ravi Kumar" required />
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <input className={inputClass} value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="9876543210" required />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email (optional)</label>
                <input type="email" className={inputClass} value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="ravi@example.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Plan Duration *</label>
                  <select
                    className={inputClass}
                    value={form.billingDuration}
                    onChange={(e) => handleChange("billingDuration", e.target.value)}
                  >
                    {DURATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Price (INR) *</label>
                  <input className={inputClass} value={form.planPrice} onChange={(e) => handleChange("planPrice", e.target.value)} placeholder="999.00" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <input type="date" className={inputClass} value={form.startDate} onChange={(e) => handleChange("startDate", e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>End Date *</label>
                  <input type="date" className={inputClass} value={form.endDate} onChange={(e) => handleChange("endDate", e.target.value)} required />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-[#d4ff00] text-sm font-bold text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Add Member"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
