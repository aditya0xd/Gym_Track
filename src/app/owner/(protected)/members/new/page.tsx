import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { MemberEnrollForm } from "@/components/gym-owner/MemberEnrollForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Enroll member | Gym owner",
};

export default async function OwnerEnrollMemberPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <PageHeader
        title="Enroll member"
        description="Uses your saved INR prices for 1 / 3 / 6 / 12 month durations."
        actions={
          <Button variant="outline" asChild className="border-white/20 text-slate-100">
            <Link href="/owner/dashboard">Back to members</Link>
          </Button>
        }
      />
      <MemberEnrollForm />
    </div>
  );
}
