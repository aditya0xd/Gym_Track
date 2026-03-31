import { getServerSession } from "next-auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { authOptions } from "@/lib/auth";
import { HttpError } from "@/lib/http/errors";
import { getInvoiceReceiptForOwner } from "@/server/gym-owner/manage-plan.service";

type RouteContext = { params: Promise<{ id: string }> };

function fmtDate(d: Date | null) {
  if (!d) return "N/A";
  return d.toISOString().slice(0, 10);
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;

  try {
    const invoice = await getInvoiceReceiptForOwner(session.user.id, id);

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = 790;
    page.drawText("Gym Owner Billing Receipt", {
      x: 50,
      y,
      size: 18,
      font: bold,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    const lines = [
      `Receipt ID: ${invoice.id}`,
      `Generated: ${fmtDate(new Date())}`,
      "",
      `Owner Name: ${invoice.adminUser.name}`,
      `Owner Email: ${invoice.adminUser.email}`,
      "",
      `Plan: ${invoice.plan}`,
      `Amount (INR): ${invoice.amountInr.toString()}`,
      `Status: ${invoice.status}`,
      `Due Date: ${fmtDate(invoice.dueDate)}`,
      `Paid At: ${fmtDate(invoice.paidAt)}`,
      `Created At: ${fmtDate(invoice.createdAt)}`,
    ];

    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0, 0, 0) });
      y -= 18;
    }

    const bytes = await pdf.save();
    const body = Buffer.from(bytes);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="billing-receipt-${invoice.id}.pdf"`,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return new Response(e.message, { status: e.status });
    }
    throw e;
  }
}
