export const metadata = {
  title: "プライバシーポリシー"
};

export default function PrivacyPage() {
  return (
    <div className="stack">
      <section className="card stack">
        <h1>プライバシーポリシー</h1>
        <p className="meta">本ポリシーは、ChronoFlow Web（以下「本サービス」）における個人情報の取り扱いを定めます。</p>

        <h2>1. 取得する情報</h2>
        <p>当社は、本サービスの提供にあたり、以下の情報を取得する場合があります。</p>
        <p className="meta">- メールアドレス、表示名、プロフィール情報</p>
        <p className="meta">- お問い合わせ内容</p>
        <p className="meta">- アクセスログ、操作履歴、端末情報</p>

        <h2>2. 利用目的</h2>
        <p>取得した情報は、以下の目的で利用します。</p>
        <p className="meta">- 本サービスの提供・運営・改善</p>
        <p className="meta">- お問い合わせへの対応</p>
        <p className="meta">- 不正利用の防止やセキュリティ対策</p>

        <h2>3. 第三者提供</h2>
        <p>法令に基づく場合を除き、本人の同意なく第三者に提供しません。</p>

        <h2>4. 委託</h2>
        <p>業務遂行に必要な範囲で、外部サービスに処理を委託する場合があります。</p>

        <h2>5. 開示・訂正・削除</h2>
        <p>本人からの請求があった場合、法令に基づき適切に対応します。</p>

        <h2>6. 変更</h2>
        <p>本ポリシーは必要に応じて変更することがあります。変更後は本ページに掲示します。</p>

        <h2>7. お問い合わせ</h2>
        <p>本ポリシーに関するお問い合わせは、サイト内のお問い合わせフォームよりご連絡ください。</p>
      </section>
    </div>
  );
}
