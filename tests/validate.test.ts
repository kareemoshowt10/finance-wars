import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody } from "@/lib/validate";

const schema = z.object({ name: z.string().min(1), age: z.number().int() });

function req(body: unknown) {
  return new Request("http://localhost", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("parseBody", () => {
  it("returns data on valid body", async () => {
    const out = await parseBody(req({ name: "ok", age: 30 }), schema);
    expect(out.error).toBeNull();
    expect(out.data).toEqual({ name: "ok", age: 30 });
  });

  it("returns 422 with fields on validation failure", async () => {
    const out = await parseBody(req({ name: "", age: "x" }), schema);
    expect(out.data).toBeNull();
    expect(out.error).not.toBeNull();
    expect(out.error!.status).toBe(422);
    const json = await out.error!.json();
    expect(json.error).toBe("Validation failed");
    expect(json.fields).toBeDefined();
    expect(json.fields.name || json.fields.age).toBeTruthy();
  });

  it("returns 400 on invalid JSON", async () => {
    const r = new Request("http://localhost", { method: "POST", body: "not json", headers: { "Content-Type": "application/json" } });
    const out = await parseBody(r, schema);
    expect(out.error!.status).toBe(400);
  });
});
