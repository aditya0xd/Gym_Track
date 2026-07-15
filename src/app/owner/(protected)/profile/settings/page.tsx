"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Globe, Moon, Sun, Shield, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EditProfileDialog } from "@/components/gym-owner/EditProfileDialog";
import { PasswordResetDialog } from "@/components/gym-owner/PasswordResetDialog";
import Image from "next/image";

export default function OwnerSettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("English");
  const [ownerName, setOwnerName] = useState("Owner");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOwnerData() {
      try {
        const res = await fetch("/api/owner/profile");
        if (res.ok) {
          const data = await res.json();
          setOwnerName(data.name || "Owner");
          setOwnerEmail(data.email || "");
          setProfilePhoto(data.profilePhoto || null);
        }
      } catch (error) {
        console.error("Failed to fetch owner data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOwnerData();
  }, []);

  const handleToggleNotifications = () => {
    setNotifications(!notifications);
    toast.success(notifications ? "Notifications disabled" : "Notifications enabled");
  };

  const handleToggleTheme = () => {
    setDarkMode(!darkMode);
    toast.success(darkMode ? "Light mode enabled" : "Dark mode enabled");
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    toast.success(`Language changed to ${lang}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] text-white p-6 flex flex-col max-w-2xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/owner/profile" className="mr-4 text-[#d4ff00] hover:text-[#b0e000] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold flex-1">Settings</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0c] text-white p-6 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href="/owner/profile" className="mr-4 text-[#d4ff00] hover:text-[#b0e000] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold flex-1">Settings</h1>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4ff00] mb-4">
            Profile Settings
          </h2>
          
          {/* Profile Card with Edit */}
          <div className="rounded-2xl bg-[#292929] p-5">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#d4ff00] bg-zinc-800 text-lg font-bold">
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt="Profile"
                    fill
                    sizes="64px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  ownerName.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-bold text-white">{ownerName}</p>
                  <EditProfileDialog
                    initialName={ownerName}
                    initialEmail={ownerEmail}
                    initialProfilePhoto={profilePhoto}
                  >
                    <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400 transition-colors hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </EditProfileDialog>
                </div>
              </div>
            </div>

            {/* Additional Profile Details */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Account Type</span>
                <span className="text-xs font-medium text-white">Gym Owner</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Member Since</span>
                <span className="text-xs font-medium text-white">2024</span>
              </div>
            </div>
          </div>
        </div>

        {/* App Settings */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4ff00] mb-4">
            App Settings
          </h2>
          <div className="space-y-3">
            {/* Notifications */}
            <div className="flex items-center gap-4 rounded-2xl p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Notifications</p>
                <p className="text-xs text-zinc-500">Payment reminders & alerts</p>
              </div>
              <button
                onClick={handleToggleNotifications}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  notifications ? "bg-[#d4ff00]" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    notifications ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Theme */}
            <div className="flex items-center gap-4 rounded-2xl p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Dark Mode</p>
                <p className="text-xs text-zinc-500">Toggle theme appearance</p>
              </div>
              <button
                onClick={handleToggleTheme}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  darkMode ? "bg-[#d4ff00]" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    darkMode ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center gap-4 rounded-2xl p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
                <Globe className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Language</p>
                <p className="text-xs text-zinc-500">App language preference</p>
              </div>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-[#d4ff00] focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4ff00] mb-4">
            Security
          </h2>
          <div className="space-y-3">
            <PasswordResetDialog>
              <div className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5 cursor-pointer">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Change Password</p>
                  <p className="text-xs text-zinc-500">Update your password</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </div>
            </PasswordResetDialog>
          </div>
        </div>

        {/* About */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4ff00] mb-4">
            About
          </h2>
          <div className="space-y-2 text-sm text-zinc-400">
            <p>Version: 1.0.0</p>
            <p>Made for gym owners, by gym owners</p>
          </div>
        </div>
      </div>
    </div>
  );
}
