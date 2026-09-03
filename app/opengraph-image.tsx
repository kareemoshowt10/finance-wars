import { ImageResponse } from "next/og";

export const alt = "Debt Sucker — become the bank, run the household";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card every shared link unfurls into — iMessage, Slack, X, LinkedIn.
 * Generated rather than shipped as a static PNG so the wording stays in sync
 * with the app's own metadata, and drawn with plain system fonts so it never
 * depends on a font fetch succeeding at request time.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#000",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "rgba(255,255,255,0.55)", fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Debt Sucker
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "28px",
            fontSize: 82,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            background: "linear-gradient(to bottom right, #818cf8, #e879f9)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Become the bank.
        </div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.05, color: "#fff" }}>
          Run the household.
        </div>
        <div style={{ display: "flex", marginTop: "36px", fontSize: 30, color: "rgba(255,255,255,0.6)", lineHeight: 1.4, maxWidth: "900px" }}>
          Family loans, chores and shared goals — on one scoreboard.
        </div>
        <div style={{ display: "flex", gap: "14px", marginTop: "44px" }}>
          {["Chores", "The Bank", "Shared goals", "Streaks"].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "rgba(255,255,255,0.75)",
                fontSize: 24,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
