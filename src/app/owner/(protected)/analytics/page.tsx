import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { OwnerAnalyticsClient } from "@/components/gym-owner/OwnerAnalyticsClient";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { hasGymOwnerPlanFeature } from "@/lib/plan-features/guard";

export const metadata = {
  title: "Analytics | Gym owner",
};

export default async function OwnerAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const hasAnalytics = await hasGymOwnerPlanFeature(session, "ANALYTICS");
  if (!hasAnalytics) {
    redirect("/owner/dashboard");
  }

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Retention, churn, payment and revenue intelligence for your gym."
        actions={
          <Button variant="outline" asChild>
            <Link href="/owner/dashboard">Back to members</Link>
          </Button>
        }
      />
      <Suspense
        fallback={
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading analytics...
            </p>
          </div>
        }
      >
        <OwnerAnalyticsClient />
      </Suspense>
    </PageShell>
  );
}
