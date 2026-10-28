import { describe, expect, it } from "vitest";
import { onrampConfirmationEmail } from "./onramp";

describe("onrampConfirmationEmail", () => {
  it("greets by first name and lists the date, time, venue and workshops", () => {
    const mail = onrampConfirmationEmail("Ann Lee", ["worship", "creative"]);
    expect(mail.subject).toBe("You're in: Avenue On-Ramp, Sunday 15 November 2026");
    expect(mail.text).toContain("You're in, Ann!");
    expect(mail.text).toContain("Sunday 15 November 2026, 9am–4:30pm");
    expect(mail.text).toContain("Where: Mont Albert SDA Church");
    expect(mail.text).toContain("Worship leading (Matt)");
    expect(mail.text).toContain("Running creative evangelistic spaces (Ash)");
    expect(mail.text).toContain("YOUR WORKSHOPS");
  });

  it("escapes what the visitor typed", () => {
    const mail = onrampConfirmationEmail("<b>Ann</b>", ["worship"]);
    expect(mail.html).not.toContain("<b>Ann</b>");
    expect(mail.html).toContain("&lt;b&gt;Ann&lt;/b&gt;");
    expect(mail.text).toContain("YOUR WORKSHOP\n");
  });
});
