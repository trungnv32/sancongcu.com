import { createClient } from "@supabase/supabase-js";

// Both values are publishable browser configuration, not administrative secrets.
// Environment variables can override these values for a future development project.
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://hxcucycjemuudlvaxhdk.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_5i2cKVLcW3jcq8JKJclBqw_1VMgRfO4";

/**
 * Public data client. Row Level Security in Supabase is the access boundary;
 * never place a service-role key in browser code.
 */
export const supabase =
  supabaseUrl && supabasePublishableKey ? createClient(supabaseUrl, supabasePublishableKey) : null;

export const isSupabaseConfigured = Boolean(supabase);
