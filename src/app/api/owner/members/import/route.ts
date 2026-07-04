import { NextResponse } from "next/server";

import { HttpError } from "@/lib/http/errors";
import { withGymOwnerFeature } from "@/lib/api-auth";
import { importMembersFromCsv } from "@/server/gym-owner/member-bulk.service";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

async function POSTHandler(request: Request, userId: string) {
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
    const result = await importMembersFromCsv(userId, text);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const POST = withGymOwnerFeature("BULK_IMPORT_EXPORT", POSTHandler);
