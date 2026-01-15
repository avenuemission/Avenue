import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "pathways_carousel";
    
    // Sanitize folder name to prevent directory traversal
    const safeFolderName = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const carouselDir = path.join(process.cwd(), "public", "images", safeFolderName);
    
    // Check if directory exists
    if (!fs.existsSync(carouselDir)) {
      return NextResponse.json({ images: [] });
    }

    // Read all files in the directory
    const files = fs.readdirSync(carouselDir);
    
    // Filter for image files (png, jpg, JPG, jpeg, JPEG, PNG)
    const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"];
    const images = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map((file) => `/images/${safeFolderName}/${file}`);

    // Shuffle the array randomly
    const shuffled = images.sort(() => Math.random() - 0.5);

    return NextResponse.json({ images: shuffled });
  } catch (error) {
    console.error("Error reading carousel images:", error);
    return NextResponse.json({ images: [] });
  }
}
