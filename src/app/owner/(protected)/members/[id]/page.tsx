import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import { getMemberForOwner } from "@/server/gym-owner/member.service";

export const metadata = {
  title: "Member details | Gym owner",
};

function durationLabel(value: string) {
  return MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

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
  const member = await getMemberForOwner(session.user.id, id);
  if (!member) {
    notFound();
  }

  return (
    <PageShell>
      <PageHeader
        title={member.fullName}
        description={`Member ID: ${member.id}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/owner/dashboard">Back to members</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email: </span>
              {member.email ?? "Not provided"}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {member.phone}
            </p>
            <p>
              <span className="text-muted-foreground">Duration: </span>
              {durationLabel(member.billingDuration)}
            </p>
            <p>
              <span className="text-muted-foreground">Plan price: </span>
              {formatInrFromDecimalString(member.planPrice.toString())}
            </p>
            <p>
              <span className="text-muted-foreground">Payment: </span>
              {member.paymentStatus === "DONE" ? "Done" : "Not done"}
            </p>
            <p>
              <span className="text-muted-foreground">Reminder channel: </span>
              {member.whatsappEnabled ? "WhatsApp" : "SMS"}
            </p>
            <p>
              <span className="text-muted-foreground">Start date: </span>
              {member.startDate.toISOString().slice(0, 10)}
            </p>
            <p>
              <span className="text-muted-foreground">End date: </span>
              {member.endDate.toISOString().slice(0, 10)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member photo</CardTitle>
          </CardHeader>
          <CardContent>
            {member.memberPhoto ? (
              <img
                src={member.memberPhoto}
                alt={`${member.fullName} photo`}
                className="aspect-square w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No photo uploaded.</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>UPI payment screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            {member.upiScreenshot ? (
              <img
                src={member.upiScreenshot}
                alt={`UPI screenshot for ${member.fullName}`}
                className="max-h-[480px] w-full rounded-lg border border-border object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No UPI screenshot uploaded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
