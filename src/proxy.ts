import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret =
  process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-auth-secret";

function isTrialExpired(token: {
  role?: string;
  subscriptionPlan?: string;
  trialEndsAt?: string | null;
}): boolean {
  if (token.role !== "gym_owner") return false;
  if (token.subscriptionPlan !== "TRIAL") return false;
  if (!token.trialEndsAt || typeof token.trialEndsAt !== "string") return false;
  return new Date(token.trialEndsAt).getTime() < Date.now();
}

/** Paths where a trial-expired owner can still act (upgrade / pay). */
function isTrialExemptPath(pathname: string): boolean {
  if (pathname === "/owner/manage-plan" || pathname.startsWith("/owner/manage-plan/")) {
    return true;
  }
  if (pathname.startsWith("/api/owner/manage-plan")) return true;
  if (pathname.startsWith("/api/owner/billing")) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/owner/login") || pathname.startsWith("/superadmin/login")) {
    return NextResponse.next();
  }

  const isOwnerProtected =
    pathname === "/owner" ||
    (pathname.startsWith("/owner/") && !pathname.startsWith("/owner/login"));
  const isSuperadminProtected =
    pathname === "/superadmin" ||
    (pathname.startsWith("/superadmin/") && !pathname.startsWith("/superadmin/login"));
  const isApiOwner = pathname.startsWith("/api/owner/");
  const isApiSuperadmin = pathname.startsWith("/api/superadmin/");

  if (!isOwnerProtected && !isSuperadminProtected && !isApiOwner && !isApiSuperadmin) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret,
    cookieName: "next-auth.session-token",
  });

  if (!token) {
    if (isApiOwner || isApiSuperadmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const role = token.role as string | undefined;

  if (token.accountInvalid === true) {
    if (isApiOwner || isApiSuperadmin) {
      return NextResponse.json({ error: "Account disabled" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("error", "AccountDisabled");
    return NextResponse.redirect(login);
  }

  if (isSuperadminProtected || isApiSuperadmin) {
    if (role !== "superadmin") {
      if (isApiSuperadmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/owner/dashboard", req.url));
    }
  }

  if (isOwnerProtected || isApiOwner) {
    if (role !== "gym_owner") {
      if (isApiOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/superadmin/gym-owners", req.url));
    }
    if (isTrialExpired(token) && !isTrialExemptPath(pathname)) {
      if (isApiOwner) {
        return NextResponse.json(
          { error: "Trial expired. Upgrade or complete billing under Manage plan." },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/owner/manage-plan", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/owner",
    "/owner/:path*",
    "/superadmin",
    "/superadmin/:path*",
    "/api/owner/:path*",
    "/api/superadmin/:path*",
  ],
};
