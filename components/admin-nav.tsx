import Link from "next/link";

export function AdminNav() {
  return (
    <nav className="nav">
      <Link href="/admin">ダッシュボード</Link>
      <Link href="/admin/auditions">審査管理</Link>
      <Link href="/admin/members">メンバー管理</Link>
      <Link href="/admin/users">アカウント管理</Link>
      <Link href="/admin/inquiries">お問い合わせ管理</Link>
      <Link href="/admin/security">運用監査</Link>
      <Link href="/admin/assets">素材管理</Link>
      <Link href="/admin/learn/ae">AE学習管理</Link>
      <Link href="/admin/announcements">お知らせ管理</Link>
    </nav>
  );
}
