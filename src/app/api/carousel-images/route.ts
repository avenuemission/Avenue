import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

// Read every image in one carousel folder. Returns [] for a folder that
// doesn't exist, so one bad name never fails the whole request.
function readFolder(folderName: string): string[] {
  const carouselDir = path.join(process.cwd(), "public", "images", folderName);
  if (!fs.existsSync(carouselDir)) {
    return [];
  }
  return fs
    .readdirSync(carouselDir)
    .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .map((file) => `/images/${folderName}/${file}`);
}

// Fisher-Yates: every ordering equally likely. `sort(() => Math.random() - 0.5)`
// is not a uniform shuffle — it visibly favours the original order.
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "pathways_carousel";

    // `folder` accepts one name or a comma-separated list. Images from every
    // named folder are pooled together and shuffled as one set, so a mixed
    // carousel interleaves sources rather than showing them folder by folder.
    const folderNames = folder
      .split(",")
      // Sanitize each name to prevent directory traversal
      .map((name) => name.replace(/[^a-zA-Z0-9_-]/g, ""))
      .filter((name) => name.length > 0);

    const images = folderNames.flatMap(readFolder);

    return NextResponse.json({ images: shuffle(images) });
  } catch (error) {
    console.error("Error reading carousel images:", error);
    return NextResponse.json({ images: [] });
  }
}
