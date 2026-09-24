import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";
import { requireLeader } from "@/lib/server/requireLeader";

interface ResourceFile {
  name: string;
  size: number;
  modified: string;
  category?: string;
}

// Recursively get files from a directory
async function getFilesRecursive(dir: string, category?: string): Promise<ResourceFile[]> {
  const resources: ResourceFile[] = [];
  
  try {
    const items = await readdir(dir);
    
    for (const item of items) {
      if (item.startsWith(".")) continue;
      
      const itemPath = path.join(dir, item);
      const itemStat = await stat(itemPath);
      
      if (itemStat.isDirectory()) {
        // Recurse into subdirectory with category name
        const subFiles = await getFilesRecursive(itemPath, item);
        resources.push(...subFiles);
      } else if (itemStat.isFile()) {
        resources.push({
          name: category ? `${category}/${item}` : item,
          size: itemStat.size,
          modified: itemStat.mtime.toISOString(),
          category: category || "general",
        });
      }
    }
  } catch {
    // Directory doesn't exist
  }
  
  return resources;
}

// GET: List all available resources
export async function GET(request: NextRequest) {
  try {
    const auth = await requireLeader(request);
    if ("response" in auth) return auth.response;
    if (!auth.leader.fullAccess) {
      return NextResponse.json({ error: "Access denied. Full leader access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const resourcesDir = path.join(process.cwd(), "private", "leader-resources");
    const allResources = await getFilesRecursive(resourcesDir);
    
    // Filter by category if specified
    const resources = category 
      ? allResources.filter(r => r.category === category)
      : allResources;

    return NextResponse.json({ resources });
  } catch (error) {
    console.error("Error listing leader resources:", error);
    return NextResponse.json(
      { error: "Failed to list resources" },
      { status: 500 }
    );
  }
}
