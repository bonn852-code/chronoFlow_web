import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 18% 18%, #35e2ff 0%, #169bff 45%, #0d58cf 100%)",
          borderRadius: 96
        }}
      >
        <div
          style={{
            width: 438,
            height: 438,
            borderRadius: 9999,
            border: "72px solid #ffffff",
            borderRightColor: "transparent",
            transform: "rotate(-14deg)"
          }}
        />
      </div>
    ),
    size
  );
}
