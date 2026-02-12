import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

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

// Check if running locally
const isLocal = !process.env.NETLIFY;

// Verify leader has full access
async function verifyLeaderAccess(email: string): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/leader-access?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    return data.found && data.full_access;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Get email from query params (passed from client with auth)
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify leader has full access
    // Skip verification in local dev for easier testing
    if (!isLocal) {
      const hasAccess = await verifyLeaderAccess(email);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied. Full leader access required." },
          { status: 403 }
        );
      }
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), "private", "leader-resources", sanitizedFilename);

    // Read the file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${sanitizedFilename}"`,
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
