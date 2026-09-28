import { describe, expect, it } from "vitest";
import { SCENE_THRESHOLD, playScene, stillScene, type SceneRoot } from "./sceneStage";

function fakeRoot(ats: (string | undefined)[]) {
  const classes = new Set<string>();
  const begun: number[] = [];
  const anims = ats.map((at) => ({
    dataset: at === undefined ? {} : { at },
    beginElementAt: (offset: number) => begun.push(offset),
  }));
  const root: SceneRoot = {
    classList: { add: (c: string) => void classes.add(c) },
    querySelectorAll: (selector: string) => {
      expect(selector).toBe("animate, animateMotion");
      return anims;
    },
  };
  return { root, classes, begun };
}

describe("playScene", () => {
  it("adds play and starts each SMIL animation at its data-at offset", () => {
    const { root, classes, begun } = fakeRoot(["4.4", "4.55", "6.6"]);
    playScene(root);
    expect([...classes]).toEqual(["play"]);
    expect(begun).toEqual([4.4, 4.55, 6.6]);
  });

  it("works for scenes without SMIL", () => {
    const { root, classes, begun } = fakeRoot([]);
    playScene(root);
    expect([...classes]).toEqual(["play"]);
    expect(begun).toEqual([]);
  });

  it("throws on an animation with no usable data-at", () => {
    expect(() => playScene(fakeRoot([undefined]).root)).toThrow(/data-at/);
    expect(() => playScene(fakeRoot(["soon"]).root)).toThrow(/data-at/);
  });
});

describe("stillScene", () => {
  it("adds still and starts nothing", () => {
    const { root, classes, begun } = fakeRoot(["4.4"]);
    stillScene(root);
    expect([...classes]).toEqual(["still"]);
    expect(begun).toEqual([]);
  });
});

it("plays once 35% of the scene is in view", () => {
  expect(SCENE_THRESHOLD).toBe(0.35);
});
