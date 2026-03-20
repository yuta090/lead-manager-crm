import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** GET /api/prompts/active?genre_id=xxx — スクレイパー用: アクティブプロンプト取得 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key")
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const genreId = req.nextUrl.searchParams.get("genre_id")
  if (!genreId) {
    return NextResponse.json({ error: "genre_id is required" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("lm_prompt_versions")
    .select("*")
    .eq("genre_id", genreId)
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return NextResponse.json(null)
  }
  return NextResponse.json(data)
}
