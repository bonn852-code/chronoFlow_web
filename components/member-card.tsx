import Link from "next/link";
import { toDayDiff } from "@/lib/utils";
import { MemberAvatar } from "@/components/member-avatar";

type Props = {
  id: string;
  displayName: string;
  joinedAt: string;
  iconUrl?: string | null;
  iconFocusX?: number | null;
  iconFocusY?: number | null;
  reactions?: number;
};

export function MemberCard({
  id,
  displayName,
  joinedAt,
  iconUrl,
  iconFocusX,
  iconFocusY,
  reactions = 0
}: Props) {
  const days = toDayDiff(joinedAt);
  return (
    <Link href={`/members/${id}`} className="card stack" prefetch={false}>
      <div className="split">
        <MemberAvatar name={displayName} iconUrl={iconUrl} focusX={iconFocusX} focusY={iconFocusY} />
        <h3 style={{ margin: 0, flex: 1 }}>{displayName}</h3>
      </div>
      <p className="meta">加入から {days} 日</p>
      <p className="meta">加入日: {new Date(joinedAt).toLocaleDateString("ja-JP")}</p>
      <span className="badge">Reactions {reactions}</span>
    </Link>
  );
}
