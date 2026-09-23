import { describe, expect, it, vi } from "vitest";
import { createOnce } from "./createOnce";

describe("createOnce", () => {
  it("shares one promise between concurrent calls for the same key", () => {
    const map = new Map<string, Promise<string>>();
    const factory = vi.fn(() => Promise.resolve("created"));

    const first = createOnce(map, "a", factory);
    const second = createOnce(map, "a", factory);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("starts a separate promise per key", () => {
    const map = new Map<string, Promise<string>>();
    const factory = vi.fn(() => Promise.resolve("created"));

    createOnce(map, "a", factory);
    createOnce(map, "b", factory);

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("retries after a rejection instead of replaying the failure", async () => {
    const map = new Map<string, Promise<string>>();
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("created");

    await expect(createOnce(map, "a", factory)).rejects.toThrow("boom");
    // The failed slot must be cleared: a later call is a fresh attempt.
    await expect(createOnce(map, "a", factory)).resolves.toBe("created");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("shares the promise while it is still in flight, before it settles", () => {
    const map = new Map<string, Promise<string>>();
    let resolveFactory: (v: string) => void;
    const factory = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFactory = resolve;
        })
    );

    const first = createOnce(map, "a", factory);
    const second = createOnce(map, "a", factory);
    resolveFactory!("created");

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
