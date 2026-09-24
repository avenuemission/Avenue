import { describe, expect, it } from "vitest";
import { isPlaceholderThumb, nextThumbSize, THUMB_ORDER, thumbUrl } from "./youtubeThumb";

describe("YouTube thumbnails", () => {
  it("starts from the 1280x720 image YouTube itself shows", () => {
    expect(THUMB_ORDER[0]).toBe("maxresdefault");
    expect(thumbUrl("-yjMDB8OXsg", "maxresdefault")).toBe("https://img.youtube.com/vi/-yjMDB8OXsg/maxresdefault.jpg");
  });
  it("falls back to sddefault, then hqdefault, then stops", () => {
    expect(nextThumbSize("maxresdefault")).toBe("sddefault");
    expect(nextThumbSize("sddefault")).toBe("hqdefault");
    expect(nextThumbSize("hqdefault")).toBeNull();
  });
  it("treats an image 120 px wide or less as YouTube's grey placeholder", () => {
    expect(isPlaceholderThumb(120)).toBe(true);
    expect(isPlaceholderThumb(0)).toBe(true);
    expect(isPlaceholderThumb(121)).toBe(false);
    expect(isPlaceholderThumb(1280)).toBe(false);
  });
});
