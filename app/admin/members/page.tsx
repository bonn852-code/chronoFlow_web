"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { MemberAvatar } from "@/components/member-avatar";

type Member = {
  id: string;
  display_name: string;
  joined_at: string;
  is_active: boolean;
  icon_url: string | null;
  icon_focus_x: number;
  icon_focus_y: number;
  portal_token: string;
};

type LinkItem = {
  id: string;
  platform: string;
  url: string;
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [linksByMember, setLinksByMember] = useState<Record<string, LinkItem[]>>({});
  const [iconDrafts, setIconDrafts] = useState<Record<string, { iconUrl: string; focusX: number; focusY: number }>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/members?includeInactive=${includeInactive ? "1" : "0"}&page=${page}&pageSize=${pageSize}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as { members?: Member[]; total?: number; pageSize?: number; error?: string };
    if (!res.ok) {
      setMessage(data.error || "取得に失敗しました");
      return;
    }

    setMembers(data.members || []);
    setTotal(data.total || 0);
    setPageSize(data.pageSize || 7);

    const drafts: Record<string, { iconUrl: string; focusX: number; focusY: number }> = {};
    (data.members || []).forEach((m) => {
      drafts[m.id] = {
        iconUrl: m.icon_url || "",
        focusX: typeof m.icon_focus_x === "number" ? m.icon_focus_x : 50,
        focusY: typeof m.icon_focus_y === "number" ? m.icon_focus_y : 50
      };
    });
    setIconDrafts(drafts);

    const linkMap: Record<string, LinkItem[]> = {};
    await Promise.all(
      (data.members || []).map(async (member) => {
        const detail = await fetch(`/api/members/${member.id}`, { cache: "no-store" });
        const detailData = (await detail.json()) as { links?: LinkItem[] };
        linkMap[member.id] = detailData.links || [];
      })
    );
    setLinksByMember(linkMap);
  }, [includeInactive, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addMember(formData: FormData) {
    const displayName = String(formData.get("displayName") || "");
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName })
    });
    if (!res.ok) setMessage("追加に失敗しました");
    await load();
  }

  async function deactivate(id: string) {
    if (!window.confirm("このメンバーを公開一覧から削除（非アクティブ化）しますか？")) return;
    const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
    if (!res.ok) setMessage("削除に失敗しました");
    else setMessage("公開一覧から削除しました（データは保持されています）");
    await load();
  }

  async function hardDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" をDBから完全削除します。元に戻せません。実行しますか？`)) return;
    const res = await fetch(`/api/admin/members/${id}?permanent=1`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error || "完全削除に失敗しました");
      return;
    }
    setMessage("完全削除しました");
    await load();
  }

  async function regenerate(id: string) {
    const res = await fetch(`/api/admin/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regeneratePortal: true })
    });
    if (!res.ok) setMessage("再発行に失敗しました");
    await load();
  }

  async function addLink(memberId: string) {
    const url = window.prompt("作品URLを入力") || "";
    if (!url) return;
    const res = await fetch(`/api/admin/members/${memberId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    if (!res.ok) setMessage("リンク追加に失敗しました");
    await load();
  }

  async function removeLink(id: string) {
    const res = await fetch(`/api/admin/member_links/${id}`, { method: "DELETE" });
    if (!res.ok) setMessage("リンク削除に失敗しました");
    await load();
  }

  async function saveIcon(memberId: string) {
    const draft = iconDrafts[memberId];
    if (!draft) return;
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        iconUrl: draft.iconUrl.trim() || null,
        iconFocusX: draft.focusX,
        iconFocusY: draft.focusY
      })
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error || "アイコン設定の保存に失敗しました");
      return;
    }
    setMessage("アイコン設定を保存しました");
    await load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="stack">
      <section className="card stack">
        <h1>メンバー管理</h1>
        <AdminNav />
        <div className="card stack">
          <p className="meta">`ポータル再発行` はメンバー専用URLトークンを新規発行し、古いURLを無効化します。</p>
          <p className="meta">`非アクティブ化` は公開一覧やランキングから除外します。</p>
          <p className="meta">`完全削除` はDBから完全に削除します（復元不可）。</p>
          <label>
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            非アクティブメンバーも表示
          </label>
        </div>
        <form action={addMember} className="split">
          <input name="displayName" placeholder="新規メンバー表示名" required />
          <button className="btn primary" type="submit">
            追加
          </button>
        </form>
        {message ? <p className="meta">{message}</p> : null}
      </section>

      {members.map((member) => (
        <section className="card stack" key={member.id}>
          <div className="split">
            <div>
              <h3>{member.display_name}</h3>
              <p className="meta">{new Date(member.joined_at).toLocaleDateString("ja-JP")}</p>
              <p className="meta">状態: {member.is_active ? "active" : "inactive"}</p>
              <p className="meta">portal: /portal/{member.portal_token}</p>
            </div>
            <div className="split admin-actions">
              <button className="btn" type="button" onClick={() => addLink(member.id)}>
                作品リンク追加
              </button>
              <button className="btn" type="button" onClick={() => regenerate(member.id)}>
                ポータル再発行
              </button>
              <button className="btn danger" type="button" onClick={() => deactivate(member.id)}>
                非アクティブ化
              </button>
              <button className="btn danger" type="button" onClick={() => hardDelete(member.id, member.display_name)}>
                完全削除
              </button>
            </div>
          </div>

          <div className="card stack">
            <strong>アイコン設定（円形）</strong>
            <div className="split admin-actions">
              <MemberAvatar
                name={member.display_name}
                iconUrl={iconDrafts[member.id]?.iconUrl || ""}
                focusX={iconDrafts[member.id]?.focusX ?? 50}
                focusY={iconDrafts[member.id]?.focusY ?? 50}
                size={72}
              />
              <div className="stack" style={{ flex: 1 }}>
                <label>
                  アイコン画像URL
                  <input
                    placeholder="https://..."
                    value={iconDrafts[member.id]?.iconUrl || ""}
                    onChange={(e) =>
                      setIconDrafts((prev) => ({
                        ...prev,
                        [member.id]: {
                          ...(prev[member.id] || { iconUrl: "", focusX: 50, focusY: 50 }),
                          iconUrl: e.target.value
                        }
                      }))
                    }
                  />
                </label>
                <label>
                  表示位置 X: {iconDrafts[member.id]?.focusX ?? 50}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={iconDrafts[member.id]?.focusX ?? 50}
                    onChange={(e) =>
                      setIconDrafts((prev) => ({
                        ...prev,
                        [member.id]: {
                          ...(prev[member.id] || { iconUrl: "", focusX: 50, focusY: 50 }),
                          focusX: Number(e.target.value)
                        }
                      }))
                    }
                  />
                </label>
                <label>
                  表示位置 Y: {iconDrafts[member.id]?.focusY ?? 50}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={iconDrafts[member.id]?.focusY ?? 50}
                    onChange={(e) =>
                      setIconDrafts((prev) => ({
                        ...prev,
                        [member.id]: {
                          ...(prev[member.id] || { iconUrl: "", focusX: 50, focusY: 50 }),
                          focusY: Number(e.target.value)
                        }
                      }))
                    }
                  />
                </label>
              </div>
            </div>
              <div className="split admin-actions">
              <button className="btn" type="button" onClick={() => saveIcon(member.id)}>
                アイコン保存
              </button>
              <button
                className="btn"
                type="button"
                onClick={() =>
                  setIconDrafts((prev) => ({
                    ...prev,
                    [member.id]: { iconUrl: "", focusX: 50, focusY: 50 }
                  }))
                }
              >
                クリア
              </button>
            </div>
          </div>

          <div className="stack">
            <strong>作品リンク</strong>
            {!linksByMember[member.id]?.length ? <p className="meta">リンクなし</p> : null}
            {(linksByMember[member.id] || []).map((link) => (
              <div key={link.id} className="split">
                <span className="meta">[{link.platform}] {link.url}</span>
                <button className="btn danger" type="button" onClick={() => removeLink(link.id)}>
                  削除
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

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
