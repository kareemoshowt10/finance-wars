"use client";

/**
 * Last resort: an error thrown by the root layout itself, before any of the
 * app's providers, fonts or CSS have mounted. It has to render its own
 * <html>/<body> and can't rely on globals.css, so the styling is inline and
 * deliberately minimal.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#000", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Debt Sucker couldn&apos;t start</h1>
            <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "rgba(255,255,255,0.5)" }}>
              Something failed before the app finished loading. Reloading usually clears it.
            </p>
            {error.digest && (
              <p style={{ marginTop: "16px", fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>
                Reference: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{ marginTop: "32px", padding: "10px 20px", borderRadius: "9999px", border: 0, background: "#fff", color: "#000", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
