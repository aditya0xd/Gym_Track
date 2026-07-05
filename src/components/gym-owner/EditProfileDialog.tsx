"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Loader2, X, Upload } from "lucide-react";

export function EditProfileDialog({
  initialName,
  initialEmail,
  initialProfilePhoto,
  children,
}: {
  initialName: string;
  initialEmail: string;
  initialProfilePhoto: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [profilePhoto, setProfilePhoto] = useState(initialProfilePhoto || "");
  const [newPassword, setNewPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        email,
        profilePhoto: profilePhoto || null,
        newPassword: newPassword || undefined,
      };

      const res = await fetch("/api/owner/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not update profile");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsOpen(false);
      setNewPassword(""); // clear password input
      router.refresh(); // Refresh page to reflect new data
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and Email are required");
      return;
    }
    mutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For a real app you'd upload this to an S3 bucket or Cloudinary. 
    // Here we'll convert it to a base64 string to store directly.
    // It works for testing, but in production, real uploads are preferred.
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setProfilePhoto(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {children}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-[1.5rem] bg-[#16161a] p-6 text-white shadow-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="mb-6 text-xl font-bold">Edit Profile</h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Profile Photo */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#d4ff00] bg-zinc-800">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                      {name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                    <Upload className="h-6 w-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-zinc-400">Click photo to change</p>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white focus:border-[#d4ff00] focus:outline-none focus:ring-1 focus:ring-[#d4ff00]"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white focus:border-[#d4ff00] focus:outline-none focus:ring-1 focus:ring-[#d4ff00]"
                  required
                />
                <p className="mt-1 text-[10px] text-zinc-500">Changing email will require you to log in with the new email next time.</p>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">New Password (optional)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white focus:border-[#d4ff00] focus:outline-none focus:ring-1 focus:ring-[#d4ff00]"
                />
              </div>

              {/* Action */}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#d4ff00] text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
