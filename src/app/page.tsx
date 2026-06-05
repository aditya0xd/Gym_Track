import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Gym track",
  description: "Gym owner and superadmin portals.",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "superadmin") {
    redirect("/superadmin/gym-owners");
  } else {
    redirect("/owner/dashboard");
  }
}
