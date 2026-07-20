import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Client Supabase (opsional). Bila env belum diisi, bernilai null dan
 * aplikasi otomatis memakai data dummy.
 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null

export const DATA_SOURCE =
  (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'real'
