import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateCachedOwner } from "@/lib/auth-cache";
import { MemberBillingDuration } from "@/generated/prisma/client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "gym_owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { gymName, pricing } = body;

    if (!gymName || !pricing || typeof pricing.monthly !== "number") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const adminUserId = session.user.id;

    await prisma.$transaction(async (tx) => {
      // 1. Update AdminUser
      await tx.adminUser.update({
        where: { id: adminUserId },
        data: {
          gymName: gymName,
          onboardingComplete: true,
        },
      });

      // 2. Create default Membership Plan
      const plan = await tx.gymMembershipPlan.create({
        data: {
          adminUserId,
          name: "Standard Plan",
          description: "Our standard membership plan.",
        },
      });

      // 3. Create Pricing
      const prices = [];
      prices.push({
        planId: plan.id,
        duration: MemberBillingDuration.ONE_MONTH,
        priceInr: pricing.monthly,
      });

      if (pricing.threeMonths) {
        prices.push({
          planId: plan.id,
          duration: MemberBillingDuration.THREE_MONTHS,
          priceInr: pricing.threeMonths,
        });
      }
      
      if (pricing.sixMonths) {
        prices.push({
          planId: plan.id,
          duration: MemberBillingDuration.SIX_MONTHS,
          priceInr: pricing.sixMonths,
        });
      }

      if (pricing.twelveMonths) {
        prices.push({
          planId: plan.id,
          duration: MemberBillingDuration.TWELVE_MONTHS,
          priceInr: pricing.twelveMonths,
        });
      }

      await tx.gymMembershipPlanDurationPrice.createMany({
        data: prices,
      });
    });

    // Invalidate Redis cache so next request fetches fresh DB state
    await invalidateCachedOwner(adminUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
