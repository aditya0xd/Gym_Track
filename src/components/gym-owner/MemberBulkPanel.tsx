"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

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
  const [lastErrors, setLastErrors] = useState<
    { rowNumber: number; message: string }[] | null
  >(null);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);

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
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error("Please select a CSV file.");
      return;
    }

    setImporting(true);
    setLastErrors(null);
    setImportSuccess(null);
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
    setImportSuccess(created);
    setLastErrors(errs.length > 0 ? errs : null);
    if (errs.length === 0) {
      toast.success(`Successfully imported ${created} member(s).`);
      return;
    }
    toast.warning(
      `Imported ${created} member(s). ${errs.length} row(s) had errors. Check the list below.`,
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <div className="rounded-[1.5rem] bg-[#16161a] p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">Export Members</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Download all members as CSV file. Includes end date and membership status for your records.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => void downloadExport()}
          className="w-full sm:w-auto bg-[#d4ff00] text-black hover:bg-[#c2e600] font-semibold h-11"
        >
          <Download className="h-4 w-4 mr-2" />
          Download All Members (CSV)
        </Button>
      </div>

      {/* Import Section */}
      <div className="rounded-[1.5rem] bg-[#16161a] p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
            <Upload className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">Import Members</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Bulk import members from CSV file. Use the template for correct column names.
            </p>
          </div>
        </div>

        {/* Template Download */}
        <div className="mb-4 rounded-2xl bg-[#292929] p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-zinc-400" />
            <p className="text-sm font-semibold text-white">Required Format</p>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            Required columns: <span className="text-white font-medium">fullName, phone, membershipPlanName, billingDuration, startDate</span>
          </p>
          <p className="text-xs text-zinc-400 mb-3">
            Optional columns: <span className="text-white font-medium">email, paymentStatus, whatsappEnabled</span>
          </p>
          <p className="text-xs text-zinc-400 mb-4">
            Maximum 500 rows per file. File size limit: 5MB
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void downloadTemplate()}
            className="w-full sm:w-auto border-white/10 text-white hover:bg-white/5 h-9 text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template (CSV)
          </Button>
        </div>

        {/* File Upload */}
        <div className="rounded-2xl border-2 border-dashed border-white/10 bg-[#292929] p-6 text-center hover:border-[#d4ff00]/50 transition-colors">
          <label className="cursor-pointer">
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
            {importing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-[#d4ff00] animate-spin" />
                <p className="text-sm text-zinc-400">Importing members...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d4ff00]/10 text-[#d4ff00]">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">CSV file (max 5MB)</p>
                </div>
              </div>
            )}
          </label>
        </div>
        {/* Success Message */}
        {importSuccess !== null && !lastErrors && (
          <div className="mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-bold text-emerald-500">Import Successful</p>
                <p className="text-xs text-emerald-400 mt-1">
                  {importSuccess} member(s) imported successfully
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {lastErrors && lastErrors.length > 0 ? (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-bold text-red-500">Import Errors</p>
                <p className="text-xs text-red-400 mt-1">
                  {lastErrors.length} row(s) had errors. Please fix and re-import.
                </p>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl bg-[#16161a] p-3">
              <ul className="space-y-2">
                {lastErrors.map((e, i) => (
                  <li key={`${e.rowNumber}-${i}`} className="flex items-start gap-2 text-xs">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-red-500/20 text-red-500 font-bold">
                      {e.rowNumber}
                    </span>
                    <span className="text-zinc-300">{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
