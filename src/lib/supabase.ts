import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gnsyjsusvsyajpoiyvgd.supabase.co'
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

const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Vite exposes client-side environment variables only when they use the VITE_ prefix.
// Use a harmless fallback during local development so the login shell still renders;
// Supabase calls will work once a VITE_ anon/publishable key is set.
export const supabaseConfigured = Boolean(cleanUrl && supabaseKey)
export const supabase = createClient(
  cleanUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key'
)
