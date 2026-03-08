import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/** Request-scoped server client (uses anon key, respects RLS) */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookie setting not available
          }
        },
      },
    }
  )
}

/** Prefixed table name helper */
export function tableName(name: string) {
  return `lm_${name}`
}
