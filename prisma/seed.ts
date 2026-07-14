import { randomUUID } from "crypto";
import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function d(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

// Dates relative to today: 2026-07-08
const DEMO_PASSWORD_HASH =
  "$2b$12$RdjIdI3NGH1r.e/9Oq2naupYNxIaZ808kW3/mjeflM3/q/GxLsm7m"; // GymPass123!

const SUPERADMIN_ID = "77777777-7777-7777-7777-777777777770";
const SUPERADMIN_EMAIL = "superadmin@gym.local";

const OWNER_ADMIN_ID = "99999999-9999-9999-9999-999999999999";
const OWNER_ADMIN_EMAIL = "seed-admin@gym.local";

const MANAGER_ADMIN_ID = "88888888-8888-8888-8888-888888888888";
const MANAGER_ADMIN_EMAIL = "demo.manager@gym.local";

async function seedDurationPrices(
  adminUserId: string,
  prices: Record<
    "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS" | "TWELVE_MONTHS",
    string
  >,
) {
  const entries = Object.entries(prices) as [keyof typeof prices, string][];
  for (const [duration, priceInr] of entries) {
    await prisma.gymOwnerDurationPrice.upsert({
      where: {
        adminUserId_duration: { adminUserId, duration },
      },
      create: {
        id: randomUUID(),
        adminUserId,
        duration,
        priceInr: new Prisma.Decimal(priceInr),
      },
      update: { priceInr: new Prisma.Decimal(priceInr) },
    });
  }
}

async function main() {
  const trialFar = new Date();
  trialFar.setUTCDate(trialFar.getUTCDate() + 30);

  // ─── Superadmin ────────────────────────────────────────────────────────────
  await prisma.superAdminUser.upsert({
    where: { id: SUPERADMIN_ID },
    create: {
      id: SUPERADMIN_ID,
      name: "Platform Superadmin",
      email: SUPERADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
    },
    update: {
      name: "Platform Superadmin",
      email: SUPERADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
    },
  });

  // ─── Gym Owner (PRO plan) ───────────────────────────────────────────────────
  await prisma.adminUser.upsert({
    where: { id: OWNER_ADMIN_ID },
    create: {
      id: OWNER_ADMIN_ID,
      name: "Ravi Mehta",
      email: OWNER_ADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
      subscriptionPlan: "PRO",
      trialEndsAt: trialFar,
      gymName: "Ravi's Gym",
      onboardingComplete: true,
    },
    update: {
      name: "Ravi Mehta",
      email: OWNER_ADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
      subscriptionPlan: "PRO",
      trialEndsAt: trialFar,
      gymName: "Ravi's Gym",
      onboardingComplete: true,
    },
  });

  // ─── Manager (STARTER plan) ────────────────────────────────────────────────
  await prisma.adminUser.upsert({
    where: { id: MANAGER_ADMIN_ID },
    create: {
      id: MANAGER_ADMIN_ID,
      name: "Ananya Desai",
      email: MANAGER_ADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
      subscriptionPlan: "STARTER",
      trialEndsAt: trialFar,
      gymName: "Ananya's Gym",
      onboardingComplete: true,
    },
    update: {
      name: "Ananya Desai",
      email: MANAGER_ADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
      subscriptionPlan: "STARTER",
      trialEndsAt: trialFar,
      gymName: "Ananya's Gym",
      onboardingComplete: true,
    },
  });

  // ─── Pricing ────────────────────────────────────────────────────────────────
  await seedDurationPrices(OWNER_ADMIN_ID, {
    ONE_MONTH: "999.00",
    THREE_MONTHS: "2699.00",
    SIX_MONTHS: "4999.00",
    TWELVE_MONTHS: "8999.00",
  });

  await seedDurationPrices(MANAGER_ADMIN_ID, {
    ONE_MONTH: "1199.00",
    THREE_MONTHS: "3199.00",
    SIX_MONTHS: "5799.00",
    TWELVE_MONTHS: "9999.00",
  });

  // ─── Clear members & reminders for a clean re-seed ────────────────────────
  type MemberSeed = Omit<Prisma.MemberCreateInput, "adminUser"> & {
    id: string;
  };

  await prisma.reminderLog.deleteMany({});
  await prisma.member.deleteMany({});

  // ─── Owner Members (dates relative to 2026-07-08) ─────────────────────────
  // Mix of: ACTIVE (future endDate), expiring soon, expired (past endDate), PAUSED
  // Added members with renewal history for analytics testing
  const ownerMembers: MemberSeed[] = [
    {
      // Active — annual plan, mid-term, with inline renewal
      id: "11111111-1111-1111-1111-111111111111",
      fullName: "Aditya Sharma",
      email: "aditya@example.com",
      phone: "9990001111",
      billingDuration: "TWELVE_MONTHS",
      planPrice: new Prisma.Decimal("8999.00"),
      startDate: d("2026-01-01"),
      endDate: d("2027-12-31"), // Extended by renewal
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Active — 3-month plan, started last month, renewed inline
      id: "22222222-2222-2222-2222-222222222222",
      fullName: "Priya Verma",
      email: "priya@example.com",
      phone: "9990002222",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("2699.00"),
      startDate: d("2026-06-01"),
      endDate: d("2026-10-31"), // Extended by renewal
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Active — 6-month plan, partial payment
      id: "33333333-3333-3333-3333-333333333333",
      fullName: "Rahul Singh",
      email: "rahul@example.com",
      phone: "9990003333",
      billingDuration: "SIX_MONTHS",
      planPrice: new Prisma.Decimal("4999.00"),
      startDate: d("2026-04-01"),
      endDate: d("2026-09-30"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: false,
    },
    {
      // Expiring soon — ends in 3 days
      id: "44444444-4444-4444-4444-444444444444",
      fullName: "Neha Kapoor",
      email: null,
      phone: "9990004444",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-06-08"),
      endDate: d("2026-07-11"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Expiring very soon — ends tomorrow
      id: "55555555-5555-5555-5555-555555555555",
      fullName: "Vikram Joshi",
      email: "vikram.joshi@example.com",
      phone: "9990005555",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-06-09"),
      endDate: d("2026-07-09"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Expired — 1 week ago, did NOT renew (churn)
      id: "66666666-6666-6666-6666-666666666666",
      fullName: "Kavya Nair",
      email: "kavya.nair@example.com",
      phone: "9990006666",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-05-28"),
      endDate: d("2026-06-27"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Expired 2 weeks ago, DID renew inline (renewal success) - completed renewal opportunity
      id: "77777777-7777-7777-7777-777777777771",
      fullName: "Arjun Patel",
      email: "arjun.patel@example.com",
      phone: "9990007777",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("2699.00"),
      startDate: d("2026-03-18"),
      endDate: d("2026-06-17"), // Original period ended 3 weeks ago
      membershipStatus: "ACTIVE",
      whatsappEnabled: false,
    },
    {
      // Expired 1 week ago, DID renew inline (renewal success) - completed renewal opportunity
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6",
      fullName: "Deepa Sharma",
      email: "deepa.sharma@example.com",
      phone: "9990014444",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-06-01"),
      endDate: d("2026-06-30"), // Original period ended 1 week ago
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Active — started this month (new member)
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      fullName: "Meera Iyer",
      email: "meera.iyer@example.com",
      phone: "9990008888",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-07-01"),
      endDate: d("2026-07-31"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // PAUSED — mid-plan
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      fullName: "Sanjay Reddy",
      email: "sanjay.reddy@example.com",
      phone: "9990009999",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("2699.00"),
      startDate: d("2026-05-01"),
      endDate: d("2026-07-31"),
      membershipStatus: "PAUSED",
      pausedAt: new Date("2026-06-25T00:00:00.000Z"),
      whatsappEnabled: true,
    },
    {
      // Active — long term annual
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      fullName: "Tara Menon",
      email: "tara.menon@example.com",
      phone: "9990010000",
      billingDuration: "TWELVE_MONTHS",
      planPrice: new Prisma.Decimal("8999.00"),
      startDate: d("2026-03-01"),
      endDate: d("2027-02-28"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Active — with a discount applied
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4",
      fullName: "Kunal Sharma",
      email: "kunal.sharma@example.com",
      phone: "9990011111",
      billingDuration: "SIX_MONTHS",
      planPrice: new Prisma.Decimal("4999.00"),
      discountInr: new Prisma.Decimal("500.00"),
      startDate: d("2026-05-01"),
      endDate: d("2026-10-31"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Expired — 1 month ago, payment not done
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5",
      fullName: "Pooja Agarwal",
      email: "pooja.agarwal@example.com",
      phone: "9990012222",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-05-05"),
      endDate: d("2026-06-04"),
      membershipStatus: "ACTIVE",
      paymentStatus: "NOT_DONE",
      whatsappEnabled: false,
    },
    {
      // Expired — 3 months ago, did NOT renew (churn)
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5",
      fullName: "Suresh Kumar",
      email: "suresh.kumar@example.com",
      phone: "9990013333",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("2699.00"),
      startDate: d("2026-01-15"),
      endDate: d("2026-04-14"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      // Stale active — no updates in 10+ days
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc5",
      fullName: "Rajesh Verma",
      email: "rajesh.verma@example.com",
      phone: "9990015555",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-06-15"),
      endDate: d("2026-07-15"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: false,
      updatedAt: d("2026-06-20"), // Stale - no updates in 18 days
    },
  ];

  // ─── Manager Members ────────────────────────────────────────────────────────
  const managerMembers: MemberSeed[] = [
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      fullName: "Ishaan Khanna",
      email: "ishaan.khanna@example.com",
      phone: "9880011100",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("1199.00"),
      startDate: d("2026-07-01"),
      endDate: d("2026-07-31"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
      fullName: "Diya Malhotra",
      email: "diya.malhotra@example.com",
      phone: "9880022200",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("3199.00"),
      startDate: d("2026-05-01"),
      endDate: d("2026-07-31"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3",
      fullName: "Rohan Bose",
      email: null,
      phone: "9880033300",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("1199.00"),
      startDate: d("2026-06-10"),
      endDate: d("2026-07-09"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: false,
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4",
      fullName: "Sneha Pillai",
      email: "sneha.pillai@example.com",
      phone: "9880044400",
      billingDuration: "TWELVE_MONTHS",
      planPrice: new Prisma.Decimal("9999.00"),
      startDate: d("2026-01-15"),
      endDate: d("2027-01-14"),
      membershipStatus: "ACTIVE",
      whatsappEnabled: true,
    },
  ];

  for (const m of ownerMembers) {
    const { id, ...data } = m;
    await prisma.member.upsert({
      where: { id },
      create: {
        id,
        ...data,
        adminUser: { connect: { id: OWNER_ADMIN_ID } },
      },
      update: {
        ...data,
        adminUser: { connect: { id: OWNER_ADMIN_ID } },
      },
    });
  }

  for (const m of managerMembers) {
    const { id, ...data } = m;
    await prisma.member.upsert({
      where: { id },
      create: {
        id,
        ...data,
        adminUser: { connect: { id: MANAGER_ADMIN_ID } },
      },
      update: {
        ...data,
        adminUser: { connect: { id: MANAGER_ADMIN_ID } },
      },
    });
  }

  // ─── Member payment states for analytics visibility ───────────────────────
  await prisma.member.update({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    data: {
      paymentStatus: "DONE",
      amountPaid: new Prisma.Decimal("8999.00"),
    },
  });

  await prisma.member.update({
    where: { id: "22222222-2222-2222-2222-222222222222" },
    data: {
      paymentStatus: "DONE",
      amountPaid: new Prisma.Decimal("2699.00"),
    },
  });

  await prisma.member.update({
    where: { id: "33333333-3333-3333-3333-333333333333" },
    data: {
      paymentStatus: "PARTIAL",
      amountPaid: new Prisma.Decimal("2500.00"),
    },
  });

  await prisma.member.update({
    where: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5" },
    data: {
      paymentStatus: "NOT_DONE",
      amountPaid: new Prisma.Decimal("0.00"),
    },
  });

  // ─── Membership renewals to drive renewal/churn analytics ───────────────
  // These create realistic renewal scenarios for analytics testing
  const renewalSeeds = [
    {
      memberId: "11111111-1111-1111-1111-111111111111",
      billingDuration: "TWELVE_MONTHS" as const,
      planPrice: new Prisma.Decimal("8999.00"),
      amountPaid: new Prisma.Decimal("8999.00"),
      periodStart: d("2026-12-31"),
      periodEnd: d("2027-12-31"),
      paymentStatus: "DONE" as const,
      paymentProvider: "MANUAL" as const,
      paidAt: d("2026-04-15"),
    },
    {
      memberId: "22222222-2222-2222-2222-222222222222",
      billingDuration: "THREE_MONTHS" as const,
      planPrice: new Prisma.Decimal("2699.00"),
      amountPaid: new Prisma.Decimal("2699.00"),
      periodStart: d("2026-08-01"),
      periodEnd: d("2026-10-31"),
      paymentStatus: "DONE" as const,
      paymentProvider: "MANUAL" as const,
      paidAt: d("2026-07-01"),
    },
    {
      memberId: "77777777-7777-7777-7777-777777777771",
      billingDuration: "ONE_MONTH" as const,
      planPrice: new Prisma.Decimal("999.00"),
      amountPaid: new Prisma.Decimal("999.00"),
      periodStart: d("2026-06-20"),
      periodEnd: d("2026-07-05"), // Renewal period ended 3 days ago (within 30 day window)
      paymentStatus: "DONE" as const,
      paymentProvider: "MANUAL" as const,
      paidAt: d("2026-06-20"),
    },
    {
      memberId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6",
      billingDuration: "ONE_MONTH" as const,
      planPrice: new Prisma.Decimal("999.00"),
      amountPaid: new Prisma.Decimal("999.00"),
      periodStart: d("2026-07-02"),
      periodEnd: d("2026-07-07"), // Renewal period ended yesterday (within 30 day window)
      paymentStatus: "DONE" as const,
      paymentProvider: "MANUAL" as const,
      paidAt: d("2026-07-02"),
    },
    {
      memberId: "33333333-3333-3333-3333-333333333333",
      billingDuration: "SIX_MONTHS" as const,
      planPrice: new Prisma.Decimal("4999.00"),
      amountPaid: new Prisma.Decimal("2500.00"),
      periodStart: d("2026-05-01"),
      periodEnd: d("2026-10-31"),
      paymentStatus: "PARTIAL" as const,
      paymentProvider: "MANUAL" as const,
      paidAt: d("2026-05-01"),
    },
    {
      memberId: "44444444-4444-4444-4444-444444444444",
      billingDuration: "ONE_MONTH" as const,
      planPrice: new Prisma.Decimal("999.00"),
      amountPaid: new Prisma.Decimal("999.00"),
      periodStart: d("2026-07-11"),
      periodEnd: d("2026-08-11"),
      paymentStatus: "DONE" as const,
      paymentProvider: "MANUAL" as const,
      paidAt: d("2026-07-05"),
    },
    {
      memberId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6",
      billingDuration: "ONE_MONTH" as const,
      planPrice: new Prisma.Decimal("999.00"),
      amountPaid: new Prisma.Decimal("999.00"),
      periodStart: d("2026-07-01"),
      periodEnd: d("2026-08-31"),
      paymentStatus: "DONE" as const,
      paymentProvider: "MANUAL" as const,
      paidAt: d("2026-06-28"),
    },
  ];

  for (const renewal of renewalSeeds) {
    await prisma.membershipRenewal.create({ data: renewal });
  }

  // ─── Reminder Logs ──────────────────────────────────────────────────────────
  const reminderLogs: Array<Prisma.ReminderLogCreateInput & { id: string }> = [
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc1",
      member: { connect: { id: "11111111-1111-1111-1111-111111111111" } },
      channel: "WHATSAPP",
      status: "SENT",
      sentAt: new Date("2026-06-28T09:00:00.000Z"),
      message:
        "Hi Aditya, your annual membership is active till 31 Dec 2026. Keep it up!",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc2",
      member: { connect: { id: "22222222-2222-2222-2222-222222222222" } },
      channel: "SMS",
      status: "DELIVERED",
      sentAt: new Date("2026-07-01T10:30:00.000Z"),
      message: "Hi Priya, your 3-month plan is active till 31 Aug 2026.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc3",
      member: { connect: { id: "44444444-4444-4444-4444-444444444444" } },
      channel: "WHATSAPP",
      status: "DELIVERED",
      sentAt: new Date("2026-07-03T08:00:00.000Z"),
      message:
        "Hi Neha, your membership expires in 5 days on 8 Jul. Renew now to avoid a gap!",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc4",
      member: { connect: { id: "55555555-5555-5555-5555-555555555555" } },
      channel: "WHATSAPP",
      status: "SENT",
      sentAt: new Date("2026-07-04T07:00:00.000Z"),
      message:
        "Hi Vikram, urgent: your membership expires TOMORROW on 6 Jul. Renew today!",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc5",
      member: { connect: { id: "66666666-6666-6666-6666-666666666666" } },
      channel: "SMS",
      status: "SENT",
      sentAt: new Date("2026-06-25T14:00:00.000Z"),
      message:
        "Hi Kavya, your membership expired on 27 Jun. Please renew to continue access.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc6",
      member: { connect: { id: "77777777-7777-7777-7777-777777777771" } },
      channel: "SMS",
      status: "FAILED",
      sentAt: new Date("2026-06-15T11:45:00.000Z"),
      message:
        "Hi Arjun, SMS reminder failed — please verify your registered phone number.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc7",
      member: { connect: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1" } },
      channel: "WHATSAPP",
      status: "SENT",
      sentAt: new Date("2026-07-01T09:30:00.000Z"),
      message:
        "Hi Meera, welcome! Your July membership is active. See you at the gym 💪",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc8",
      member: { connect: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2" } },
      channel: "WHATSAPP",
      status: "DELIVERED",
      sentAt: new Date("2026-06-25T10:00:00.000Z"),
      message:
        "Hi Sanjay, your membership has been paused. Contact us when you want to resume.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc9",
      member: { connect: { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1" } },
      channel: "WHATSAPP",
      status: "DELIVERED",
      sentAt: new Date("2026-07-01T16:00:00.000Z"),
      message:
        "Hi Ishaan, welcome for July! Your monthly pass is active. See you soon.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccca",
      member: { connect: { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3" } },
      channel: "SMS",
      status: "SENT",
      sentAt: new Date("2026-07-03T12:00:00.000Z"),
      message:
        "Hi Rohan, your membership expires in 6 days on 9 Jul. Please renew soon.",
    },
  ];

  for (const r of reminderLogs) {
    const { id, ...data } = r;
    await prisma.reminderLog.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }

  console.log("✅ Seed complete.");
  console.log("  Superadmin:", SUPERADMIN_EMAIL, "| password: GymPass123!");
  console.log("  Owner:     ", OWNER_ADMIN_EMAIL, "| password: GymPass123!");
  console.log("  Manager:   ", MANAGER_ADMIN_EMAIL, "| password: GymPass123!");
  console.log("");
  console.log("  Owner member breakdown (15 members):");
  console.log("    • 10 ACTIVE (various plans)");
  console.log("    • 1 PAUSED (Sanjay Reddy)");
  console.log("    • 4 expired / expiring soon");
  console.log("    • 6 membership renewals for analytics testing");
  console.log("    • 1 stale member (no updates in 10+ days)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
