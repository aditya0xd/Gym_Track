import { redirect } from "next/navigation";

export const metadata = {
  title: "Gym track",
  description: "Gym owner and superadmin portals.",
};

export default function HomePage() {
  redirect("/login");
}
