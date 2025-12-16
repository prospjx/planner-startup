import { NextResponse } from "next/server";
import { uploadDocument } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Expected a file under the `file` field." },
        { status: 400 },
      );
    }

    const result = await uploadDocument(file);

    return NextResponse.json({
      ok: true,
      storageUrl: result.storageUrl,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error("Upload error", error);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
