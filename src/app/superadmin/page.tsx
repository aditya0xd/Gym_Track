import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export default async function SuperAdminIndexPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "superadmin") {
    redirect("/superadmin/gym-owners");
  }
  redirect("/login");
}
