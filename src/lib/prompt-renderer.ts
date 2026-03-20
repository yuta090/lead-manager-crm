/**
 * プロンプトテンプレートの変数展開。
 *
 * テンプレート内の {{variable}} をインテルデータ・送信者プロファイルで置換する。
 *
 * 利用可能変数:
 *   {{company_name}}   — 企業名
 *   {{business_types}}  — 事業分野（カンマ区切り）
 *   {{target_areas}}    — 対象エリア（カンマ区切り）
 *   {{ceo_name}}        — 代表者名
 *   {{established}}     — 設立年
 *   {{philosophy}}      — 企業理念（先頭100文字）
 *   {{notable_info}}    — 注目情報（カンマ区切り）
 *   {{pain_point}}      — 業態別ペインポイント（自動推定）
 *   {{sender_company}}  — 送信者の会社名
 *   {{sender_name}}     — 送信者の姓名
 */

export type CompanyIntel = {
  company_name?: string
  business_types?: string[]
  target_areas?: string[]
  ceo_name?: string
  established?: string
  philosophy?: string
  notable_info?: string[]
  quality_score?: number
}

export type SenderDefaults = {
  会社名?: string
  姓?: string
  名?: string
  [key: string]: string | undefined
}

const PAIN_POINTS: Record<string, string> = {
  賃貸仲介: "物件問い合わせ対応や内見調整の効率化",
  売買仲介: "反響獲得やお客様への追客の仕組み化",
  管理: "入居者対応や修繕手配などの管理業務効率化",
  投資用: "投資家様への物件提案や顧客管理の最適化",
  開発分譲: "販売進捗管理や集客施策の効率化",
  総合: "不動産業務全般のデジタル化・効率化",
}

function inferPainPoint(businessTypes: string[]): string {
  for (const bt of businessTypes) {
    if (bt in PAIN_POINTS) return PAIN_POINTS[bt]
  }
  return PAIN_POINTS["総合"]
}

export function renderPrompt(
  template: string,
  intel: CompanyIntel,
  sender: SenderDefaults,
): string {
  const vars: Record<string, string> = {
    company_name: intel.company_name ?? "",
    business_types: (intel.business_types ?? []).join("、"),
    target_areas: (intel.target_areas ?? []).slice(0, 3).join("、"),
    ceo_name: intel.ceo_name ?? "",
    established: intel.established ?? "",
    philosophy: (intel.philosophy ?? "").slice(0, 100),
    notable_info: (intel.notable_info ?? []).join("、"),
    pain_point: inferPainPoint(intel.business_types ?? []),
    sender_company: sender.会社名 ?? "",
    sender_name: `${sender.姓 ?? ""} ${sender.名 ?? ""}`.trim(),
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "")
}

/** テンプレート内の全プレースホルダー名を抽出する */
export function extractPlaceholders(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g)
  return [...new Set([...matches].map((m) => m[1]))]
}

/** テンプレートプレビュー用のダミーデータ */
export const PREVIEW_INTEL: CompanyIntel = {
  company_name: "サンプル不動産株式会社",
  business_types: ["賃貸仲介", "売買仲介"],
  target_areas: ["東京都渋谷区", "東京都目黒区"],
  ceo_name: "山田太郎",
  established: "平成10年",
  philosophy: "お客様の暮らしに寄り添い、最適な住まいをご提案いたします",
  notable_info: ["採用活動中"],
  quality_score: 65,
}

export const PREVIEW_SENDER: SenderDefaults = {
  会社名: "株式会社スカラ",
  姓: "田中",
  名: "太郎",
}
