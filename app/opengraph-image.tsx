import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "VEXARO SMM Panel – Affordable Social Media Marketing Services";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #07100f 0%, #0d1a1b 50%, #07100f 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          border: "8px solid #1a2b2c",
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(186, 255, 0, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
            top: "-150px",
            left: "300px",
          }}
        />

        {/* Logo Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "84px",
            height: "84px",
            borderRadius: "24px",
            background: "#baff00",
            color: "#07100f",
            fontSize: "46px",
            fontWeight: "900",
            boxShadow: "0 0 40px rgba(186, 255, 0, 0.5)",
            marginBottom: "24px",
          }}
        >
          V
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: "56px",
            fontWeight: "900",
            color: "#ffffff",
            letterSpacing: "-0.03em",
            textAlign: "center",
            marginBottom: "14px",
          }}
        >
          VEXARO SMM PANEL
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontSize: "24px",
            fontWeight: "600",
            color: "#baff00",
            marginBottom: "28px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          #1 Cheapest &amp; Automated SMM Services
        </div>

        {/* Feature Pills */}
        <div
          style={{
            display: "flex",
            gap: "14px",
          }}
        >
          {["⚡ Instant Automated Delivery", "💳 SadaPay &amp; Easypaisa 0% Fee", "🤖 AI &amp; Subscriptions Store", "🛡️ 24/7 Dedicated Support"].map((pill) => (
            <div
              key={pill}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                padding: "10px 20px",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: "700",
              }}
            >
              {pill}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
