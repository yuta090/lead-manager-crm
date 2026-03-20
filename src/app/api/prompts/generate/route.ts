import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { callLLM } from "@/lib/llm"
import { renderPrompt } from "@/lib/prompt-renderer"
import type { CompanyIntel, SenderDefaults } from "@/lib/prompt-renderer"
import type { LLMProvider } from "@/types/database"
import { randomUUID } from "crypto"

type GenerateRequest = {
  prompt_version_id: string
  company_ids: string[]
  models: { provider: LLMProvider; model: string }[]
  sender_profile?: SenderDefaults
}

type GenerationResult = {
  company_id: string
  company_name: string
  provider: string
  model: string
  subject: string | null
  body: string | null
  variant: "personalized" | "static"
  fallback_reason: string | null
  quality_score: number | null
  latency_ms: number
  error: string | null
}

/** POST /api/prompts/generate — UIからのテスト生成 */
export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json()
  const { prompt_version_id, company_ids, models, sender_profile } = body

  if (!prompt_version_id || !company_ids?.length || !models?.length) {
    return NextResponse.json(
      { error: "prompt_version_id, company_ids, models are required" },
      { status: 400 },
    )
  }

  if (company_ids.length > 10) {
    return NextResponse.json({ error: "最大10社まで" }, { status: 400 })
  }
  if (models.length > 3) {
    return NextResponse.json({ error: "最大3モデルまで" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // プロンプトバージョン取得
  const { data: pv, error: pvErr } = await supabase
    .from("lm_prompt_versions")
    .select("*")
    .eq("id", prompt_version_id)
    .single()

  if (pvErr || !pv) {
    return NextResponse.json({ error: "プロンプトが見つかりません" }, { status: 404 })
  }

  // 企業のintelデータ取得
  const { data: companies } = await supabase
    .from("lm_companies")
    .select("id, name, scrape_target_id")
    .in("id", company_ids)

  if (!companies?.length) {
    return NextResponse.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  // scrape_targets から company_intel 取得
  const stIds = companies
    .map((c) => c.scrape_target_id)
    .filter(Boolean) as string[]

  const { data: targets } = stIds.length
    ? await supabase
        .from("scrape_targets")
        .select("id, company_intel, intel_quality_score")
        .in("id", stIds)
    : { data: [] }

  const intelMap = new Map(
    (targets ?? []).map((t) => [t.id, t]),
  )

  // デフォルト送信者プロファイル
  const sender: SenderDefaults = sender_profile ?? {
    会社名: "株式会社スカラ",
    姓: "田中",
    名: "太郎",
  }

  const testSessionId = randomUUID()
  const results: GenerationResult[] = []

  // 各企業 × 各モデルで生成
  for (const company of companies) {
    const target = company.scrape_target_id
      ? intelMap.get(company.scrape_target_id)
      : null
    const intel: CompanyIntel = (target?.company_intel as CompanyIntel) ?? {}
    intel.company_name = intel.company_name || company.name
    const qualityScore = target?.intel_quality_score ?? (intel as { quality_score?: number }).quality_score ?? 0

    for (const m of models) {
      try {
        // テンプレート展開
        const userPrompt = renderPrompt(pv.user_prompt_template, intel, sender)

        // LLM呼び出し
        const { text, latencyMs } = await callLLM({
          provider: m.provider,
          model: m.model,
          systemPrompt: pv.system_prompt,
          userPrompt,
          temperature: pv.temperature,
          maxTokens: pv.max_tokens,
        })

        // JSON抽出
        let subject: string | null = null
        let bodyText: string | null = null
        let variant: "personalized" | "static" = "static"
        let fallbackReason: string | null = null

        try {
          const jsonMatch = text.match(/\{[^{}]*"件名"[^{}]*\}/s)
          const parsed = JSON.parse(jsonMatch?.[0] ?? text)
          subject = parsed["件名"] ?? null
          bodyText = parsed["パーソナライズ本文"] ?? null
          variant = subject && bodyText ? "personalized" : "static"
          if (!subject && !bodyText) fallbackReason = "JSON解析失敗"
        } catch {
          fallbackReason = "JSON解析エラー"
        }

        // ログ保存
        await supabase.from("lm_generation_logs").insert({
          prompt_version_id,
          company_id: company.id,
          provider: m.provider,
          model: m.model,
          company_intel: intel,
          sender_profile: sender,
          generated_subject: subject,
          generated_body: bodyText,
          variant,
          fallback_reason: fallbackReason,
          quality_score: qualityScore,
          latency_ms: latencyMs,
          source: "test_ui",
          test_session_id: testSessionId,
        })

        results.push({
          company_id: company.id,
          company_name: company.name,
          provider: m.provider,
          model: m.model,
          subject,
          body: bodyText,
          variant,
          fallback_reason: fallbackReason,
          quality_score: qualityScore,
          latency_ms: latencyMs,
          error: null,
        })
      } catch (err) {
        results.push({
          company_id: company.id,
          company_name: company.name,
          provider: m.provider,
          model: m.model,
          subject: null,
          body: null,
          variant: "static",
          fallback_reason: null,
          quality_score: qualityScore,
          latency_ms: 0,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return NextResponse.json({
    test_session_id: testSessionId,
    results,
  })
}
