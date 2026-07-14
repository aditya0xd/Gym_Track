"use client";

import { useState } from "react";
import { LogOut, X } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-[1.5rem] border border-red-500/20 bg-red-500/10 py-4 text-sm font-bold text-red-500 transition-all hover:bg-red-500/20 active:scale-[0.98]"
      >
        <LogOut className="h-5 w-5" />
        Log out securely
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isSigningOut && setIsOpen(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-[#16161a] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <LogOut className="h-6 w-6" />
            </div>
            
            <h3 className="mb-2 text-xl font-extrabold text-white">
              Sign out?
            </h3>
            <p className="mb-8 text-sm text-zinc-400">
              Are you sure you want to sign out of GymTrack Pro? You will need to log in again to access your dashboard.
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-xl bg-white/5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="flex-1 rounded-xl bg-red-500 py-3.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSigningOut ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : null}
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
