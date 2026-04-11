"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function MemberBulkPanel() {
  const [importing, setImporting] = useState(false);
  const [lastErrors, setLastErrors] = useState<{ rowNumber: number; message: string }[] | null>(
    null,
  );

  async function downloadExport() {
    const res = await fetch("/api/owner/members/export");
    if (!res.ok) {
      toast.error("Could not download export.");
      return;
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition");
    const m = /filename="([^"]+)"/.exec(cd ?? "");
    downloadBlob(m?.[1] ?? "members-export.csv", blob);
    toast.success("Export downloaded.");
  }

  async function downloadTemplate() {
    const res = await fetch("/api/owner/members/export?template=1");
    if (!res.ok) {
      toast.error("Could not download template.");
      return;
    }
    const blob = await res.blob();
    downloadBlob("members-import-template.csv", blob);
    toast.success("Template downloaded.");
  }

  async function onImportFile(file: File | null) {
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/owner/members/import", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as {
      message?: string;
      created?: number;
      errors?: { rowNumber: number; message: string }[];
    };
    setImporting(false);
    if (!res.ok) {
      toast.error(data.message ?? "Import failed.");
      setLastErrors(null);
      return;
    }
    const created = data.created ?? 0;
    const errs = data.errors ?? [];
    setLastErrors(errs.length > 0 ? errs : null);
    if (errs.length === 0) {
      toast.success(`Imported ${created} member(s).`);
      return;
    }
    toast.warning(
      `Imported ${created} member(s). ${errs.length} row(s) had errors. Check the list below.`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Export</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download all members as CSV (UTF-8). Includes end date and membership status for your
          records. Re-import uses the template columns only.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void downloadExport()}>
            Download all members (CSV)
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the template for column names. Required: fullName, phone, billingDuration (
          ONE_MONTH, THREE_MONTHS, SIX_MONTHS, TWELVE_MONTHS), startDate (YYYY-MM-DD). Optional:
          email, paymentStatus (NOT_DONE or DONE — DONE rows are skipped for import because UPI proof
          is required), whatsappEnabled (true/false). Each duration must have a price under Pricing.
          Maximum 500 rows per file.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => void downloadTemplate()}>
            Download template (CSV)
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                void onImportFile(f);
              }}
            />
            <span
              className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
              data-slot="button"
            >
              {importing ? "Importing…" : "Choose CSV file…"}
            </span>
          </label>
        </div>
        {lastErrors && lastErrors.length > 0 ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground">Row errors</p>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {lastErrors.map((e, i) => (
                <li key={`${e.rowNumber}-${i}`}>
                  Row {e.rowNumber}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
