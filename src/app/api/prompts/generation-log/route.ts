import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** POST /api/prompts/generation-log — スクレイパーからの生成ログ記録 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key")
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("lm_generation_logs")
    .insert({
      prompt_version_id: body.prompt_version_id,
      company_id: body.company_id ?? null,
      provider: body.provider,
      model: body.model,
      company_intel: body.company_intel ?? null,
      sender_profile: body.sender_profile ?? null,
      generated_subject: body.generated_subject ?? null,
      generated_body: body.generated_body ?? null,
      variant: body.variant ?? "static",
      fallback_reason: body.fallback_reason ?? null,
      quality_score: body.quality_score ?? null,
      latency_ms: body.latency_ms ?? null,
      source: body.source ?? "scraper",
      test_session_id: body.test_session_id ?? null,
    })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ id: data.id }, { status: 201 })
}
