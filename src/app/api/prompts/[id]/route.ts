import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/prompts/:id */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("lm_prompt_versions")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  return NextResponse.json(data)
}

/** PATCH /api/prompts/:id */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const body = await req.json()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("lm_prompt_versions")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

/** DELETE /api/prompts/:id */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = createAdminClient()

  // アクティブ版は削除不可
  const { data: version } = await supabase
    .from("lm_prompt_versions")
    .select("is_active")
    .eq("id", id)
    .single()

  if (version?.is_active) {
    return NextResponse.json(
      { error: "アクティブなバージョンは削除できません" },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from("lm_prompt_versions")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
