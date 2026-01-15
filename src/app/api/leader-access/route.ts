import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const LEADERS_CSV_PATH = path.join(process.cwd(), "data", "leaders.csv");

interface LeaderRecord {
  id: string;
  email: string;
  name: string;
  full_access: string;
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Read all leaders from CSV
function readLeaders(): LeaderRecord[] {
  if (!fs.existsSync(LEADERS_CSV_PATH)) {
    return [];
  }

  const content = fs.readFileSync(LEADERS_CSV_PATH, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const records: LeaderRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= 4) {
      records.push({
        id: values[headers.indexOf("id")] || "",
        email: values[headers.indexOf("email")] || "",
        name: values[headers.indexOf("name")] || "",
        full_access: values[headers.indexOf("full_access")] || "0",
      });
    }
  }

  return records;
}

// Write leaders to CSV
function writeLeaders(leaders: LeaderRecord[]): void {
  const header = "id,email,name,full_access";
  const rows = leaders.map(
    (l) => `${l.id},${l.email},"${l.name}",${l.full_access}`
  );
  const content = [header, ...rows].join("\n") + "\n";
  fs.writeFileSync(LEADERS_CSV_PATH, content, "utf-8");
}

// GET: Check access for a specific email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const leaders = readLeaders();
    const leader = leaders.find(
      (l) => l.email.toLowerCase() === email.toLowerCase()
    );

    if (!leader) {
      return NextResponse.json({
        found: false,
        full_access: false,
      });
    }

    return NextResponse.json({
      found: true,
      full_access: leader.full_access === "1",
      name: leader.name,
    });
  } catch (error) {
    console.error("Error checking leader access:", error);
    return NextResponse.json(
      { error: "Failed to check access" },
      { status: 500 }
    );
  }
}

// POST: Register a new leader (called during signup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name required" },
        { status: 400 }
      );
    }

    const leaders = readLeaders();

    // Check if leader already exists
    const existingIndex = leaders.findIndex(
      (l) => l.email.toLowerCase() === email.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Leader already exists, return their current access
      return NextResponse.json({
        success: true,
        full_access: leaders[existingIndex].full_access === "1",
        message: "Leader already registered",
      });
    }

    // Add new leader with full_access = 0
    const newLeader: LeaderRecord = {
      id: id || Date.now().toString(),
      email,
      name,
      full_access: "0",
    };

    leaders.push(newLeader);
    writeLeaders(leaders);

    return NextResponse.json({
      success: true,
      full_access: false,
      message: "Leader registered with pending access",
    });
  } catch (error) {
    console.error("Error registering leader:", error);
    return NextResponse.json(
      { error: "Failed to register leader" },
      { status: 500 }
    );
  }
}
