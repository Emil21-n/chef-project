import { ImageResponse } from "next/og";

export const SOCIAL_IMAGE_ALT =
  "Chef's Choice — доставка турецкой кухни в Москве";
export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630
};
export const SOCIAL_IMAGE_CONTENT_TYPE = "image/png";

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(135deg, #100b0b 0%, #281111 52%, #7a1616 100%)",
          color: "#fff7f2",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%"
        }}
      >
        <div
          style={{
            border: "2px solid rgba(255,255,255,.18)",
            borderRadius: 44,
            display: "flex",
            flexDirection: "column",
            height: 510,
            justifyContent: "space-between",
            padding: "58px 66px",
            width: 1080
          }}
        >
          <div
            style={{
              color: "#ff5448",
              display: "flex",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 5,
              textTransform: "uppercase"
            }}
          >
            Turkish kitchen · Moscow
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 100,
                fontWeight: 900,
                letterSpacing: -5,
                lineHeight: 1
              }}
            >
              Chef&apos;s Choice
            </div>
            <div
              style={{
                color: "#f0d8cd",
                display: "flex",
                fontSize: 36,
                marginTop: 24
              }}
            >
              Доставка турецкой кухни от 60 минут
            </div>
          </div>
          <div style={{ color: "#d9bdb2", display: "flex", fontSize: 28 }}>
            chefschoice-turk.ru · +7 (926) 925-44-55
          </div>
        </div>
      </div>
    ),
    SOCIAL_IMAGE_SIZE
  );
}
