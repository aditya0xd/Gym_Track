import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { guardGymOwnerPlanFeature } from "@/lib/plan-features/guard";
import {
  buildMembersExportCsv,
  buildMembersImportTemplateCsv,
} from "@/server/gym-owner/member-bulk.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const denied = await guardGymOwnerPlanFeature(session, "BULK_IMPORT_EXPORT");
  if (denied) return denied;

  const url = new URL(request.url);
  if (url.searchParams.get("template") === "1") {
    const body = buildMembersImportTemplateCsv();
    return new Response(`\uFEFF${body}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="members-import-template.csv"',
      },
    });
  }

  const csv = await buildMembersExportCsv(session!.user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members-export-${date}.csv"`,
    },
  });
}
