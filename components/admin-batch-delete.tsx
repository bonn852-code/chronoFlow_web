"use client";

import { useRouter } from "next/navigation";

export function AdminBatchDeleteButton({ batchId }: { batchId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm("この回次結果を削除しますか？（申請データも削除されます）")) return;
    const res = await fetch(`/api/admin/auditions/batches/${batchId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "回次削除に失敗しました");
      return;
    }
    router.refresh();
  }

  return (
    <button type="button" className="btn danger" onClick={handleDelete}>
      削除
    </button>
  );
}
