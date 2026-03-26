import "dotenv/config";
import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";



const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({
    adapter,
  });

function d(dateOnly: string) {
  // Date-only fields in Prisma still use JS Date objects.
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

async function main() {
  const members: Array<Prisma.MemberCreateInput & { id: string }> = [
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
  ];

  for (const m of members) {
    const { id, ...data } = m;
    await prisma.member.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }

  const reminderLogs: Array<Prisma.ReminderLogCreateInput & { id: string }> = [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      member: { connect: { id: "11111111-1111-1111-1111-111111111111" } },
      channel: "WHATSAPP",
      status: "SENT",
      sentAt: new Date(),
      message: "Hi Aditya, your membership is active till 31 Mar 2026.",
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      member: { connect: { id: "22222222-2222-2222-2222-222222222222" } },
      channel: "SMS",
      status: "DELIVERED",
      sentAt: new Date(),
      message: "Hi Priya, your plan renews on 15 Apr 2026.",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      member: { connect: { id: "44444444-4444-4444-4444-444444444444" } },
      channel: "WHATSAPP",
      status: "FAILED",
      sentAt: new Date(),
      message: "Hi Neha, we couldn't deliver your renewal reminder. Please update your WhatsApp settings.",
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
