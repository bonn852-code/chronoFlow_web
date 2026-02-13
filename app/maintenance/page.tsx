export const metadata = {
  title: "メンテナンス中"
};

export default function MaintenancePage() {
  return (
    <div className="stack">
      <section className="card stack" style={{ maxWidth: 640, margin: "40px auto" }}>
        <h1>メンテナンス中</h1>
        <p className="meta">現在メンテナンス作業を行っています。しばらくしてから再度アクセスしてください。</p>
        <p className="meta">ご不便をおかけしますが、ご理解のほどお願いいたします。</p>
      </section>
    </div>
  );
}
