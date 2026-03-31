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

const DEMO_PASSWORD_HASH =
  "$2b$12$RdjIdI3NGH1r.e/9Oq2naupYNxIaZ808kW3/mjeflM3/q/GxLsm7m";

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
  const entries = Object.entries(prices) as [
    keyof typeof prices,
    string,
  ][];
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

  await prisma.adminUser.upsert({
    where: { id: OWNER_ADMIN_ID },
    create: {
      id: OWNER_ADMIN_ID,
      name: "Ravi Mehta",
      email: OWNER_ADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
      subscriptionPlan: "PRO",
      trialEndsAt: trialFar,
    },
    update: {
      name: "Ravi Mehta",
      email: OWNER_ADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
      subscriptionPlan: "PRO",
      trialEndsAt: trialFar,
    },
  });

  await prisma.adminUser.upsert({
    where: { id: MANAGER_ADMIN_ID },
    create: {
      id: MANAGER_ADMIN_ID,
      name: "Ananya Desai",
      email: MANAGER_ADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
      subscriptionPlan: "STARTER",
      trialEndsAt: trialFar,
    },
    update: {
      name: "Ananya Desai",
      email: MANAGER_ADMIN_EMAIL,
      passwordHash: DEMO_PASSWORD_HASH,
      subscriptionPlan: "STARTER",
      trialEndsAt: trialFar,
    },
  });

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

  type MemberSeed = Omit<Prisma.MemberCreateInput, "adminUser"> & { id: string };

  await prisma.reminderLog.deleteMany({});
  await prisma.member.deleteMany({});

  const ownerMembers: MemberSeed[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      fullName: "Aditya Sharma",
      email: "aditya@example.com",
      phone: "9990001111",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-03-01"),
      endDate: d("2026-03-31"),
      whatsappEnabled: true,
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      fullName: "Priya Verma",
      email: "priya@example.com",
      phone: "9990002222",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("2699.00"),
      startDate: d("2026-01-15"),
      endDate: d("2026-04-14"),
      whatsappEnabled: true,
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      fullName: "Rahul Singh",
      email: "rahul@example.com",
      phone: "9990003333",
      billingDuration: "TWELVE_MONTHS",
      planPrice: new Prisma.Decimal("8999.00"),
      startDate: d("2025-08-01"),
      endDate: d("2026-07-31"),
      whatsappEnabled: false,
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      fullName: "Neha Kapoor",
      email: null,
      phone: "9990004444",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-03-10"),
      endDate: d("2026-04-09"),
      whatsappEnabled: true,
    },
    {
      id: "55555555-5555-5555-5555-555555555555",
      fullName: "Vikram Joshi",
      email: "vikram.joshi@example.com",
      phone: "9990005555",
      billingDuration: "SIX_MONTHS",
      planPrice: new Prisma.Decimal("4999.00"),
      startDate: d("2025-11-01"),
      endDate: d("2026-04-30"),
      whatsappEnabled: true,
    },
    {
      id: "66666666-6666-6666-6666-666666666666",
      fullName: "Kavya Nair",
      email: "kavya.nair@example.com",
      phone: "9990006666",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-03-05"),
      endDate: d("2026-04-04"),
      whatsappEnabled: true,
    },
    {
      id: "77777777-7777-7777-7777-777777777771",
      fullName: "Arjun Patel",
      email: "arjun.patel@example.com",
      phone: "9990007777",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("2699.00"),
      startDate: d("2026-02-01"),
      endDate: d("2026-04-30"),
      whatsappEnabled: false,
    },
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      fullName: "Meera Iyer",
      email: "meera.iyer@example.com",
      phone: "9990008888",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("999.00"),
      startDate: d("2026-03-15"),
      endDate: d("2026-04-14"),
      whatsappEnabled: true,
    },
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      fullName: "Sanjay Reddy",
      email: "sanjay.reddy@example.com",
      phone: "9990009999",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("2699.00"),
      startDate: d("2025-12-01"),
      endDate: d("2026-02-28"),
      whatsappEnabled: true,
    },
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      fullName: "Tara Menon",
      email: "tara.menon@example.com",
      phone: "9990010000",
      billingDuration: "TWELVE_MONTHS",
      planPrice: new Prisma.Decimal("8999.00"),
      startDate: d("2026-01-10"),
      endDate: d("2027-01-09"),
      whatsappEnabled: true,
    },
  ];

  const managerMembers: MemberSeed[] = [
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      fullName: "Ishaan Khanna",
      email: "ishaan.khanna@example.com",
      phone: "9880011100",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("1199.00"),
      startDate: d("2026-03-01"),
      endDate: d("2026-03-31"),
      whatsappEnabled: true,
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
      fullName: "Diya Malhotra",
      email: "diya.malhotra@example.com",
      phone: "9880022200",
      billingDuration: "THREE_MONTHS",
      planPrice: new Prisma.Decimal("3199.00"),
      startDate: d("2026-01-20"),
      endDate: d("2026-04-19"),
      whatsappEnabled: true,
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3",
      fullName: "Rohan Bose",
      email: null,
      phone: "9880033300",
      billingDuration: "ONE_MONTH",
      planPrice: new Prisma.Decimal("1199.00"),
      startDate: d("2026-03-12"),
      endDate: d("2026-04-11"),
      whatsappEnabled: false,
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

  const reminderLogs: Array<Prisma.ReminderLogCreateInput & { id: string }> = [
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc1",
      member: { connect: { id: "11111111-1111-1111-1111-111111111111" } },
      channel: "WHATSAPP",
      status: "SENT",
      sentAt: new Date("2026-03-20T09:00:00.000Z"),
      message: "Hi Aditya, your membership is active till 31 Mar 2026.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc2",
      member: { connect: { id: "22222222-2222-2222-2222-222222222222" } },
      channel: "SMS",
      status: "DELIVERED",
      sentAt: new Date("2026-03-18T10:30:00.000Z"),
      message: "Hi Priya, your plan renews on 15 Apr 2026.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc3",
      member: { connect: { id: "44444444-4444-4444-4444-444444444444" } },
      channel: "WHATSAPP",
      status: "FAILED",
      sentAt: new Date("2026-03-19T08:15:00.000Z"),
      message:
        "Hi Neha, we couldn't deliver your renewal reminder. Please update your WhatsApp settings.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc4",
      member: { connect: { id: "55555555-5555-5555-5555-555555555555" } },
      channel: "WHATSAPP",
      status: "DELIVERED",
      sentAt: new Date("2026-03-21T07:00:00.000Z"),
      message: "Hi Vikram, thanks for renewing your annual plan. See you at the gym!",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc5",
      member: { connect: { id: "66666666-6666-6666-6666-666666666666" } },
      channel: "SMS",
      status: "SENT",
      sentAt: new Date("2026-03-22T14:00:00.000Z"),
      message: "Hi Kavya, your March payment was received. Membership active till 4 Apr.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc6",
      member: { connect: { id: "77777777-7777-7777-7777-777777777771" } },
      channel: "SMS",
      status: "FAILED",
      sentAt: new Date("2026-03-17T11:45:00.000Z"),
      message:
        "Hi Arjun, SMS reminder failed — please verify your registered phone number.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc7",
      member: { connect: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1" } },
      channel: "WHATSAPP",
      status: "SENT",
      sentAt: new Date("2026-03-23T09:30:00.000Z"),
      message: "Hi Meera, welcome! Your first month starts 15 Mar — book a free PT intro.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc8",
      member: { connect: { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1" } },
      channel: "WHATSAPP",
      status: "DELIVERED",
      sentAt: new Date("2026-03-10T16:00:00.000Z"),
      message: "Hi Ishaan, your March pass is active. Class schedule updated in the app.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc9",
      member: { connect: { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2" } },
      channel: "SMS",
      status: "SENT",
      sentAt: new Date("2026-03-11T12:00:00.000Z"),
      message: "Hi Diya, quarterly renewal due 19 Apr — reply STOP to opt out.",
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

  console.log("Seed complete.");
  console.log("  Superadmin:", SUPERADMIN_EMAIL, "| password: GymPass123!");
  console.log("  Owner:", OWNER_ADMIN_EMAIL, "| password: GymPass123!");
  console.log("  Manager:", MANAGER_ADMIN_EMAIL, "| password: GymPass123!");
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
