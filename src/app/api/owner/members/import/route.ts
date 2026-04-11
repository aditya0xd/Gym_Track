import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { guardGymOwnerPlanFeature } from "@/lib/plan-features/guard";
import { HttpError } from "@/lib/http/errors";
import { importMembersFromCsv } from "@/server/gym-owner/member-bulk.service";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const denied = await guardGymOwnerPlanFeature(session, "BULK_IMPORT_EXPORT");
  if (denied) return denied;

  const contentType = request.headers.get("content-type") ?? "";
  let text = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Missing file field." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: "File too large (max 2MB)." }, { status: 400 });
    }
    text = await file.text();
  } else if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ message: "Body too large (max 2MB)." }, { status: 400 });
    }
    text = new TextDecoder("utf-8").decode(buf);
  } else {
    return NextResponse.json(
      { message: "Use multipart/form-data with a file field, or text/csv body." },
      { status: 400 },
    );
  }

  try {
    const result = await importMembersFromCsv(session!.user.id, text);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}
