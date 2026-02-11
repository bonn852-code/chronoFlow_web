type Props = {
  name: string;
  iconUrl?: string | null;
  focusX?: number | null;
  focusY?: number | null;
  size?: number;
};

export function MemberAvatar({ name, iconUrl, focusX = 50, focusY = 50, size = 56 }: Props) {
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "999px",
    overflow: "hidden",
    border: "1px solid rgba(26, 169, 255, 0.25)",
    background: "linear-gradient(140deg, rgba(26,169,255,.18), rgba(53,215,160,.14))",
    display: "grid",
    placeItems: "center"
  } as const;

  if (!iconUrl) {
    return (
      <div style={style} aria-label={`${name} avatar`}>
        <span style={{ fontWeight: 700, color: "#2f5d88" }}>{name.slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <div style={style} aria-label={`${name} avatar`}>
      <img
        src={iconUrl}
        alt={`${name} icon`}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focusX}% ${focusY}%` }}
      />
    </div>
  );
}
