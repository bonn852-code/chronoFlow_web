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
          background: "radial-gradient(circle at 20% 15%, #2fe0ff 0%, #129cff 42%, #0d5ed3 100%)",
          borderRadius: 96,
          position: "relative"
        }}
      >
        <div
          style={{
            width: 398,
            height: 398,
            borderRadius: 9999,
            border: "56px solid #ffffff",
            borderRightColor: "transparent",
            transform: "rotate(-23deg)",
            opacity: 0.98
          }}
        />
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 9999,
            background: "#ffffff",
            position: "absolute",
            right: 94,
            top: 168
          }}
        />
      </div>
    ),
    size
  );
}
