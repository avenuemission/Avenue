import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireLeader } from "@/lib/requireLeader";
import { resolveResourcePath } from "@/lib/resourcePath";

// MIME types for common file extensions
const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".zip": "application/zip",
  ".txt": "text/plain",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const auth = await requireLeader(request);
    if ("response" in auth) return auth.response;
    if (!auth.leader.fullAccess) {
      return NextResponse.json({ error: "Access denied. Full leader access required." }, { status: 403 });
    }

    const { filename } = await params;

    // Next may already decode %2F in the dynamic segment depending on version.
    // Only decode ourselves when the param still carries an encoded separator,
    // so a literal "%" in a real filename is left alone.
    const decoded = /%2f|%5c/i.test(filename) ? decodeURIComponent(filename) : filename;

    const root = path.join(process.cwd(), "private", "leader-resources");
    const filePath = resolveResourcePath(root, decoded);
    if (!filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const downloadName = path.basename(filePath);

    // Read the file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const ext = path.extname(downloadName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${downloadName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("Error serving leader resource:", error);
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );
  }
}
