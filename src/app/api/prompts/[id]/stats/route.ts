import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/prompts/:id/stats — パフォーマンス統計 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = createAdminClient()

  // 生成ログ集計
  const { data: logs } = await supabase
    .from("lm_generation_logs")
    .select("id, variant, latency_ms, quality_score, source")
    .eq("prompt_version_id", id)

  const total = logs?.length ?? 0
  const personalized = logs?.filter((l) => l.variant === "personalized").length ?? 0
  const fromScraper = logs?.filter((l) => l.source === "scraper").length ?? 0
  const fromUI = logs?.filter((l) => l.source === "test_ui").length ?? 0
  const avgLatency =
    total > 0
      ? Math.round(
          (logs?.reduce((sum, l) => sum + (l.latency_ms ?? 0), 0) ?? 0) / total,
        )
      : 0

  // 送信結果集計
  const { data: submissions } = await supabase
    .from("submission_attempts")
    .select("id, status")
    .eq("prompt_version_id", id)

  const totalSubmissions = submissions?.length ?? 0
  const successful = submissions?.filter((s) => s.status === "送信完了").length ?? 0

  return NextResponse.json({
    total_generations: total,
    personalized_count: personalized,
    personalized_rate: total > 0 ? Math.round((personalized / total) * 100) : 0,
    from_scraper: fromScraper,
    from_ui: fromUI,
    avg_latency_ms: avgLatency,
    total_submissions: totalSubmissions,
    successful_submissions: successful,
  })
}
