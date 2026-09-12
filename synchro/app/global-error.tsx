"use client";

// global-error.tsx: Must include <html> and <body> tags (replaces root layout on crash)
// No hooks allowed - this gets prerendered by Next.js build
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          background: "#090d16",
          color: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
          margin: 0,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#450a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: 22,
              lineHeight: "48px",
            }}
          >
            ⚠
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 8,
              marginTop: 0,
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              marginBottom: 24,
            }}
          >
            {error?.message || "An unexpected error occurred."}
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <button
              onClick={() => reset()}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#06b6d4",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #1e293b",
                background: "transparent",
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
