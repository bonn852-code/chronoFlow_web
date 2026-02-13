"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";

type AdminUser = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  suspended: boolean;
  suspendReason: string | null;
  suspendedAt: string | null;
  isMember: boolean;
  memberGrantedAt: string | null;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState<Record<string, string>>({});

  async function load(targetPage = page) {
    const res = await fetch(`/api/admin/users?page=${targetPage}&pageSize=${pageSize}`, { cache: "no-store" });
    const data = (await res.json()) as { users?: AdminUser[]; total?: number; page?: number; pageSize?: number; error?: string };
    if (!res.ok) {
      setMessage(data.error || "ユーザー一覧の取得に失敗しました");
      return;
    }
    setItems(data.users || []);
    setTotal(data.total || 0);
    setPage(data.page || targetPage);
    setPageSize(data.pageSize || pageSize);
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function changeSuspend(userId: string, next: boolean) {
    setPending((prev) => ({ ...prev, [userId]: "suspend" }));
    setMessage("更新中...");
    const reason = next ? window.prompt("停止理由（任意）", "") || "" : "";
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: next, reason })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || "停止状態の更新に失敗しました");
        return;
      }
      setMessage(next ? "ユーザーを停止しました" : "停止を解除しました");
      await load(page);
    } finally {
      setPending((prev) => {
        const nextState = { ...prev };
        delete nextState[userId];
        return nextState;
      });
    }
  }

  async function changeMember(userId: string, next: boolean) {
    setPending((prev) => ({ ...prev, [userId]: "member" }));
    setMessage("更新中...");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMember: next })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || "メンバー権限の更新に失敗しました");
        return;
      }
      setMessage(next ? "メンバー権限を付与しました" : "メンバー権限を解除しました");
      await load(page);
    } finally {
      setPending((prev) => {
        const nextState = { ...prev };
        delete nextState[userId];
        return nextState;
      });
    }
  }

  async function deleteUser(userId: string, email: string | null) {
    if (!window.confirm(`${email || userId} を削除します。元に戻せません。`)) return;
    setPending((prev) => ({ ...prev, [userId]: "delete" }));
    setMessage("更新中...");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || "ユーザー削除に失敗しました");
        return;
      }
      setMessage("ユーザーを削除しました");
      await load(page);
    } finally {
      setPending((prev) => {
        const nextState = { ...prev };
        delete nextState[userId];
        return nextState;
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="stack">
      <section className="card stack">
        <h1>アカウント管理</h1>
        <AdminNav />
        <p className="meta">停止したアカウントはログイン後も機能操作できません。メンバー権限を付与したユーザーだけ Assets を閲覧できます。</p>
        {message ? <p className="meta">{message}</p> : null}
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>メール</th>
              <th>登録日</th>
              <th>最終ログイン</th>
              <th>状態</th>
              <th>メンバー権限</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="stack">
                    <strong>{u.email || "(no email)"}</strong>
                    {u.suspendReason ? <span className="meta">理由: {u.suspendReason}</span> : null}
                  </div>
                </td>
                <td>{new Date(u.createdAt).toLocaleString("ja-JP")}</td>
                <td>{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString("ja-JP") : "-"}</td>
                <td>{u.suspended ? "停止中" : "有効"}</td>
                <td>{u.isMember ? "付与済み" : "未付与"}</td>
                <td>
                  <div className="split admin-actions">
                    <button
                      className={`btn${pending[u.id] === "suspend" ? " is-loading" : ""}`}
                      type="button"
                      onClick={() => changeSuspend(u.id, !u.suspended)}
                      disabled={Boolean(pending[u.id])}
                    >
                      {u.suspended ? "停止解除" : "停止"}
                    </button>
                    <button
                      className={`btn${pending[u.id] === "member" ? " is-loading" : ""}`}
                      type="button"
                      onClick={() => changeMember(u.id, !u.isMember)}
                      disabled={Boolean(pending[u.id])}
                    >
                      {u.isMember ? "会員解除" : "会員化"}
                    </button>
                    <button
                      className={`btn danger${pending[u.id] === "delete" ? " is-loading" : ""}`}
                      type="button"
                      onClick={() => deleteUser(u.id, u.email)}
                      disabled={Boolean(pending[u.id])}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pager">
        <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          前へ
        </button>
        <span className="meta">
          {page} / {totalPages}
        </span>
        <button className="btn" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          次へ
        </button>
      </section>
    </div>
  );
}
