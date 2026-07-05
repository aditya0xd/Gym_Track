import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { BarChart3, ArrowLeft, Sparkles } from "lucide-react";

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

      {hasAnalytics ? (
        <Suspense
          fallback={
            <div className="flex min-h-100 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8">
              <BarChart3 className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading analytics...
              </p>
            </div>
          }
        >
          <OwnerAnalyticsClient />
        </Suspense>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[#d4ff00]/15 p-2 text-[#d4ff00]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Analytics is not available on your current plan
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upgrade to unlock retention, churn, payment, and revenue insights for your gym.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/owner/manage-plan">Manage plan</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/owner/dashboard" className="inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
