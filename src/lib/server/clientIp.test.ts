import { describe, expect, it } from "vitest";
import { clientIp } from "./clientIp";

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/whatever", { headers });
}

describe("clientIp", () => {
  it("prefers x-nf-client-connection-ip", () => {
    const req = request({ "x-nf-client-connection-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 8.8.8.8" });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to the first x-forwarded-for entry", () => {
    const req = request({ "x-forwarded-for": "5.6.7.8, 9.9.9.9" });
    expect(clientIp(req)).toBe("5.6.7.8");
  });

  it("trims whitespace around the first forwarded entry", () => {
    const req = request({ "x-forwarded-for": "  5.6.7.8  , 9.9.9.9" });
    expect(clientIp(req)).toBe("5.6.7.8");
  });

  it("is unknown when neither header is present", () => {
    const req = request({});
    expect(clientIp(req)).toBe("unknown");
  });
});
