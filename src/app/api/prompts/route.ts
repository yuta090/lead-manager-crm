import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** GET /api/prompts?genre_id=xxx — プロンプトバージョン一覧 */
export async function GET(req: NextRequest) {
  const genreId = req.nextUrl.searchParams.get("genre_id")
  if (!genreId) {
    return NextResponse.json({ error: "genre_id is required" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("lm_prompt_versions")
    .select("*")
    .eq("genre_id", genreId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

/** POST /api/prompts — 新規作成 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    genre_id,
    name,
    description,
    system_prompt,
    user_prompt_template,
    model_default = "gpt-4o-mini",
    provider_default = "openai",
    temperature = 0.7,
    max_tokens = 500,
  } = body

  if (!genre_id || !name || !system_prompt || !user_prompt_template) {
    return NextResponse.json(
      { error: "genre_id, name, system_prompt, user_prompt_template are required" },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("lm_prompt_versions")
    .insert({
      genre_id,
      name,
      description: description ?? null,
      system_prompt,
      user_prompt_template,
      model_default,
      provider_default,
      temperature,
      max_tokens,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
