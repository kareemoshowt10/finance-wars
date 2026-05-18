import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/ratelimit";

function req(ip: string, bearer?: string) {
  const headers = new Headers();
  headers.set("x-forwarded-for", ip);
  if (bearer) headers.set("authorization", `Bearer ${bearer}`);
  return new Request("http://localhost/test", { headers });
}

describe("rateLimit", () => {
  it("returns null while under limit", () => {
    const r = req("1.1.1.1");
    const out = rateLimit(r, { key: "t1", limit: 3, windowMs: 1000 });
    expect(out).toBeNull();
  });

  it("blocks once tokens exhausted, returns 429", () => {
    const ip = "2.2.2.2";
    const opts = { key: "t2", limit: 2, windowMs: 60_000 };
    expect(rateLimit(req(ip), opts)).toBeNull();
    expect(rateLimit(req(ip), opts)).toBeNull();
    const blocked = rateLimit(req(ip), opts);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("resets after window expires", async () => {
    const ip = "3.3.3.3";
    const opts = { key: "t3", limit: 1, windowMs: 10 };
    expect(rateLimit(req(ip), opts)).toBeNull();
    expect(rateLimit(req(ip), opts)).not.toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    expect(rateLimit(req(ip), opts)).toBeNull();
  });

  it("uses higher bearer limit for bearer-auth requests", () => {
    const opts = { key: "t4", limit: 1, bearerLimit: 3, windowMs: 60_000 };
    const bearer = "fw_pat_aaaaaaaaaaaaaaaaaaaa";
    expect(rateLimit(req("4.4.4.4", bearer), opts)).toBeNull();
    expect(rateLimit(req("4.4.4.4", bearer), opts)).toBeNull();
    expect(rateLimit(req("4.4.4.4", bearer), opts)).toBeNull();
    expect(rateLimit(req("4.4.4.4", bearer), opts)).not.toBeNull();
  });
});
