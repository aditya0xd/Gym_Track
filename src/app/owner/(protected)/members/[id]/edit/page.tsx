import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { MemberEditClient } from "@/components/gym-owner/MemberEditClient";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Edit member | Gym owner",
};

export default async function EditMemberPage({
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
    <div className="min-h-screen bg-background pt-4">
      <MemberEditClient id={id} />
    </div>
  );
}
