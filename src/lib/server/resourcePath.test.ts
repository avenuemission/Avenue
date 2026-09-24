import { describe, expect, it } from "vitest";
import path from "path";
import { resolveResourcePath } from "./resourcePath";

const ROOT = path.resolve("/srv/private/leader-resources");

describe("resolveResourcePath", () => {
  it("resolves a file at the root", () => {
    expect(resolveResourcePath(ROOT, "guide.pdf")).toBe(path.join(ROOT, "guide.pdf"));
  });
  it("resolves a file in a subfolder", () => {
    expect(resolveResourcePath(ROOT, "music/Homebound Chord Charts (1).pdf")).toBe(
      path.join(ROOT, "music", "Homebound Chord Charts (1).pdf")
    );
  });
  it("accepts backslash separators", () => {
    expect(resolveResourcePath(ROOT, "music\\notes.pdf")).toBe(path.join(ROOT, "music", "notes.pdf"));
  });
  it("rejects parent traversal", () => {
    expect(resolveResourcePath(ROOT, "../secret.txt")).toBeNull();
    expect(resolveResourcePath(ROOT, "music/../../secret.txt")).toBeNull();
  });
  it("allows .. that stays inside the root", () => {
    expect(resolveResourcePath(ROOT, "music/../guide.pdf")).toBe(path.join(ROOT, "guide.pdf"));
  });
  it("rejects absolute paths", () => {
    expect(resolveResourcePath(ROOT, "/etc/passwd")).toBeNull();
    expect(resolveResourcePath(ROOT, "C:\\Windows\\win.ini")).toBeNull();
  });
  it("rejects empty, root itself and NUL bytes", () => {
    expect(resolveResourcePath(ROOT, "")).toBeNull();
    expect(resolveResourcePath(ROOT, ".")).toBeNull();
    expect(resolveResourcePath(ROOT, "music/a\0.pdf")).toBeNull();
  });
  it("rejects a sibling folder that shares the root's name prefix", () => {
    expect(resolveResourcePath(ROOT, "../leader-resources-evil/x.pdf")).toBeNull();
  });
});
