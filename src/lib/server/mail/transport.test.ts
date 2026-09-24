import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// nodemailer is replaced, so these tests never open an SMTP connection.
const h = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: h.sendMail }) } }));

import { sendEmail } from "./transport";

beforeEach(() => {
  h.sendMail.mockReset().mockResolvedValue({});
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendEmail", () => {
  it("throws a clear error when GMAIL_USER is missing, and sends nothing", async () => {
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "app-password");
    await expect(sendEmail("ann@example.invalid", "Hi", "<p>Hi</p>")).rejects.toThrow(/GMAIL_USER.*GMAIL_APP_PASSWORD/);
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("throws a clear error when GMAIL_APP_PASSWORD is missing, and sends nothing", async () => {
    vi.stubEnv("GMAIL_USER", "office@example.invalid");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    await expect(sendEmail("ann@example.invalid", "Hi", "<p>Hi</p>")).rejects.toThrow(/not configured/);
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("sends through Gmail when configured, with the optional text and headers", async () => {
    vi.stubEnv("GMAIL_USER", "office@example.invalid");
    vi.stubEnv("GMAIL_APP_PASSWORD", "app-password");
    await sendEmail("ann@example.invalid", "Hi", "<p>Hi</p>", { text: "Hi", headers: { "List-Unsubscribe": "<x>" } });
    expect(h.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ann@example.invalid", subject: "Hi", html: "<p>Hi</p>", text: "Hi", headers: { "List-Unsubscribe": "<x>" } })
    );
  });

  it("passes a Gmail failure straight up", async () => {
    vi.stubEnv("GMAIL_USER", "office@example.invalid");
    vi.stubEnv("GMAIL_APP_PASSWORD", "app-password");
    h.sendMail.mockRejectedValueOnce(new Error("535 bad credentials"));
    await expect(sendEmail("ann@example.invalid", "Hi", "<p>Hi</p>")).rejects.toThrow("535 bad credentials");
  });
});
