import { redirect } from "next/navigation";

/** Legacy URL: superadmin now uses the shared `/login` page. */
export default function SuperadminLoginRedirectPage() {
  redirect("/login");
}
