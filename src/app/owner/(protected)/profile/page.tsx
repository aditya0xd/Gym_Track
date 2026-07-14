import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  Users,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  FileSpreadsheet,
  CreditCard,
  Settings,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditProfileDialog } from "@/components/gym-owner/EditProfileDialog";
import { SignOutButton } from "@/components/gym-owner/SignOutButton";

export const metadata = {
  title: "Profile | GymTrack Pro",
};

export default async function OwnerProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const ownerId = session.user.id;
  // Fetch real owner details from DB to ensure we get the latest email and profilePhoto
  const ownerRecord = await prisma.adminUser.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true, profilePhoto: true },
  });

  const ownerName = ownerRecord?.name || session.user.name || "Owner";
  const ownerEmail = ownerRecord?.email || session.user.email || "";
  const profilePhoto = ownerRecord?.profilePhoto || null;

  // Fetch some real stats
  const totalMembers = await prisma.member.count({
    where: { adminUserId: ownerId, deletedAt: null },
  });

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const activeMembers = await prisma.member.count({
    where: {
      adminUserId: ownerId,
      deletedAt: null,
      membershipStatus: "ACTIVE",
      endDate: { gte: today },
    },
  });

  const plansCount = await prisma.gymMembershipPlan.count({
    where: { adminUserId: ownerId, deletedAt: null },
  });

  const gymName = "GymTrack Pro";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0c] px-4 pt-4 text-white font-sans">
      <div className="shrink-0 space-y-4 pb-4">
        <div className="pt-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">
            ACCOUNT
          </p>
          <h1 className="mt-1 text-3xl font-extrabold">Profile</h1>
        </div>
        {/* Profile Card */}
        <div className="flex items-center gap-4 rounded-[1.5rem] bg-[#16161a] p-5">
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
            <h2 className="truncate text-lg font-bold">{ownerName}</h2>
            <p className="truncate text-sm text-zinc-400">{ownerEmail}</p>
            <div className="mt-1.5 flex items-center gap-1.5 rounded-full bg-[#d4ff00]/10 px-2 py-0.5 w-max">
              <ShieldCheck className="h-3 w-3 text-[#d4ff00]" />
              <span className="text-[10px] font-black uppercase tracking-wide text-[#d4ff00]">
                OWNER · {gymName}
              </span>
            </div>
          </div>

          <EditProfileDialog
            initialName={ownerName}
            initialEmail={ownerEmail}
            initialProfilePhoto={profilePhoto}
          >
            <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-400 transition-colors hover:text-white">
              <ExternalLink className="h-4 w-4" />
            </button>
          </EditProfileDialog>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-24">
        {/* Stats Row */}
        <div className="flex divide-x divide-white/5 rounded-[1.5rem] bg-[#16161a] py-5">
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-xl font-bold">{totalMembers}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              MEMBERS
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-xl font-bold">{activeMembers}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              ACTIVE
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-xl font-bold">{plansCount}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              PLANS
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-2">
          {/* Menu Item: Manage Plan */}
          <Link
            href="/owner/manage-plan"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Manage Plan</p>
              <p className="text-xs text-zinc-500">Subscription & billing</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>
          <div className="mx-4 my-1 h-px bg-white/5" />
          {/* Menu Item: Edit Gym Details */}
          {/* <Link
            href="/owner/manage-plan"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Edit Gym Details</p>
              <p className="text-xs text-zinc-500">Name, address & timings</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>
          
          <div className="mx-4 my-1 h-px bg-white/5" /> */}

          {/* Menu Item: Staff Management */}
          <Link
            href="/owner/profile/staff"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Staff Management</p>
              <p className="text-xs text-zinc-500">Trainers & managers</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>

          <div className="mx-4 my-1 h-px bg-white/5" />

          {/* Menu Item: Enroll Bulk Member */}
          <Link
            href="/owner/members/bulk"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Enroll bulk member</p>
              <p className="text-xs text-zinc-500">Upload CSV file</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>

          {/* Menu Item: Notifications */}
          {/* <div className="flex items-center gap-4 rounded-2xl p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Notifications</p>
            </div> */}
          {/* Toggle mock */}
          {/* <div className="relative h-6 w-11 rounded-full bg-[#d4ff00]">
              <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white"></div>
            </div>
          </div>

          <div className="mx-4 my-1 h-px bg-white/5" /> */}

          {/* Menu Item: Expiry Reminders */}
          {/* <div className="flex items-center gap-4 rounded-2xl p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <AlarmClock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Expiry Reminders</p>
            </div> */}
          {/* Toggle mock */}
          {/* <div className="relative h-6 w-11 rounded-full bg-[#d4ff00]">
              <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white"></div>
            </div>
          </div> */}

          <div className="mx-4 my-1 h-px bg-white/5" />

          {/* Menu Item: Language */}
          <Link
            href="/owner/profile"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Language</p>
              <p className="text-xs text-zinc-500">English</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>

          <div className="mx-4 my-1 h-px bg-white/5" />

          {/* Menu Item: Settings */}
          <Link
            href="/owner/settings"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <Settings className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Settings</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>

          <div className="mx-4 my-1 h-px bg-white/5" />
          {/* Menu Item: Help & Support */}
          <Link
            href="/owner/profile/help"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Help & Support</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>

          <div className="mx-4 my-1 h-px bg-white/5" />

          {/* Menu Item: About GymTrack Pro */}
          <Link
            href="/owner/profile"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <Info className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">About GymTrack Pro</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>


        </div>

        {/* Log out Button */}
        <SignOutButton />
      </div>
    </div>
  );
}
