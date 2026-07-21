import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
let cleanUrl = rawUrl.trim()

if (cleanUrl.endsWith('/')) {
  cleanUrl = cleanUrl.slice(0, -1)
}
if (cleanUrl.endsWith('/rest/v1')) {
  cleanUrl = cleanUrl.substring(0, cleanUrl.length - 8)
}
if (cleanUrl.endsWith('/')) {
  cleanUrl = cleanUrl.slice(0, -1)
}

const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(cleanUrl, supabaseKey)
