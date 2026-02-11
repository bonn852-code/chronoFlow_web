import { toDayDiff } from "@/lib/utils";

export function MemberBadges({ joinedAt, isTop }: { joinedAt: string; isTop?: boolean }) {
  const days = toDayDiff(joinedAt);
  const badges: string[] = [];
  if (days >= 1095) badges.push("Veteran 3Y");
  else if (days >= 365) badges.push("Veteran 1Y");
  if (isTop) badges.push("Rank #1");

  if (!badges.length) return null;

  return (
    <div className="split">
      {badges.map((badge) => (
        <span className="badge" key={badge}>
          {badge}
        </span>
      ))}
    </div>
  );
}
