import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { MemberEnrollForm } from "@/components/owner/members/MemberEnrollForm";
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
    <div className="min-h-screen bg-background pt-4">
      <MemberEnrollForm />
    </div>
  );
}
