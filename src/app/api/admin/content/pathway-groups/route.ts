import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { pathwayGroupWrite, positiveIntId } from "@/lib/domain/adminContent";

// Admin writes for pathway groups. The public list is GET
// /api/content/pathway-groups. Groups show on the /pathways map.
function refresh(): void {
  revalidatePath("/pathways");
}

// POST: create a pathway group
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const write = pathwayGroupWrite(await request.json().catch(() => null), "create");
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin().from("pathway_groups").insert(write.row).select();
  if (error) return serverError("admin/content/pathway-groups POST", error);
  refresh();
  return NextResponse.json({ group: data?.[0] ?? null });
}

// PUT: update a pathway group by id
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const id = positiveIntId(typeof body === "object" && body !== null ? (body as { id?: unknown }).id : undefined);
  if (id === null) return jsonError(400, "id required");
  const write = pathwayGroupWrite(body, "update");
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin().from("pathway_groups").update(write.row).eq("id", id).select();
  if (error) return serverError("admin/content/pathway-groups PUT", error);
  if (!data || data.length === 0) return jsonError(404, "No matching row found");
  refresh();
  return NextResponse.json({ group: data[0] });
}

// DELETE ?id=: remove a pathway group
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const id = positiveIntId(new URL(request.url).searchParams.get("id"));
  if (id === null) return jsonError(400, "id required");

  const { error } = await getSupabaseAdmin().from("pathway_groups").delete().eq("id", id);
  if (error) return serverError("admin/content/pathway-groups DELETE", error);
  refresh();
  return NextResponse.json({ success: true });
}
