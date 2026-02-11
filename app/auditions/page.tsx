import Link from "next/link";
import AuditionForm from "./form";

export default function AuditionsPage() {
  return (
    <div className="stack">
      <AuditionForm />
      <section className="card stack">
        <h2>申請方法について</h2>
        <p className="meta">
          ログインが難しい方は、Instagram または TikTok のDMから申請していただいても問題ありません。
        </p>
      </section>
      <section className="card split">
        <div>
          <h2>結果確認</h2>
          <p className="meta">結果発表ページは公開一覧で全員が確認できます。</p>
        </div>
        <Link className="btn" href="/auditions/result">
          結果一覧を見る
        </Link>
      </section>
      <section className="card split">
        <div>
          <h2>不合格アドバイス確認</h2>
          <p className="meta">アドバイス希望者のみ、申請コードで本人向けアドバイスを確認できます。</p>
        </div>
        <Link className="btn" href="/auditions/advice">
          アドバイスを確認
        </Link>
      </section>
    </div>
  );
}
