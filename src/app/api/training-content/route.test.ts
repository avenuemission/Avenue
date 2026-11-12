import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET } from "./route";

const get = () => GET(new NextRequest("http://localhost/api/training-content"));
const QUESTION = { youtube_id: "abc", question: "Which?", options: ["A", "B", "C"], correct_index: 0, explanation: "Why." };
const PROMPT = { module: "pathways", discussion_question: "Discuss?", hint: null, passage: "Luke 24:13–35" };

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  h.requireLeader.mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: false } });
  h.getSupabaseAdmin.mockReturnValue(
    fakeSupabase({
      "training_video_questions.select": { data: [QUESTION, { ...QUESTION, youtube_id: "bad", correct_index: 9 }] },
      "training_module_prompts.select": { data: [PROMPT] },
    }).db
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/training-content", () => {
  it("gives any leader, pending included, the questions and cards, dropping broken rows", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      questions: [{ youtubeId: "abc", question: "Which?", options: ["A", "B", "C"], correctIndex: 0, explanation: "Why." }],
      prompts: [{ module: "pathways", discussionQuestion: "Discuss?", hint: null, passage: "Luke 24:13–35" }],
    });
  });

  it("answers with requireLeader's refusal and reads nothing", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    expect((await get()).status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("fails loud with a generic 500 when a read fails", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "training_module_prompts.select": { error: { message: "relation missing" } } }).db);
    const res = await get();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("relation");
  });
});
