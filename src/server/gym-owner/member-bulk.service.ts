import type { MemberBillingDuration, PaymentStatus } from "@/generated/prisma/client";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { normalizeHeaderKey, parseCsv, rowToCsvLine } from "@/lib/csv/simple-csv";
import { HttpError } from "@/lib/http/errors";

import { createMemberForOwner, listMembersForOwner } from "./member.service";

const IMPORT_MAX_ROWS = 500;

const EXPORT_HEADERS = [
  "fullName",
  "email",
  "phone",
  "billingDuration",
  "startDate",
  "endDate",
  "paymentStatus",
  "whatsappEnabled",
  "membershipStatus",
] as const;

const TEMPLATE_HEADERS = [
  "fullName",
  "email",
  "phone",
  "billingDuration",
  "startDate",
  "paymentStatus",
  "whatsappEnabled",
] as const;

const DURATION_SET = new Set(
  MEMBER_BILLING_DURATION_OPTIONS.map((o) => o.value),
);

function isDuration(v: string): v is MemberBillingDuration {
  return DURATION_SET.has(v as MemberBillingDuration);
}

function parsePaymentStatus(raw: string): PaymentStatus | null {
  const s = raw.trim().toUpperCase();
  if (s === "DONE" || s === "PAID") return "DONE";
  if (s === "PARTIAL" || s === "PARTLY_PAID") return "PARTIAL";
  if (s === "NOT_DONE" || s === "UNPAID" || s === "PENDING") return "NOT_DONE";
  return null;
}

function parseBool(raw: string): boolean | null {
  const s = raw.trim().toLowerCase();
  if (s === "true" || s === "yes" || s === "1" || s === "y") return true;
  if (s === "false" || s === "no" || s === "0" || s === "n") return false;
  return null;
}

function parseStartDate(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export async function buildMembersExportCsv(adminUserId: string): Promise<string> {
  const members = await listMembersForOwner(adminUserId);
  const lines: string[] = [rowToCsvLine([...EXPORT_HEADERS])];
  for (const m of members) {
    lines.push(
      rowToCsvLine([
        m.fullName,
        m.email ?? "",
        m.phone,
        m.billingDuration,
        m.startDate.toISOString().slice(0, 10),
        m.endDate.toISOString().slice(0, 10),
        m.paymentStatus,
        m.whatsappEnabled ? "true" : "false",
        m.membershipStatus,
      ]),
    );
  }
  return lines.join("\r\n");
}

export function buildMembersImportTemplateCsv() {
  return rowToCsvLine([...TEMPLATE_HEADERS]);
}

export type ImportRowError = { rowNumber: number; message: string };

export async function importMembersFromCsv(
  adminUserId: string,
  csvText: string,
): Promise<{ created: number; errors: ImportRowError[] }> {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new HttpError(400, "CSV file is empty.");
  }

  const rows = parseCsv(trimmed);
  if (rows.length < 2) {
    throw new HttpError(400, "CSV must include a header row and at least one data row.");
  }

  const headerRow = rows[0]!.map((h) => normalizeHeaderKey(h));
  const colIndex = new Map<string, number>();
  headerRow.forEach((h, i) => {
    if (h && !colIndex.has(h)) colIndex.set(h, i);
  });

  const required = ["fullname", "phone", "billingduration", "startdate"];
  for (const key of required) {
    if (!colIndex.has(key)) {
      throw new HttpError(
        400,
        `CSV header must include: ${required.join(", ")} (plus optional email, paymentStatus, whatsappEnabled).`,
      );
    }
  }

  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));
  if (dataRows.length > IMPORT_MAX_ROWS) {
    throw new HttpError(400, `Too many rows (max ${IMPORT_MAX_ROWS}).`);
  }

  const errors: ImportRowError[] = [];
  let created = 0;

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i]!;
    const rowNumber = i + 2;

    const get = (logical: string): string => {
      const idx = colIndex.get(logical);
      if (idx === undefined) return "";
      return (row[idx] ?? "").trim();
    };

    const fullName = get("fullname");
    const phone = get("phone").replace(/\s+/g, " ");
    const emailRaw = get("email");
    const email = emailRaw === "" ? null : emailRaw.toLowerCase();
    const durationRaw = get("billingduration");
    const startRaw = get("startdate");
    const payRaw = get("paymentstatus") || "NOT_DONE";
    const waRaw = get("whatsappenabled") || "true";

    if (!fullName) {
      errors.push({ rowNumber, message: "fullName is required." });
      continue;
    }
    if (!phone) {
      errors.push({ rowNumber, message: "phone is required." });
      continue;
    }
    if (!isDuration(durationRaw)) {
      errors.push({
        rowNumber,
        message: `billingDuration must be one of: ${[...DURATION_SET].join(", ")}.`,
      });
      continue;
    }
    const startDate = parseStartDate(startRaw);
    if (!startDate) {
      errors.push({ rowNumber, message: "startDate must be YYYY-MM-DD." });
      continue;
    }
    const paymentStatus = parsePaymentStatus(payRaw);
    if (!paymentStatus) {
      errors.push({
        rowNumber,
        message: "paymentStatus must be DONE, PARTIAL, or NOT_DONE.",
      });
      continue;
    }
    const whatsappEnabled = parseBool(waRaw);
    if (whatsappEnabled === null) {
      errors.push({
        rowNumber,
        message: "whatsappEnabled must be true or false.",
      });
      continue;
    }

    if (paymentStatus === "DONE" || paymentStatus === "PARTIAL") {
      errors.push({
        rowNumber,
        message: "Bulk import cannot record paid or partial payments (UPI screenshot required). Use NOT_DONE and update in app.",
      });
      continue;
    }

    try {
      await createMemberForOwner(adminUserId, {
        fullName,
        email,
        phone,
        billingDuration: durationRaw,
        startDate,
        paymentStatus: "NOT_DONE",
        whatsappEnabled,
        memberPhoto: null,
        upiScreenshot: null,
      });
      created += 1;
    } catch (e) {
      const msg =
        e instanceof HttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to create member.";
      errors.push({ rowNumber, message: msg });
    }
  }

  return { created, errors };
}
