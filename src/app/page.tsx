import { redirect } from "next/navigation";

export const metadata = {
  title: "Gym Admin Login",
  description:
    "Login to mint JWT access and refresh tokens for the gym dashboard.",
};

export default function Home() {
  redirect("/login");
}
