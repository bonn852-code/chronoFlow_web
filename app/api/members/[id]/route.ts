import { getMemberById } from "@/lib/queries";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getMemberById(id);
    if (!data) return jsonError("メンバーが見つかりません", 404);
    return jsonOk(data);
  } catch {
    return jsonError("メンバー詳細取得に失敗しました", 500);
  }
}
