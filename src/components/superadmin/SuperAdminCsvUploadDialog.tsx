"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X, UploadCloud, Loader2, Download, FileText } from "lucide-react";

export function SuperAdminCsvUploadDialog({
  ownerId,
  ownerName,
}: {
  ownerId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null); // Clear previous results
    }
  };

  const downloadSample = () => {
    const csvContent = "fullName,phone,email,billingDuration,planPrice,startDate,endDate\nJohn Doe,9876543210,john@example.com,ONE_MONTH,999.00,2026-07-01,2026-07-31\nJane Smith,9876543211,,THREE_MONTHS,2699.00,2026-07-15,2026-10-14";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "gym_members_sample.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function handleUpload() {
    if (!selectedFile) return;

    setUploading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`/api/superadmin/gym-owners/${ownerId}/members/csv`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.message || "Upload failed");
        return;
      }
      
      setUploadResult({
        created: data.created,
        skipped: data.skipped,
        errors: data.errors || [],
      });
      
      if (data.created > 0) {
        toast.success(data.message);
        router.refresh();
      } else if (data.errors?.length > 0) {
        toast.error("Upload processed with errors. No members were added.");
      }

    } catch {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  }

  function resetAndClose() {
    setIsOpen(false);
    setTimeout(() => {
      setSelectedFile(null);
      setUploadResult(null);
    }, 300);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:scale-[0.98]"
      >
        <UploadCloud className="h-4 w-4" />
        Upload CSV
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[1.5rem] bg-[#16161a] p-6 text-white shadow-2xl">
            <button
              onClick={resetAndClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">Super Admin</p>
              <h2 className="mt-0.5 text-xl font-bold">Bulk Upload Members</h2>
              <p className="mt-0.5 text-sm text-zinc-400">Add multiple members to <span className="text-white font-medium">{ownerName}</span>&rsquo;s gym</p>
            </div>

            <div className="space-y-6">
              {/* Step 1: Download Sample */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <h3 className="mb-2 text-sm font-semibold">1. Prepare your data</h3>
                <p className="mb-3 text-xs text-zinc-400">
                  Download the template, fill it with member details, and save as .csv.
                  Make sure dates are in YYYY-MM-DD format.
                </p>
                <button 
                  onClick={downloadSample}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample CSV
                </button>
              </div>

              {/* Step 2: Upload File */}
              {!uploadResult ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">2. Upload CSV File</h3>
                  
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed ${selectedFile ? 'border-[#d4ff00] bg-[#d4ff00]/5' : 'border-white/20 bg-black/20 hover:bg-black/40'} p-8 transition-colors`}
                  >
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    
                    {selectedFile ? (
                      <>
                        <FileText className="mb-2 h-8 w-8 text-[#d4ff00]" />
                        <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                        <p className="text-xs text-zinc-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mb-2 h-8 w-8 text-zinc-400" />
                        <p className="text-sm font-medium text-white">Click to browse files</p>
                        <p className="text-xs text-zinc-500">Only .csv files supported</p>
                      </>
                    )}
                  </div>

                  {selectedFile && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-[#d4ff00] text-sm font-bold text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Upload & Import"}
                    </button>
                  )}
                </div>
              ) : (
                /* Results State */
                <div className="rounded-xl bg-black/40 p-5">
                  <h3 className="mb-4 text-center text-lg font-bold">Import Results</h3>
                  
                  <div className="flex justify-around mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-black text-green-400">{uploadResult.created}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-zinc-400">{uploadResult.skipped}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Skipped/Failed</div>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="mt-4 max-h-32 overflow-y-auto rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                      <p className="mb-2 font-semibold">Errors ({uploadResult.errors.length}):</p>
                      <ul className="list-inside list-disc space-y-1">
                        {uploadResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={resetAndClose}
                    className="mt-6 flex h-10 w-full items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white transition-colors hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
