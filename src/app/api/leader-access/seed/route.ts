import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

interface LeaderRecord {
  id: string;
  email: string;
  name: string;
  full_access: boolean;
  created_at: string;
}

// Initial admin users to seed
const INITIAL_ADMINS: LeaderRecord[] = [
  {
    id: "1",
    email: "info@avenuemission.com",
    name: "Avenue Admin",
    full_access: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "1768453903445",
    email: "jhamcmahon@hotmail.com",
    name: "John",
    full_access: true,
    created_at: new Date().toISOString(),
  },
];

// POST: Seed initial admin users (run once after deployment)
export async function POST() {
  try {
    const store = getStore({ name: "leaders", consistency: "strong" });
    const seeded: string[] = [];

    for (const admin of INITIAL_ADMINS) {
      const key = admin.email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
      
      // Check if already exists
      const existing = await store.get(key, { type: "json" });
      if (!existing) {
        await store.setJSON(key, admin);
        seeded.push(admin.email);
      }
    }

    return NextResponse.json({
      success: true,
      message: seeded.length > 0 
        ? `Seeded ${seeded.length} admin(s): ${seeded.join(", ")}`
        : "All admins already exist",
    });
  } catch (error) {
    console.error("Error seeding leaders:", error);
    return NextResponse.json(
      { error: "Failed to seed leaders" },
      { status: 500 }
    );
  }
}
