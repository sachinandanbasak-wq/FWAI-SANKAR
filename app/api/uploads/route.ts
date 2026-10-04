import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { saveBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accepts multipart form-data:
//   file: the binary
//   kind: "artwork" | "print"
// Validates at the edge and stores nothing if the file is rejected.

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  const kind = String(form.get("kind") || "artwork");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was received." }, { status: 400 });
  }

  const settings = await getSettings();
  const maxBytes = settings.maxFileSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: `That file is ${(file.size / 1024 / 1024).toFixed(
          1
        )} MB. The maximum is ${settings.maxFileSizeMB} MB.`,
      },
      { status: 400 }
    );
  }

  let ext: string;
  if (kind === "print") {
    if (file.type !== "image/png") {
      return NextResponse.json(
        { error: "Print files must be PNG." },
        { status: 400 }
      );
    }
    ext = ".png";
  } else {
    if (!settings.acceptedUploadTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "That file type is not supported. Upload a PNG or JPG image.",
        },
        { status: 400 }
      );
    }
    ext = file.type === "image/png" ? ".png" : ".jpg";
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  const name = await saveBytes(bytes, ext);
  return NextResponse.json({ url: `/api/files/${name}` });
}
