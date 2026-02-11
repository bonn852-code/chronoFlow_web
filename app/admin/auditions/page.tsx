"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";

type Application = {
  id: string;
  display_name: string;
  video_url: string;
  sns_urls: string[];
  consent_public_profile: boolean;
  consent_advice: boolean;
  status: "pending" | "approved" | "rejected";
  advice_text: string | null;
  created_at: string;
  application_code: string;
};

type BatchInfo = {
  id: string;
  title: string;
  apply_open_at: string;
  apply_close_at: string;
  published_at: string | null;
};

export default function AdminAuditionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<Application[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(7);
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const latestLoadId = useRef(0);
  const toStatusLabel = (status: Application["status"]) => {
    if (status === "approved") return "合格";
    if (status === "rejected") return "不合格";
    return "審査中";
  };

  const load = useCallback(async () => {
    const loadId = ++latestLoadId.current;
    const ts = Date.now();
    const res = await fetch(`/api/admin/auditions?page=${page}&pageSize=${pageSize}&ts=${ts}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store" }
    });
    const data = (await res.json()) as {
      applications?: Application[];
      batch?: BatchInfo;
      batches?: BatchInfo[];
      total?: number;
      pageSize?: number;
      error?: string;
    };
    if (!res.ok) {
      setMessage(data.error || "取得失敗");
      return;
    }
    if (loadId !== latestLoadId.current) return;
    setItems(data.applications || []);
    setBatches(data.batches || []);
    setTotal(data.total || 0);
    setPageSize(data.pageSize || 7);
    if (data.batch) {
      setBatch(data.batch);
      setOpenAt(new Date(data.batch.apply_open_at).toISOString().slice(0, 16));
      setCloseAt(new Date(data.batch.apply_close_at).toISOString().slice(0, 16));
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (pathname === "/admin/auditions") {
      void load();
    }
  }, [pathname, load]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setBatches([]);
        void load();
      }
    };
    const handlePageShow = () => {
      setBatches([]);
      void load();
    };
    const handleFocus = () => {
      setBatches([]);
      void load();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
    };
  }, [load]);

  async function review(id: string, status: "approved" | "rejected") {
    setLoading(true);
    const advice = status === "rejected" ? window.prompt("アドバイス（任意）", "") || "" : "";
    const res = await fetch(`/api/admin/auditions/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adviceText: advice })
    });
    if (!res.ok) setMessage("更新に失敗しました");
    await load();
    setLoading(false);
  }

  async function publish() {
    if (!window.confirm("結果発表を実行しますか？")) return;
    const res = await fetch("/api/admin/auditions/publish", { method: "POST" });
    const data = (await res.json()) as { error?: string; publishedCount?: number };
    if (!res.ok) {
      setMessage(data.error || "実行失敗");
      return;
    }
    setMessage(`結果発表を実行しました。対象: ${data.publishedCount || 0}`);
    await load();
  }

  async function savePeriod() {
    if (!openAt || !closeAt) return;
    const res = await fetch("/api/admin/auditions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applyOpenAt: new Date(openAt).toISOString(),
        applyCloseAt: new Date(closeAt).toISOString()
      })
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error || "期間更新に失敗しました");
      return;
    }
    setMessage("申請期間を更新しました");
    await load();
  }

  async function deleteBatch(id: string) {
    if (!window.confirm("この回次結果を削除しますか？（申請データも削除されます）")) return;
    const res = await fetch(`/api/admin/auditions/batches/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error || "回次削除に失敗しました");
      return;
    }
    setMessage("回次結果を削除しました");
    setBatches((prev) => prev.filter((b) => b.id !== id));
    if (batch?.id === id) {
      setBatch(null);
      setOpenAt("");
      setCloseAt("");
      setItems([]);
      setTotal(0);
    }
    await load();
    router.refresh();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="stack">
      <section className="card stack">
        <h1>Audition Management</h1>
        <AdminNav />
        {batch ? (
          <div className="card stack">
            <h3>申請期間設定</h3>
            <p className="meta">
              バッチ: {batch.title} / 発表状態: {batch.published_at ? "公開済み" : "未公開"}
            </p>
            <div className="grid grid-2">
              <label>
                開始日時
                <input type="datetime-local" value={openAt} onChange={(e) => setOpenAt(e.target.value)} />
              </label>
              <label>
                終了日時
                <input type="datetime-local" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} />
              </label>
            </div>
            <button className="btn" type="button" onClick={savePeriod}>
              申請期間を保存
            </button>
          </div>
        ) : null}
        <button className="btn primary" type="button" onClick={publish} disabled={loading}>
          結果発表を実行
        </button>
        {message ? <p className="meta">{message}</p> : null}
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        <div className="split" style={{ marginBottom: "10px" }}>
          <strong>申請一覧</strong>
          <span className="meta">
            {page}/{totalPages} ({total}件)
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>表示名</th>
              <th>動画</th>
              <th>同意</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="stack">
                    <strong>{item.display_name}</strong>
                    <span className="meta">{new Date(item.created_at).toLocaleString("ja-JP")}</span>
                    <span className="meta">code: {item.consent_advice ? item.application_code : "なし"}</span>
                  </div>
                </td>
                <td>
                  <a href={item.video_url} target="_blank" rel="noreferrer" className="btn">
                    動画
                  </a>
                </td>
                <td className="meta">
                  public: {item.consent_public_profile ? "yes" : "no"}
                  <br />
                  advice: {item.consent_advice ? "yes" : "no"}
                </td>
                <td>{toStatusLabel(item.status)}</td>
                <td>
                  <div className="split">
                    <button className="btn" type="button" onClick={() => review(item.id, "approved")}>
                      合格
                    </button>
                    <button className="btn danger" type="button" onClick={() => review(item.id, "rejected")}>
                      不合格
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="split">
        <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          前へ
        </button>
        <button
          className="btn"
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          次へ
        </button>
      </section>

      <section className="card stack">
        <h2>回次結果一覧</h2>
        {!batches.length ? <p className="meta">回次データがありません。</p> : null}
        {batches.map((b) => (
          <div key={b.id} className="split card">
            <div className="stack">
              <strong>{b.title}</strong>
              <span className="meta">
                期間: {new Date(b.apply_open_at).toLocaleDateString("ja-JP")} - {new Date(b.apply_close_at).toLocaleDateString("ja-JP")}
              </span>
              <span className="meta">発表: {b.published_at ? new Date(b.published_at).toLocaleString("ja-JP") : "未発表"}</span>
            </div>
            <button className="btn danger" type="button" onClick={() => deleteBatch(b.id)}>
              削除
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
