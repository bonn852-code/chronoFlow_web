import Link from "next/link";

export default function NotFound() {
  return (
    <section className="card stack" style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1>Not Found</h1>
      <p className="meta">指定されたページは見つかりませんでした。</p>
      <Link href="/" className="btn primary">
        TOPへ戻る
      </Link>
    </section>
  );
}
