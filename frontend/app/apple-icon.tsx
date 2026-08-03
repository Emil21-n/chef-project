import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#160d0d",
          borderRadius: 42,
          color: "#ff3b30",
          display: "flex",
          fontSize: 118,
          fontWeight: 900,
          height: "100%",
          justifyContent: "center",
          width: "100%"
        }}
      >
        C
      </div>
    ),
    size
  );
}
