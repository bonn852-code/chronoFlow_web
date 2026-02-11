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
          background: "linear-gradient(145deg, #0ea5ff, #37d9a2)",
          borderRadius: 112,
          position: "relative"
        }}
      >
        <div
          style={{
            width: 344,
            height: 344,
            borderRadius: 9999,
            border: "42px solid #ffffff",
            borderRightColor: "transparent",
            transform: "rotate(-28deg)"
          }}
        />
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 9999,
            background: "#ffffff",
            position: "absolute",
            right: 108,
            top: 180
          }}
        />
      </div>
    ),
    size
  );
}
