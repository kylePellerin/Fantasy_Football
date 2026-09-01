import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RosterPulse — Fantasy Football Start/Sit Optimizer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #EFF2F7 0%, #E2E8F0 55%, #D1FAE5 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "#059669",
              color: "white",
              fontSize: "44px",
              fontWeight: 800,
            }}
          >
            R
          </div>
          <div style={{ fontSize: "40px", fontWeight: 800, color: "#0F172A" }}>
            RosterPulse
          </div>
        </div>
        <div
          style={{
            fontSize: "68px",
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.05,
            letterSpacing: "-2px",
          }}
        >
          Fantasy Football
        </div>
        <div
          style={{
            fontSize: "68px",
            fontWeight: 800,
            color: "#059669",
            lineHeight: 1.05,
            letterSpacing: "-2px",
          }}
        >
          Start/Sit Optimizer
        </div>
        <div
          style={{
            marginTop: "34px",
            fontSize: "30px",
            color: "#475569",
            fontWeight: 500,
          }}
        >
          Sleeper &amp; ESPN · projections · betting lines · expert consensus
        </div>
      </div>
    ),
    { ...size },
  );
}
