import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  Users,
  Globe,
  HelpCircle,
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
import { SignOutButton } from "@/components/owner/shared/SignOutButton";

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
    <div className="flex h-screen flex-col overflow-hidden bg-background px-4 pt-4 text-foreground font-sans">
      <div className="shrink-0 space-y-4 pb-4">
        <div className="pt-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            ACCOUNT
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-foreground">Profile</h1>
        </div>
        {/* Profile Card */}
        <div className="flex items-center gap-4 rounded-[1.5rem] bg-card border border-border p-5">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-secondary text-secondary-foreground text-lg font-bold">
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
            <h2 className="truncate text-lg font-bold text-foreground">{ownerName}</h2>
            <p className="truncate text-sm text-muted-foreground">{ownerEmail}</p>
            <div className="mt-1.5 flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 w-max">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-wide text-primary">
                OWNER · {gymName}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-24">
        {/* Stats Row */}
        <div className="flex divide-x divide-border rounded-[1.5rem] bg-card border border-border py-5">
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-xl font-bold text-foreground">{totalMembers}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              MEMBERS
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-xl font-bold text-foreground">{activeMembers}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              ACTIVE
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-xl font-bold text-foreground">{plansCount}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              PLANS
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="rounded-[1.5rem] bg-card border border-border p-2">
          {/* Menu Item: Manage Plan */}
          <Link
            href="/owner/manage-plan"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Manage Plan</p>
              <p className="text-xs text-muted-foreground">Subscription & billing</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="mx-4 my-1 h-px bg-border" />
          {/* Menu Item: Edit Gym Details */}
          {/* <Link
            href="/owner/manage-plan"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Edit Gym Details</p>
              <p className="text-xs text-muted-foreground">Name, address & timings</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          
          <div className="mx-4 my-1 h-px bg-border" /> */}

          {/* Menu Item: Staff Management */}
          <Link
            href="/owner/profile/staff"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Staff Management</p>
              <p className="text-xs text-muted-foreground">Trainers & managers</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <div className="mx-4 my-1 h-px bg-border" />

          {/* Menu Item: Enroll Bulk Member */}
          <Link
            href="/owner/members/bulk"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Enroll bulk member</p>
              <p className="text-xs text-muted-foreground">Upload CSV file</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* Menu Item: Notifications */}
          {/* <div className="flex items-center gap-4 rounded-2xl p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Notifications</p>
            </div> */}
          {/* Toggle mock */}
          {/* <div className="relative h-6 w-11 rounded-full bg-primary">
              <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white"></div>
            </div>
          </div>

          <div className="mx-4 my-1 h-px bg-border" /> */}

          {/* Menu Item: Expiry Reminders */}
          {/* <div className="flex items-center gap-4 rounded-2xl p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <AlarmClock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Expiry Reminders</p>
            </div> */}
          {/* Toggle mock */}
          {/* <div className="relative h-6 w-11 rounded-full bg-primary">
              <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white"></div>
            </div>
          </div> */}

          <div className="mx-4 my-1 h-px bg-border" />

          {/* Menu Item: Language */}
          <Link
            href="/owner/profile"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Language</p>
              <p className="text-xs text-muted-foreground">English</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <div className="mx-4 my-1 h-px bg-border" />

          {/* Menu Item: Settings */}
          <Link
            href="/owner/profile/settings"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Settings</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <div className="mx-4 my-1 h-px bg-border" />
          {/* Menu Item: Help & Support */}
          <Link
            href="/owner/profile/help"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Help & Support</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <div className="mx-4 my-1 h-px bg-border" />

          {/* Menu Item: About GymTrack Pro */}
          <Link
            href="/owner/profile/about"
            className="flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">About GymTrack Pro</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>


        </div>

        {/* Log out Button */}
        <SignOutButton />
      </div>
    </div>
  );
}
