import {
  buildMembersExportCsv,
  buildMembersImportTemplateCsv,
} from "@/server/gym-owner/member-bulk.service";
import { withGymOwnerFeature } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function GETHandler(request: Request, userId: string) {
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

  const csv = await buildMembersExportCsv(userId);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members-export-${date}.csv"`,
    },
  });
}

export const GET = withGymOwnerFeature("BULK_IMPORT_EXPORT", GETHandler);
