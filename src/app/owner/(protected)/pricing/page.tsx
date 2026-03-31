import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { DurationPricingForm } from "@/components/gym-owner/DurationPricingForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Duration pricing | Gym owner",
};

export default async function OwnerPricingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <PageHeader
        title="Membership prices (INR)"
        description="Per duration list prices used when enrolling members."
      />
      <DurationPricingForm />
    </div>
  );
}
