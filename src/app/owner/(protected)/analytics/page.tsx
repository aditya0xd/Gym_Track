import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { OwnerAnalyticsDashboard } from "@/components/gym-owner/OwnerAnalyticsDashboard";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { getOwnerAnalytics } from "@/server/gym-owner/analytics.service";

export const metadata = {
  title: "Analytics | Gym owner",
};

export default async function OwnerAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const analytics = await getOwnerAnalytics(session.user.id);

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
      <OwnerAnalyticsDashboard data={analytics} />
    </PageShell>
  );
}
