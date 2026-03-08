export type Genre = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type Company = {
  id: string
  genre_id: string
  name: string
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
  contact_form_url: string | null
  source: string
  source_file: string | null
  status: CompanyStatus
  memo: string | null
  prefecture: string | null
  screening_result: string | null
  screening_score: number | null
  screening_reason: string | null
  priority: "高" | "通常" | "低"
  last_contacted_at: string | null
  next_followup_at: string | null
  scraping_status: string
  emails_found: string[] | null
  form_found: boolean
  created_at: string
  updated_at: string
}

export type CompanyStatus =
  | "新規"
  | "送信済"
  | "反応あり"
  | "商談中"
  | "成約"
  | "失注"
  | "配信停止"

export type Campaign = {
  id: string
  genre_id: string
  name: string
  subject_template: string
  body_template: string
  body_text: string | null
  status: "下書き" | "送信中" | "送信済"
  target_filter: Record<string, unknown> | null
  sent_count: number
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export type EmailLog = {
  id: string
  campaign_id: string | null
  company_id: string
  to_email: string
  subject: string
  resend_message_id: string | null
  status: string
  error_message: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
}

export type Activity = {
  id: string
  company_id: string
  type: string
  description: string | null
  created_by: string | null
  created_at: string
}

export type Tag = {
  id: string
  genre_id: string
  name: string
  color: string
}

export type CompanyTag = {
  company_id: string
  tag_id: string
}

export type Contact = {
  id: string
  company_id: string
  name: string | null
  department: string | null
  position: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
  created_at: string
}

export type SendingList = {
  id: string
  genre_id: string
  name: string
  description: string | null
  filters: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ImportLog = {
  id: string
  genre_id: string
  filename: string
  total_rows: number | null
  imported_rows: number | null
  skipped_rows: number | null
  duplicate_rows: number | null
  error_summary: Record<string, unknown> | null
  imported_by: string | null
  imported_at: string
}

export const TABLE_PREFIX = "lm_" as const

export const STATUS_ORDER: CompanyStatus[] = [
  "新規",
  "送信済",
  "反応あり",
  "商談中",
  "成約",
  "失注",
  "配信停止",
]

export const STATUS_CONFIG: Record<
  CompanyStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  新規: { label: "新規", color: "#2563EB", bg: "#EFF6FF", dot: "#3B82F6" },
  送信済: { label: "送信済", color: "#7C3AED", bg: "#F5F3FF", dot: "#8B5CF6" },
  反応あり: { label: "反応あり", color: "#B45309", bg: "#FFFBEB", dot: "#EAB308" },
  商談中: { label: "商談中", color: "#C2410C", bg: "#FFF7ED", dot: "#F97316" },
  成約: { label: "成約", color: "#047857", bg: "#ECFDF5", dot: "#10B981" },
  失注: { label: "失注", color: "#DC2626", bg: "#FEF2F2", dot: "#EF4444" },
  配信停止: { label: "配信停止", color: "#6B7280", bg: "#F3F4F6", dot: "#9CA3AF" },
}
