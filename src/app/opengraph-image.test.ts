import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SHARE_IMAGE } from "@/lib/domain/pageMeta";

const file = (name: string) => readFileSync(fileURLToPath(new URL(name, import.meta.url)));

describe("share image", () => {
  const png = file("./opengraph-image.png");

  it("is a 1200 x 630 PNG under 300 KB", () => {
    // The IHDR chunk holds the width and height, big-endian, at bytes 16 and 20.
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([SHARE_IMAGE.width, SHARE_IMAGE.height]);
    expect(png.length).toBeLessThan(300 * 1024);
  });

  it("has the same alt text in the file and in pageMetadata", () => {
    expect(file("./opengraph-image.alt.txt").toString("utf8").trim()).toBe(SHARE_IMAGE.alt);
  });
});
