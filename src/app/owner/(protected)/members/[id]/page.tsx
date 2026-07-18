import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { PageShell } from "@/components/layout/PageShell";
import { MemberDetailsClient } from "@/components/owner/members/MemberDetailsClient";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Member details | Gym owner",
};

export default async function OwnerMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading member details...
            </p>
          </div>
        }
      >
        <MemberDetailsClient id={id} />
      </Suspense>
    </PageShell>
  );
}
