import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function getSiteUrl() {
  const configuredUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  const runtimeOrigin = window.location.origin;
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(runtimeOrigin);
  const siteUrl = isLocalOrigin ? configuredUrl || runtimeOrigin : runtimeOrigin;

  return siteUrl.replace(/\/+$/, "");
}

export function getSignUrl(slug: string) {
  return `${getSiteUrl()}/${slug}`;
}
