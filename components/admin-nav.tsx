import Link from "next/link";

export function AdminNav() {
  return (
    <nav className="nav">
      <Link href="/admin">Dashboard</Link>
      <Link href="/admin/auditions">Auditions</Link>
      <Link href="/admin/members">Members</Link>
      <Link href="/admin/assets">Assets</Link>
      <Link href="/admin/learn/ae">AE Learn</Link>
      <Link href="/admin/announcements">Announcements</Link>
    </nav>
  );
}
