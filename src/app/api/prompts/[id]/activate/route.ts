import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

/** POST /api/prompts/:id/activate — このバージョンをアクティブに設定 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = createAdminClient()

  // 対象バージョンの genre_id を取得
  const { data: version, error: fetchErr } = await supabase
    .from("lm_prompt_versions")
    .select("genre_id")
    .eq("id", id)
    .single()

  if (fetchErr || !version) {
    return NextResponse.json({ error: "バージョンが見つかりません" }, { status: 404 })
  }

  // 同じ genre の他バージョンを全て非アクティブに
  await supabase
    .from("lm_prompt_versions")
    .update({ is_active: false })
    .eq("genre_id", version.genre_id)

  // 対象をアクティブに
  const { data, error } = await supabase
    .from("lm_prompt_versions")
    .update({ is_active: true })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
