import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { MemberEnrollForm } from "@/components/gym-owner/MemberEnrollForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
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
    <PageShell>
      <PageHeader
        title="Enroll member"
        description="Uses your saved INR prices for 1 / 3 / 6 / 12 month durations."
        actions={
          <Button variant="outline" asChild>
            <Link href="/owner/dashboard">Back to members</Link>
          </Button>
        }
      />
      <MemberEnrollForm />
    </PageShell>
  );
}
