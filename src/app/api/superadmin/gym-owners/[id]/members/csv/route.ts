import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { withSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const VALID_DURATIONS = [
  "ONE_MONTH",
  "THREE_MONTHS",
  "SIX_MONTHS",
  "TWELVE_MONTHS",
] as const;
type BillingDuration = (typeof VALID_DURATIONS)[number];
type OwnerMembersCsvRouteContext = { params: Promise<{ id: string }> };

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function toDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : `${s}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

// POST /api/superadmin/gym-owners/[id]/members/csv
async function POSTHandler(
  request: Request,
  _userId: string,
  context: unknown,
) {
  const { id: ownerId } = await (context as OwnerMembersCsvRouteContext).params;

  const owner = await prisma.adminUser.findUnique({
    where: { id: ownerId, deletedAt: null },
  });
  if (!owner) {
    return NextResponse.json(
      { message: "Gym owner not found" },
      { status: 404 },
    );
  }

  let text: string;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 },
      );
    }
    text = await file.text();
  } catch {
    return NextResponse.json(
      { message: "Could not read file" },
      { status: 400 },
    );
  }

  const rows = parseCSV(text);
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header

    const fullName = row["fullname"] || row["full_name"] || row["name"] || "";
    const phone = row["phone"] || row["mobile"] || "";
    const email = row["email"] || "";
    const billingDuration = (
      row["billingduration"] ||
      row["billing_duration"] ||
      row["duration"] ||
      ""
    ).toUpperCase() as BillingDuration;
    const planPrice =
      row["planprice"] || row["plan_price"] || row["price"] || "";
    const startDate = row["startdate"] || row["start_date"] || "";
    const endDate = row["enddate"] || row["end_date"] || "";

    if (!fullName) {
      errors.push(`Row ${rowNum}: Missing fullName`);
      continue;
    }
    if (!phone) {
      errors.push(`Row ${rowNum}: Missing phone`);
      continue;
    }
    if (!VALID_DURATIONS.includes(billingDuration)) {
      errors.push(
        `Row ${rowNum}: Invalid billingDuration "${billingDuration}". Must be one of: ${VALID_DURATIONS.join(", ")}`,
      );
      continue;
    }
    if (!planPrice || isNaN(Number(planPrice))) {
      errors.push(`Row ${rowNum}: Invalid planPrice`);
      continue;
    }

    const start = toDate(startDate);
    const end = toDate(endDate);
    if (!start) {
      errors.push(`Row ${rowNum}: Invalid startDate "${startDate}"`);
      continue;
    }
    if (!end) {
      errors.push(`Row ${rowNum}: Invalid endDate "${endDate}"`);
      continue;
    }

    try {
      await prisma.member.create({
        data: {
          id: randomUUID(),
          adminUserId: ownerId,
          fullName,
          phone,
          email: email || null,
          billingDuration,
          planPrice,
          startDate: start,
          endDate: end,
        },
      });
      created++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown";
      errors.push(
        `Row ${rowNum}: Database error - ${message}`,
      );
    }
  }

  return NextResponse.json({
    message: `Import complete. ${created} members created.`,
    created,
    skipped: rows.length - created,
    errors,
  });
}

export const POST = withSuperAdmin(POSTHandler);
