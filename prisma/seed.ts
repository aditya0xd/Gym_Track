import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

function d(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

/** All demo admins use this password: GymPass123! */
const DEMO_PASSWORD_HASH =
  "$2b$12$RdjIdI3NGH1r.e/9Oq2naupYNxIaZ808kW3/mjeflM3/q/GxLsm7m";

/** Primary owner — matches migration bootstrap when DB had members but no admin */
const OWNER_ADMIN_ID = "99999999-9999-9999-9999-999999999999";
const OWNER_ADMIN_EMAIL = "seed-admin@gym.local";

/** Second gym (demo manager) — own members, same login password */
const MANAGER_ADMIN_ID = "88888888-8888-8888-8888-888888888888";
const MANAGER_ADMIN_EMAIL = "demo.manager@gym.local";

type MemberSeed = Omit<Prisma.MemberCreateInput, "adminUser"> & { id: string };

async function main() {
  const admins = [
    {
      id: OWNER_ADMIN_ID,
      name: "Ravi Mehta",
      email: OWNER_ADMIN_EMAIL,
    },
    {
      id: MANAGER_ADMIN_ID,
      name: "Ananya Desai",
      email: MANAGER_ADMIN_EMAIL,
    },
  ] as const;

  for (const a of admins) {
    await prisma.adminUser.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        name: a.name,
        email: a.email,
        passwordHash: DEMO_PASSWORD_HASH,
      },
      update: {
        name: a.name,
        email: a.email,
        passwordHash: DEMO_PASSWORD_HASH,
      },
    });
  }

  const ownerMembers: MemberSeed[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      fullName: "Aditya Sharma",
      email: "aditya@example.com",
      phone: "9990001111",
      planType: "MONTHLY",
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
      planType: "QUARTERLY",
      planPrice: new Prisma.Decimal("2499.00"),
      startDate: d("2026-01-15"),
      endDate: d("2026-04-14"),
      whatsappEnabled: true,
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      fullName: "Rahul Singh",
      email: "rahul@example.com",
      phone: "9990003333",
      planType: "ANNUAL",
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
      planType: "MONTHLY",
      planPrice: new Prisma.Decimal("899.00"),
      startDate: d("2026-03-10"),
      endDate: d("2026-04-09"),
      whatsappEnabled: true,
    },
    {
      id: "55555555-5555-5555-5555-555555555555",
      fullName: "Vikram Joshi",
      email: "vikram.joshi@example.com",
      phone: "9990005555",
      planType: "ANNUAL",
      planPrice: new Prisma.Decimal("7999.00"),
      startDate: d("2025-11-01"),
      endDate: d("2026-10-31"),
      whatsappEnabled: true,
    },
    {
      id: "66666666-6666-6666-6666-666666666666",
      fullName: "Kavya Nair",
      email: "kavya.nair@example.com",
      phone: "9990006666",
      planType: "MONTHLY",
      planPrice: new Prisma.Decimal("1099.00"),
      startDate: d("2026-03-05"),
      endDate: d("2026-04-04"),
      whatsappEnabled: true,
    },
    {
      id: "77777777-7777-7777-7777-777777777777",
      fullName: "Arjun Patel",
      email: "arjun.patel@example.com",
      phone: "9990007777",
      planType: "QUARTERLY",
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
      planType: "MONTHLY",
      planPrice: new Prisma.Decimal("949.00"),
      startDate: d("2026-03-15"),
      endDate: d("2026-04-14"),
      whatsappEnabled: true,
    },
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      fullName: "Sanjay Reddy",
      email: "sanjay.reddy@example.com",
      phone: "9990009999",
      planType: "QUARTERLY",
      planPrice: new Prisma.Decimal("2399.00"),
      startDate: d("2025-12-01"),
      endDate: d("2026-02-28"),
      whatsappEnabled: true,
    },
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      fullName: "Tara Menon",
      email: "tara.menon@example.com",
      phone: "9990010000",
      planType: "ANNUAL",
      planPrice: new Prisma.Decimal("8499.00"),
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
      planType: "MONTHLY",
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
      planType: "QUARTERLY",
      planPrice: new Prisma.Decimal("2599.00"),
      startDate: d("2026-01-20"),
      endDate: d("2026-04-19"),
      whatsappEnabled: true,
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3",
      fullName: "Rohan Bose",
      email: null,
      phone: "9880033300",
      planType: "MONTHLY",
      planPrice: new Prisma.Decimal("799.00"),
      startDate: d("2026-03-12"),
      endDate: d("2026-04-11"),
      whatsappEnabled: false,
    },
  ];

  async function upsertMembers(rows: MemberSeed[], adminId: string) {
    for (const m of rows) {
      const { id, ...data } = m;
      await prisma.member.upsert({
        where: { id },
        create: {
          id,
          ...data,
          adminUser: { connect: { id: adminId } },
        },
        update: {
          ...data,
          adminUser: { connect: { id: adminId } },
        },
      });
    }
  }

  await upsertMembers(ownerMembers, OWNER_ADMIN_ID);
  await upsertMembers(managerMembers, MANAGER_ADMIN_ID);

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
      member: { connect: { id: "77777777-7777-7777-7777-777777777777" } },
      channel: "SMS",
      status: "FAILED",
      sentAt: new Date("2026-03-17T11:45:00.000Z"),
      message: "Hi Arjun, SMS reminder failed — please verify your registered phone number.",
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
  console.log("  Owner admin:", OWNER_ADMIN_EMAIL, "| password: GymPass123!");
  console.log("  Manager admin:", MANAGER_ADMIN_EMAIL, "| password: GymPass123!");
  console.log(
    `  Members: ${ownerMembers.length} (owner) + ${managerMembers.length} (manager)`,
  );
  console.log(`  Reminder logs: ${reminderLogs.length}`);
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
