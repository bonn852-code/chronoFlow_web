import { NextRequest } from "next/server";
import { getMembers } from "@/lib/queries";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("query") || "";
    const members = await getMembers(query, 200);
    return jsonOk({ members });
  } catch {
    return jsonError("メンバー取得に失敗しました", 500);
  }
}
