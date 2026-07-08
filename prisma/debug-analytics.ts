import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function run() {
  const ownerId = "99999999-9999-9999-9999-999999999999";
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  console.log("Today (UTC):", today.toISOString().slice(0,10));
  const members = await prisma.member.findMany({
    where: { adminUserId: ownerId, deletedAt: null },
    select: {
      id: true,
      phone: true,
      startDate: true,
      endDate: true,
      membershipStatus: true,
      renewals: { select: { id: true, periodStart: true, periodEnd: true, paidAt: true, paymentStatus: true, planPrice: true } },
    },
    orderBy: { startDate: "asc" },
  });
  console.log("members", members.length);
  
  // Group by phone number (same as analytics service)
  const periodsByPhone = new Map<string, Array<{ start: Date; end: Date; isRenewal: boolean; status: string }>>();
  
  for (const member of members) {
    const key = member.phone.trim();
    const periods = periodsByPhone.get(key) ?? [];
    
    const paidRenewals = member.renewals.filter(r => r.paidAt && r.paymentStatus === "DONE");
    const latestRenewal = paidRenewals.length > 0
      ? paidRenewals.sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime())[0]
      : null;
    const effectiveEndDate = latestRenewal
      ? new Date(Math.max(member.endDate.getTime(), latestRenewal.periodEnd.getTime()))
      : member.endDate;
    
    periods.push({ start: member.startDate, end: effectiveEndDate, isRenewal: false, status: member.membershipStatus });
    
    for (const renewal of member.renewals) {
      if (renewal.paidAt && renewal.paymentStatus === "DONE" && renewal.periodStart.getTime() !== member.startDate.getTime()) {
        periods.push({ start: renewal.periodStart, end: renewal.periodEnd, isRenewal: true, status: member.membershipStatus });
      }
    }
    
    periods.sort((a,b)=>a.start.getTime()-b.start.getTime());
    periodsByPhone.set(key, periods);
  }
  
  // Calculate opportunities and renewals
  let opportunities = 0;
  let renewed = 0;
  
  for (const [phone, periods] of periodsByPhone.entries()) {
    console.log(`\nPhone: ${phone}`);
    for (let i=0; i<periods.length; i++){
      const current = periods[i]!;
      const next = periods[i+1];
      if (current.status === "PAUSED") continue;
      if (current.end > today) continue;
      opportunities += 1;
      console.log(`  opportunity: ${current.start.toISOString().slice(0,10)} to ${current.end.toISOString().slice(0,10)}`);
      if (next && next.start <= new Date(current.end.getTime() + 30*24*60*60*1000)) {
        renewed += 1;
        console.log(`    ✓ RENEWED: next period ${next.start.toISOString().slice(0,10)}`);
      } else {
        console.log(`    ✗ NOT RENEWED: ${next ? `next period ${next.start.toISOString().slice(0,10)} is too late` : 'no next period'}`);
      }
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Opportunities: ${opportunities}`);
  console.log(`Renewed: ${renewed}`);
  console.log(`Renewal Rate: ${opportunities > 0 ? (renewed/opportunities*100).toFixed(1) : 0}%`);
  console.log(`Churn Rate: ${opportunities > 0 ? ((opportunities-renewed)/opportunities*100).toFixed(1) : 0}%`);
  
  await prisma.$disconnect();
}

run().catch(async (err)=>{ console.error(err); await prisma.$disconnect(); process.exit(1); });