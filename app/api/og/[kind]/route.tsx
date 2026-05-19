import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { verifyPayload, isSigningEnabled } from "@/lib/og/sign";

export const runtime = "edge";

const KINDS = new Set(["sprint-win", "goal-reached", "duel-victory", "monthly-recap", "achievement"]);

const KIND_LABELS: Record<string, string> = {
  "sprint-win": "Sprint Win",
  "goal-reached": "Goal Reached",
  "duel-victory": "Duel Victory",
  "monthly-recap": "Monthly Recap",
  "achievement": "Achievement Unlocked",
};

export async function GET(req: NextRequest, { params }: { params: { kind: string } }) {
  const kind = params.kind;
  if (!KINDS.has(kind)) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const sig = url.searchParams.get("sig");
  const sp = new URLSearchParams(url.searchParams);
  sp.delete("sig");
  const payload = `${kind}?${sp.toString()}`;
  const valid = verifyPayload(payload, sig);
  const watermark = !isSigningEnabled() || !valid;
  if (isSigningEnabled() && !valid) {
    // accept unsigned only when secret unset; here secret is set + invalid sig
    return new Response("Bad signature", { status: 403 });
  }

  const title = url.searchParams.get("title") || KIND_LABELS[kind];
  const metric = url.searchParams.get("metric") || "";
  const sub1 = url.searchParams.get("sub1") || "";
  const sub2 = url.searchParams.get("sub2") || "";

  const gradients: Record<string, string> = {
    "sprint-win": "radial-gradient(at 20% 20%, #6366f1 0%, transparent 50%), radial-gradient(at 80% 80%, #ec4899 0%, transparent 50%)",
    "goal-reached": "radial-gradient(at 20% 20%, #10b981 0%, transparent 50%), radial-gradient(at 80% 80%, #6366f1 0%, transparent 50%)",
    "duel-victory": "radial-gradient(at 20% 20%, #f59e0b 0%, transparent 50%), radial-gradient(at 80% 80%, #ef4444 0%, transparent 50%)",
    "monthly-recap": "radial-gradient(at 20% 20%, #3b82f6 0%, transparent 50%), radial-gradient(at 80% 80%, #8b5cf6 0%, transparent 50%)",
    "achievement": "radial-gradient(at 20% 20%, #a855f7 0%, transparent 50%), radial-gradient(at 80% 80%, #06b6d4 0%, transparent 50%)",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000",
          backgroundImage: gradients[kind],
          color: "#fff",
          padding: "80px",
          fontFamily: "system-ui",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", fontSize: 20, letterSpacing: 6, opacity: 0.6, textTransform: "uppercase" }}>
          {KIND_LABELS[kind]}
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, marginTop: 28, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>
          {title}
        </div>
        {metric && (
          <div style={{ display: "flex", fontSize: 140, fontWeight: 800, marginTop: 40, letterSpacing: -4 }}>
            {metric}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 6, opacity: 0.8 }}>
          {sub1 && <div style={{ fontSize: 26 }}>{sub1}</div>}
          {sub2 && <div style={{ fontSize: 22, opacity: 0.7 }}>{sub2}</div>}
        </div>
        <div style={{ position: "absolute", bottom: 40, right: 60, display: "flex", fontSize: 18, opacity: 0.6, letterSpacing: 2 }}>
          FINANCE WARS
        </div>
        {watermark && (
          <div style={{ position: "absolute", top: 40, right: 60, display: "flex", fontSize: 14, opacity: 0.5, letterSpacing: 3 }}>
            PREVIEW
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
